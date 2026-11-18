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

Nombres en español (alternatenames/<CC>.zip de cada país, sin coloquiales ni históricos):
- name_es:   el nombre "es" marcado como preferido. Si no hay, NULL (se muestra name).
- admin1_es: el nombre de la región para mostrar, en este orden:
             1. el nombre "es" corto ("Los Lagos"); si no hay, el "es" preferido;
             2. si no hay en español, el original sin sufijos administrativos en inglés
                ("Lima Province" -> "Lima");
             3. al final se aplica scripts/data/admin1_overrides.csv, que gana siempre.
             Queda NULL si el resultado es igual al original (se muestra admin1).
- core.city_alias: todos los nombres "es" de la ciudad, solo para buscar.
- Brasil (BR) mantiene los nombres originales en portugués: no se usa name_es ni la región
  en español. Sus alias en español sí se cargan para buscar.

Datos: GeoNames (https://www.geonames.org), licencia CC BY 4.0.
"""

from __future__ import annotations

import argparse
import csv
import io
import re
import sys
import zipfile
from collections import Counter
from collections.abc import Iterable, Iterator
from dataclasses import dataclass, replace
from pathlib import Path

import httpx
import psycopg

from app.core.config import get_settings

BASE_URL = "https://download.geonames.org/export/dump"
DATASETS = ("cities15000", "cities5000", "cities1000")
CACHE_DIR = Path(__file__).resolve().parent.parent / ".geonames"
OVERRIDES_FILE = Path(__file__).resolve().parent / "data" / "admin1_overrides.csv"
# Países que se muestran con sus nombres originales, sin traducir al español.
KEEP_ORIGINAL_NAMES = {"BR"}

# Prefijos y sufijos administrativos en inglés que GeoNames agrega a algunas regiones.
_REGION_PREFIX = re.compile(r"^\s*(region|province|department)\s+of\s+", re.IGNORECASE)
_REGION_SUFFIX = re.compile(r"\s+(province|department|region)\s*$", re.IGNORECASE)


@dataclass(frozen=True)
class Admin1:
    name: str
    geoname_id: int | None


@dataclass(frozen=True)
class City:
    id: int
    country_code: str
    name: str
    ascii_name: str
    admin1: str | None
    population: int
    admin1_code: str | None = None  # código de la región dentro del país ("14")
    admin1_id: int | None = None  # geonameid de la región, para buscar su nombre en español
    name_es: str | None = None
    admin1_es: str | None = None
    aliases: tuple[str, ...] = ()


@dataclass(frozen=True)
class AltName:
    id: int
    name: str
    preferred: bool
    short: bool


# ----------------------------------------------------------------- parsing
def parse_admin1(lines: Iterable[str]) -> dict[str, Admin1]:
    """admin1CodesASCII.txt: 'CL.14<TAB>Los Lagos Region<TAB>Los Lagos Region<TAB>3881974'."""
    regions: dict[str, Admin1] = {}
    for line in lines:
        parts = line.rstrip("\n").split("\t")
        if len(parts) >= 2 and parts[0]:
            geoname_id = int(parts[3]) if len(parts) >= 4 and parts[3].isdigit() else None
            regions[parts[0]] = Admin1(parts[1], geoname_id)
    return regions


def parse_cities(
    lines: Iterable[str], countries: set[str], admin1: dict[str, Admin1]
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
        region = admin1.get(f"{country}.{admin1_code}") if admin1_code else None
        yield City(
            id=int(parts[0]),
            country_code=country,
            name=name,
            ascii_name=parts[2].strip() or name,
            admin1=region.name if region else None,
            population=int(parts[14] or 0),
            admin1_code=admin1_code or None,
            admin1_id=region.geoname_id if region else None,
        )


def parse_spanish_names(lines: Iterable[str], wanted: set[int]) -> dict[int, list[AltName]]:
    """Nombres "es" de alternatenames/<CC>.txt para los geonameid pedidos.

    Columnas: 0 alternateNameId, 1 geonameid, 2 isolanguage, 3 alternateName,
    4 isPreferredName, 5 isShortName, 6 isColloquial, 7 isHistoric.
    Se descartan los coloquiales ("El DF") y los históricos.
    """
    names: dict[int, list[AltName]] = {}
    for line in lines:
        parts = line.rstrip("\n").split("\t")
        if len(parts) < 8 or parts[2] != "es":
            continue
        geoname_id = int(parts[1])
        if geoname_id not in wanted or parts[6] == "1" or parts[7] == "1":
            continue
        name = parts[3].strip()
        if name:
            names.setdefault(geoname_id, []).append(
                AltName(int(parts[0]), name, parts[4] == "1", parts[5] == "1")
            )
    return names


def pick_city_name_es(alts: list[AltName]) -> str | None:
    """Solo el preferido. Si hay varios: el que no es corto y, luego, el más antiguo."""
    preferred = sorted((a for a in alts if a.preferred), key=lambda a: (a.short, a.id))
    return preferred[0].name if preferred else None


def pick_admin1_es(alts: list[AltName]) -> str | None:
    """El corto ("Los Lagos"); si no hay, el preferido ("Región de Los Lagos")."""
    short = sorted((a for a in alts if a.short), key=lambda a: (not a.preferred, a.id))
    if short:
        return short[0].name
    preferred = sorted((a for a in alts if a.preferred), key=lambda a: a.id)
    return preferred[0].name if preferred else None


def city_aliases(alts: list[AltName]) -> tuple[str, ...]:
    """Todos los nombres "es" de la ciudad, sin repetir. Solo se usan para buscar."""
    return tuple(sorted({a.name for a in alts}))


def clean_region(name: str) -> str:
    """Quita prefijos y sufijos administrativos en inglés.

    "Lima Province" -> "Lima", "Region of Magallanes" -> "Magallanes",
    "Los Lagos Region" -> "Los Lagos". Si quedaría vacío, devuelve el original.
    """
    cleaned = _REGION_SUFFIX.sub("", _REGION_PREFIX.sub("", name)).strip()
    return cleaned or name.strip()


def parse_overrides(lines: Iterable[str]) -> dict[tuple[str, str], str]:
    """admin1_overrides.csv: country_code,admin1_code,name -> {('PE', '08'): 'Cusco'}."""
    rows = csv.DictReader(lines)
    return {
        (r["country_code"].strip().upper(), r["admin1_code"].strip()): r["name"].strip()
        for r in rows
        if r.get("name", "").strip()
    }


def region_display(
    c: City, region_alts: list[AltName], overrides: dict[tuple[str, str], str]
) -> str | None:
    """Nombre de la región para mostrar, o None si es igual al original."""
    if c.admin1 is None:
        return None
    spanish = None if c.country_code in KEEP_ORIGINAL_NAMES else pick_admin1_es(region_alts)
    name = spanish or clean_region(c.admin1)
    name = overrides.get((c.country_code, c.admin1_code or ""), name)
    return None if name == c.admin1 else name


def add_spanish_names(
    cities: list[City],
    names: dict[int, list[AltName]],
    overrides: dict[tuple[str, str], str] | None = None,
) -> list[City]:
    overrides = overrides or {}
    out = []
    for c in cities:
        alts = names.get(c.id, [])
        region_alts = names.get(c.admin1_id, []) if c.admin1_id else []
        keep = c.country_code in KEEP_ORIGINAL_NAMES
        out.append(
            replace(
                c,
                name_es=None if keep else pick_city_name_es(alts),
                admin1_es=region_display(c, region_alts, overrides),
                aliases=city_aliases(alts),
            )
        )
    return out


# --------------------------------------------------------------- download
def fetch(name: str, refresh: bool = False) -> Path:
    """Descarga un archivo de GeoNames a CACHE_DIR, o reutiliza el que ya está."""
    target = CACHE_DIR / name
    target.parent.mkdir(parents=True, exist_ok=True)
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


def read_zip_lines(path: Path, member: str) -> Iterator[str]:
    with zipfile.ZipFile(path) as zf, zf.open(member) as fh:
        yield from io.TextIOWrapper(fh, encoding="utf-8")


def spanish_names_for(
    countries: set[str], wanted: set[int], refresh: bool
) -> dict[int, list[AltName]]:
    names: dict[int, list[AltName]] = {}
    for code in sorted(countries):
        path = fetch(f"alternatenames/{code}.zip", refresh)
        names.update(parse_spanish_names(read_zip_lines(path, f"{code}.txt"), wanted))
    return names


# ------------------------------------------------------------------ load
COLUMNS = "id, country_code, name, ascii_name, admin1, population, name_es, admin1_es"

UPSERT = f"""
insert into core.city ({COLUMNS})
select {COLUMNS} from city_load
on conflict (id) do update set
  country_code = excluded.country_code,
  name         = excluded.name,
  ascii_name   = excluded.ascii_name,
  admin1       = excluded.admin1,
  population   = excluded.population,
  name_es      = excluded.name_es,
  admin1_es    = excluded.admin1_es
"""

# Los alias de cada ciudad cargada se reemplazan completos, así también se borran los que
# GeoNames quitó. Las ciudades que no se cargaron en esta corrida no se tocan.
DELETE_ALIASES = "delete from core.city_alias where city_id in (select id from city_load)"
INSERT_ALIASES = """
insert into core.city_alias (city_id, name)
select city_id, name from alias_load
on conflict do nothing
"""


def load(conn: psycopg.Connection, cities: list[City]) -> None:
    with conn.transaction():
        conn.execute(
            "create temp table city_load (like core.city including defaults) on commit drop"
        )
        conn.execute("create temp table alias_load (city_id bigint, name text) on commit drop")
        with conn.cursor().copy(f"copy city_load ({COLUMNS}) from stdin") as copy:
            for c in cities:
                copy.write_row(
                    (
                        c.id,
                        c.country_code,
                        c.name,
                        c.ascii_name,
                        c.admin1,
                        c.population,
                        c.name_es,
                        c.admin1_es,
                    )
                )
        with conn.cursor().copy("copy alias_load (city_id, name) from stdin") as copy:
            for c in cities:
                for alias in c.aliases:
                    copy.write_row((c.id, alias))
        conn.execute(UPSERT)
        conn.execute(DELETE_ALIASES)
        conn.execute(INSERT_ALIASES)


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
        lines = read_zip_lines(fetch(f"{args.dataset}.zip", args.refresh), f"{args.dataset}.txt")
        cities = list(parse_cities(lines, countries, admin1))
        wanted = {c.id for c in cities} | {c.admin1_id for c in cities if c.admin1_id}
        overrides = parse_overrides(
            OVERRIDES_FILE.read_text(encoding="utf-8").splitlines()
            if OVERRIDES_FILE.exists()
            else []
        )
        cities = add_spanish_names(
            cities, spanish_names_for(countries, wanted, args.refresh), overrides
        )

        per_country = Counter(c.country_code for c in cities)
        for code in sorted(countries):
            print(f"  {code}  {per_country.get(code, 0):>6}")
        print(f"Total: {len(cities)} ciudades de {args.dataset}")
        print(
            f"Con nombre en español: {sum(1 for c in cities if c.name_es)}. "
            f"Con región en español: {sum(1 for c in cities if c.admin1_es)}. "
            f"Alias: {sum(len(c.aliases) for c in cities)}."
        )

        if args.dry_run:
            print("Dry run: no se escribió nada.")
            return 0
        load(conn, cities)
        total = conn.execute("select count(*) from core.city").fetchone()[0]
        print(f"Listo. core.city tiene {total} filas.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
