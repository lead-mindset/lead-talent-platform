-- =====================================================================
-- Catálogo de países y ciudades
--
-- core.country = países donde opera LEAD. Es la fuente única de países:
--                el frontend la lee por GET /api/v1/countries.
-- core.city    = ciudades de GeoNames (geonameid como id). Se carga con
--                backend/scripts/load_geonames.py, no con esta migración.
--
-- core.person pasa de ciudad en texto libre a:
--   city_id    -> core.city, siempre del mismo país que country_code
--   city_other -> texto, cuando la persona no encuentra su ciudad
-- La columna city se borra: no hay datos reales que migrar.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Extensiones (Supabase las instala en el schema extensions)
-- ---------------------------------------------------------------------
create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

-- unaccent() no es immutable (depende del diccionario configurado), así que
-- Postgres no deja usarla en un índice. Este envoltorio fija el diccionario
-- y se declara immutable. Pasa a minúsculas y quita tildes:
--   core.search_key('Chillán') = 'chillan'
create or replace function core.search_key(value text)
returns text
language sql
immutable
strict
parallel safe
set search_path = ''
as $$
  select lower(extensions.unaccent('extensions.unaccent'::regdictionary, value));
$$;

-- ---------------------------------------------------------------------
-- core.country
-- ---------------------------------------------------------------------
create table core.country (
  code     char(2) primary key check (code ~ '^[A-Z]{2}$'),
  name_es  text not null check (length(trim(name_es)) > 0),
  name_en  text not null check (length(trim(name_en)) > 0)
);

insert into core.country (code, name_es, name_en) values
  ('AR', 'Argentina',            'Argentina'),
  ('BO', 'Bolivia',              'Bolivia'),
  ('BR', 'Brasil',               'Brazil'),
  ('CA', 'Canadá',               'Canada'),
  ('CL', 'Chile',                'Chile'),
  ('CO', 'Colombia',             'Colombia'),
  ('CR', 'Costa Rica',           'Costa Rica'),
  ('CU', 'Cuba',                 'Cuba'),
  ('EC', 'Ecuador',              'Ecuador'),
  ('SV', 'El Salvador',          'El Salvador'),
  ('ES', 'España',               'Spain'),
  ('US', 'Estados Unidos',       'United States'),
  ('GT', 'Guatemala',            'Guatemala'),
  ('HN', 'Honduras',             'Honduras'),
  ('MX', 'México',               'Mexico'),
  ('NI', 'Nicaragua',            'Nicaragua'),
  ('PA', 'Panamá',               'Panama'),
  ('PY', 'Paraguay',             'Paraguay'),
  ('PE', 'Perú',                 'Peru'),
  ('PR', 'Puerto Rico',          'Puerto Rico'),
  ('DO', 'República Dominicana', 'Dominican Republic'),
  ('UY', 'Uruguay',              'Uruguay'),
  ('VE', 'Venezuela',            'Venezuela');

-- ---------------------------------------------------------------------
-- core.city (GeoNames, CC BY 4.0)
-- ---------------------------------------------------------------------
create table core.city (
  id            bigint primary key,                       -- geonameid
  country_code  char(2) not null references core.country (code),
  name          text not null check (length(trim(name)) > 0),  -- para mostrar
  ascii_name    text not null,                             -- versión ASCII de GeoNames
  admin1        text,                                      -- región / estado
  population    integer not null default 0 check (population >= 0),
  unique (id, country_code)                                -- destino de la FK compuesta
);

create index city_country_code_idx on core.city (country_code);
-- Búsqueda por similitud (pg_trgm) sobre el nombre sin tildes.
create index city_search_trgm_idx on core.city
  using gin (core.search_key(name) extensions.gin_trgm_ops);
-- Coincidencia exacta y por prefijo dentro de un país.
create index city_search_prefix_idx on core.city
  (country_code, core.search_key(name) text_pattern_ops);

-- ---------------------------------------------------------------------
-- core.person: ciudad del catálogo o texto libre, nunca las dos
-- ---------------------------------------------------------------------
alter table core.person
  add column city_id bigint,
  add column city_other text check (city_other is null or length(trim(city_other)) > 0),
  add constraint person_country_code_fkey
    foreign key (country_code) references core.country (code),
  -- La ciudad elegida tiene que ser del país de la persona.
  -- Con city_id null la FK no se revisa (MATCH SIMPLE).
  add constraint person_city_fkey
    foreign key (city_id, country_code) references core.city (id, country_code),
  add constraint person_city_one_source
    check (num_nonnulls(city_id, city_other) <= 1);

create index person_city_id_idx on core.person (city_id);

alter table core.person drop column city;

-- ---------------------------------------------------------------------
-- Acceso: igual que el resto de core. Solo FastAPI.
-- ---------------------------------------------------------------------
alter table core.country enable row level security;
alter table core.city    enable row level security;
