"""Búsqueda de ciudades contra la base real (solo lectura).

Usa DATABASE_URL (backend/.env o variable de entorno). Se salta si no hay conexión
o si el catálogo no está cargado (scripts.load_geonames). Para correrlo en local:

    DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres uv run pytest -k integration
"""

import psycopg
import pytest
from psycopg.rows import dict_row

from app.core.config import get_settings
from app.modules.core.repository import CoreRepository


@pytest.fixture(scope="module")
def repo():
    try:
        conn = psycopg.connect(
            get_settings().database_url,
            row_factory=dict_row,
            prepare_threshold=None,
            connect_timeout=3,
        )
    except psycopg.Error as err:
        pytest.skip(f"Sin conexión a la base: {err.__class__.__name__}")
    try:
        ready = (
            conn.execute("select to_regclass('core.city_alias') is not null as ok").fetchone()["ok"]
            and conn.execute("select exists (select 1 from core.city) as ok").fetchone()["ok"]
        )
    except psycopg.Error:
        ready = False
    if not ready:
        conn.close()
        pytest.skip("Catálogo de ciudades no cargado: corre scripts.load_geonames")
    yield CoreRepository(conn)
    conn.close()


def search(repo, country, q):
    return [(c["name"], c["admin1"]) for c in repo.search_cities(country, q, 10)]


@pytest.mark.parametrize(
    ("country", "q", "first"),
    [
        ("CL", "santiago", ("Santiago", "Metropolitana")),
        ("CL", "chillan", ("Chillán", "Ñuble")),  # sin tilde encuentra con tilde
        ("US", "dallas", ("Dallas", "Texas")),  # la más poblada primero
        ("PR", "san juan", ("San Juan", "San Juan")),  # Puerto Rico aparte de US
        ("MX", "ciudad de mexico", ("Ciudad de México", "Ciudad de México")),
        ("MX", "mexico city", ("Ciudad de México", "Ciudad de México")),  # nombre original
        ("CL", "santiago de chile", ("Santiago", "Metropolitana")),  # alias, se muestra name
        ("CL", "puerto montt", ("Puerto Montt", "Los Lagos")),  # región corta en español
        ("PE", "lima", ("Lima", "Lima Metropolitana")),  # override de "Lima Province"
        ("SV", "usulutan", ("Usulután", "Usulután")),  # override: tilde que GeoNames no trae
        ("US", "fargo", ("Fargo", "Dakota del Norte")),  # override de "North Dakota"
        ("CA", "halifax", ("Halifax", "Nueva Escocia")),  # override de "Nova Scotia"
        ("PE", "cuzco", ("Cusco", "Cusco")),  # override de admin1_overrides.csv
        ("BR", "natal", ("Natal", "Rio Grande do Norte")),  # Brasil en portugués
        ("CL", "valparaizo", ("Valparaíso", "Valparaíso")),  # con error de tipeo
    ],
)
def test_integration_first_result(repo, country, q, first):
    results = search(repo, country, q)
    assert results, f"sin resultados para {q!r} en {country}"
    assert results[0] == first


def test_integration_city_without_spanish_name_shows_original(repo):
    row = repo.conn.execute(
        "select coalesce(name_es, name) as shown, name from core.city "
        "where id = 3874960"  # Puerto Montt: sin nombre es preferido
    ).fetchone()
    assert row["shown"] == row["name"] == "Puerto Montt"


@pytest.mark.parametrize(
    ("country", "q", "absent"),
    [
        ("MX", "mexico city", {"Coatzacoalcos", "Nuevo México"}),
        ("MX", "ciudad de mexico", {"Apizaco"}),
        ("CL", "puerto montt", {"Puerto Varas"}),
    ],
)
def test_integration_no_weak_matches(repo, country, q, absent):
    names = {name for name, _ in search(repo, country, q)}
    assert not names & absent


def test_integration_results_stay_in_country(repo):
    rows = repo.search_cities("US", "san juan", 10)
    assert rows and all(r["country_code"] == "US" for r in rows)
