"""Acceso a datos del schema core. Solo SQL, sin reglas de negocio."""

from typing import Any

import psycopg

PERSON_COLUMNS = """
  id, email, given_names, family_names, full_name, country_code, city_id, city_other,
  (select coalesce(c.name_es, c.name) from core.city c where c.id = person.city_id) as city_name,
  (select coalesce(c.admin1_es, c.admin1) from core.city c where c.id = person.city_id)
    as city_admin1,
  university_id, university_other,
  (select u.name from core.university u where u.id = person.university_id) as university_name,
  major, graduation_year, linkedin_url
"""

# Busca en el nombre original (core.city.name) y en todos los nombres en español
# (core.city_alias, que incluye name_es). Cada ciudad se queda con su mejor coincidencia.
# Orden: coincidencia exacta, prefijo, similitud (pg_trgm) y población.
# core.search_key = lower(unaccent(x)), así "chillan" encuentra "Chillán".
# Se muestra el nombre en español si existe; si no, el original.
SEARCH_CITIES = """
with q as (
  select core.search_key(%(q)s) as k, core.search_key(%(q_like)s) || '%%' as prefix
),
names as (
  select c.id, core.search_key(c.name) as key
  from core.city c, q
  where c.country_code = %(country)s
    and (core.search_key(c.name) like q.prefix
         or core.search_key(c.name) operator(extensions.%%) q.k)
  union all
  select a.city_id, core.search_key(a.name)
  from core.city_alias a
  join core.city c on c.id = a.city_id, q
  where c.country_code = %(country)s
    and (core.search_key(a.name) like q.prefix
         or core.search_key(a.name) operator(extensions.%%) q.k)
),
best as (
  select n.id,
         bool_or(n.key = q.k) as exact,
         bool_or(n.key like q.prefix) as prefix,
         max(extensions.similarity(n.key, q.k)) as similarity
  from names n, q
  group by n.id
),
stats as (
  select bool_or(exact or prefix) as has_strong,
         coalesce(max(similarity) filter (where not exact and not prefix), 0) as top_fuzzy
  from best
)
select c.id,
       coalesce(c.name_es, c.name) as name,
       coalesce(c.admin1_es, c.admin1) as admin1,
       c.country_code
from best b
join core.city c on c.id = b.id, stats s
-- Exactas y de prefijo siempre. Por similitud solo las fuertes, salvo que no haya nada
-- mejor (la persona escribió con errores): ahí también las cercanas al mejor puntaje.
where b.exact or b.prefix
   or b.similarity >= %(min_similarity)s
   or (not s.has_strong and b.similarity >= s.top_fuzzy - %(fuzzy_margin)s)
order by b.exact desc, b.prefix desc, b.similarity desc, c.population desc, c.id
limit %(limit)s
"""
MIN_SIMILARITY = 0.5
FUZZY_MARGIN = 0.1


def escape_like(value: str) -> str:
    """Escapa los comodines de LIKE para que '%' o '_' del usuario sean literales."""
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


class CoreRepository:
    def __init__(self, conn: psycopg.Connection) -> None:
        self.conn = conn

    def get_person_by_auth_user(self, auth_user_id: str) -> dict[str, Any] | None:
        return self.conn.execute(
            f"select {PERSON_COLUMNS} from core.person where auth_user_id = %s",
            (auth_user_id,),
        ).fetchone()

    def get_roles(self, person_id: str) -> dict[str, list[str]]:
        rows = self.conn.execute(
            "select app::text as app, role from core.person_app_role "
            "where person_id = %s order by app, role",
            (person_id,),
        ).fetchall()
        roles: dict[str, list[str]] = {}
        for row in rows:
            roles.setdefault(row["app"], []).append(row["role"])
        return roles

    def update_person_basics(self, person_id: str, fields: dict[str, Any]) -> dict[str, Any]:
        allowed = {
            "given_names", "family_names", "country_code", "city_id", "city_other", "university_id",
            "university_other",
            "major", "graduation_year", "linkedin_url",
        }
        data = {k: v for k, v in fields.items() if k in allowed}
        assignments = ", ".join(f"{k} = %({k})s" for k in data)
        return self.conn.execute(
            f"update core.person set {assignments} where id = %(person_id)s "
            f"returning {PERSON_COLUMNS}",
            {**data, "person_id": person_id},
        ).fetchone()

    def add_role(self, person_id: str, app: str, role: str) -> None:
        self.conn.execute(
            "insert into core.person_app_role (person_id, app, role) "
            "values (%s, %s::core.app, %s) on conflict do nothing",
            (person_id, app, role),
        )

    def university_exists(self, university_id: str) -> bool:
        row = self.conn.execute(
            "select 1 from core.university where id = %s", (university_id,)
        ).fetchone()
        return row is not None

    def search_universities(self, query: str, limit: int = 20) -> list[dict[str, Any]]:
        return self.conn.execute(
            "select id, name, country_code from core.university "
            "where name ilike %s order by name limit %s",
            (f"%{query}%", limit),
        ).fetchall()

    # ------------------------------------------------------------- catálogo
    def list_countries(self) -> list[dict[str, Any]]:
        return self.conn.execute(
            "select code, name_es, name_en from core.country order by name_es"
        ).fetchall()

    def country_exists(self, code: str) -> bool:
        row = self.conn.execute("select 1 from core.country where code = %s", (code,)).fetchone()
        return row is not None

    def city_in_country(self, city_id: int, country_code: str) -> bool:
        row = self.conn.execute(
            "select 1 from core.city where id = %s and country_code = %s", (city_id, country_code)
        ).fetchone()
        return row is not None

    def search_cities(self, country_code: str, query: str, limit: int) -> list[dict[str, Any]]:
        return self.conn.execute(
            SEARCH_CITIES,
            {
                "q": query,
                "q_like": escape_like(query),
                "country": country_code,
                "limit": limit,
                "min_similarity": MIN_SIMILARITY,
                "fuzzy_margin": FUZZY_MARGIN,
            },
        ).fetchall()
