"""Carga las ciudades de GeoNames en core.city.

Uso (desde backend/):
    uv run python -m scripts.load_geonames                    # cities5000 (por defecto)
    uv run python -m scripts.load_geonames --dataset cities1000
    uv run python -m scripts.load_geonames --dry-run          # descarga y cuenta, no escribe

Escribe en la base de DATABASE_URL (backend/.env). Para el Supabase local:
    DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres uv run python -m scripts.load_geonames

- Los países salen de core.country (la base es la fuente única). Solo se cargan sus ciudades.
- Es idempotente: hace upsert por id (el geonameid). Se puede correr las veces que haga falta.
- Los archivos se guardan en backend/.geonames/ (ignorado por git) y se reutilizan.
  Usa --refresh para volver a descargarlos.

Datos: GeoNames (https://www.geonames.org), licencia CC BY 4.0.
"""

from __future__ import annotations

import argparse
import io
import sys
import zipfile
from collections import Counter
from collections.abc import Iterable, Iterator
from dataclasses import dataclass
from pathlib import Path

import httpx
import psycopg

from app.core.config import get_settings

BASE_URL = "https://download.geonames.org/export/dump"
DATASETS = ("cities15000", "cities5000", "cities1000")
CACHE_DIR = Path(__file__).resolve().parent.parent / ".geonames"


@dataclass(frozen=True)
class City:
    id: int
    country_code: str
    name: str
    ascii_name: str
    admin1: str | None
    population: int


# ----------------------------------------------------------------- parsing
def parse_admin1(lines: Iterable[str]) -> dict[str, str]:
    """admin1CodesASCII.txt: 'CL.16<TAB>Biobío<TAB>Biobio<TAB>geonameid' -> {'CL.16': 'Biobío'}."""
    names: dict[str, str] = {}
    for line in lines:
        parts = line.rstrip("\n").split("\t")
        if len(parts) >= 2 and parts[0]:
            names[parts[0]] = parts[1]
    return names


def parse_cities(
    lines: Iterable[str], countries: set[str], admin1: dict[str, str]
) -> Iterator[City]:
    """Filas de citiesNNNN.txt (formato 'geoname' de GeoNames) de los países pedidos.

    Columnas usadas: 0 geonameid, 1 name, 2 asciiname, 8 country code, 10 admin1 code, 14 population.
    Puerto Rico viene con su propio código (PR), así que no se mezcla con US.
    """
    for line in lines:
        parts = line.rstrip("\n").split("\t")
        if len(parts) < 15:
            continue
        country = parts[8]
        if country not in countries:
            continue
        name = parts[1].strip()
        if not name:
            continue
        admin1_code = parts[10].strip()
        yield City(
            id=int(parts[0]),
            country_code=country,
            name=name,
            ascii_name=parts[2].strip() or name,
            admin1=admin1.get(f"{country}.{admin1_code}") if admin1_code else None,
            population=int(parts[14] or 0),
        )


# --------------------------------------------------------------- download
def fetch(name: str, refresh: bool = False) -> Path:
    """Descarga un archivo de GeoNames a CACHE_DIR, o reutiliza el que ya está."""
    CACHE_DIR.mkdir(exist_ok=True)
    target = CACHE_DIR / name
    if target.exists() and not refresh:
        return target
    print(f"Descargando {BASE_URL}/{name} ...", file=sys.stderr)
    with httpx.stream("GET", f"{BASE_URL}/{name}", timeout=120, follow_redirects=True) as r:
        r.raise_for_status()
        tmp = target.with_suffix(target.suffix + ".part")
        with tmp.open("wb") as fh:
            for chunk in r.iter_bytes():
                fh.write(chunk)
    tmp.replace(target)
    return target


def read_cities_zip(path: Path, dataset: str) -> list[str]:
    with zipfile.ZipFile(path) as zf, zf.open(f"{dataset}.txt") as fh:
        return io.TextIOWrapper(fh, encoding="utf-8").readlines()


# ------------------------------------------------------------------ load
UPSERT = """
insert into core.city (id, country_code, name, ascii_name, admin1, population)
select id, country_code, name, ascii_name, admin1, population from city_load
on conflict (id) do update set
  country_code = excluded.country_code,
  name         = excluded.name,
  ascii_name   = excluded.ascii_name,
  admin1       = excluded.admin1,
  population   = excluded.population
"""


def load(conn: psycopg.Connection, cities: list[City]) -> None:
    with conn.transaction():
        conn.execute(
            "create temp table city_load (like core.city including defaults) on commit drop"
        )
        with conn.cursor().copy(
            "copy city_load (id, country_code, name, ascii_name, admin1, population) from stdin"
        ) as copy:
            for c in cities:
                copy.write_row((c.id, c.country_code, c.name, c.ascii_name, c.admin1, c.population))
        conn.execute(UPSERT)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawTextHelpFormatter
    )
    parser.add_argument("--dataset", choices=DATASETS, default="cities5000")
    parser.add_argument("--dry-run", action="store_true", help="no escribe en la base")
    parser.add_argument("--refresh", action="store_true", help="vuelve a descargar los archivos")
    args = parser.parse_args(argv)
    # La consola de Windows no usa UTF-8 por defecto y rompe las tildes.
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    settings = get_settings()
    with psycopg.connect(settings.database_url) as conn:
        countries = {row[0] for row in conn.execute("select code from core.country").fetchall()}
        if not countries:
            print("core.country está vacía: corre las migraciones primero.", file=sys.stderr)
            return 1

        admin1 = parse_admin1(
            fetch("admin1CodesASCII.txt", args.refresh).read_text(encoding="utf-8").splitlines()
        )
        lines = read_cities_zip(fetch(f"{args.dataset}.zip", args.refresh), args.dataset)
        cities = list(parse_cities(lines, countries, admin1))

        per_country = Counter(c.country_code for c in cities)
        for code in sorted(countries):
            print(f"  {code}  {per_country.get(code, 0):>6}")
        print(f"Total: {len(cities)} ciudades de {args.dataset}")

        if args.dry_run:
            print("Dry run: no se escribió nada.")
            return 0
        load(conn, cities)
        total = conn.execute("select count(*) from core.city").fetchone()[0]
        print(f"Listo. core.city tiene {total} filas.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
