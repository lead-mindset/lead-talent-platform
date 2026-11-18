-- =====================================================================
-- Nombres en español para el catálogo de ciudades (GeoNames)
--
-- core.city.name_es   = nombre en español marcado como preferido en GeoNames.
--                       NULL si no hay: se muestra name.
-- core.city.admin1_es = región en español: el nombre corto ("Los Lagos"),
--                       o el preferido ("Región de Los Lagos"). NULL si no hay.
-- core.city_alias     = todos los nombres en español de cada ciudad (sin los
--                       coloquiales ni los históricos). Solo para buscar:
--                       "santiago de chile" encuentra Santiago.
--
-- Se llenan con backend/scripts/load_geonames.py. name y admin1 se conservan.
-- =====================================================================

alter table core.city
  add column name_es   text check (name_es is null or length(trim(name_es)) > 0),
  add column admin1_es text check (admin1_es is null or length(trim(admin1_es)) > 0);

create table core.city_alias (
  city_id  bigint not null references core.city (id) on delete cascade,
  name     text not null check (length(trim(name)) > 0),
  primary key (city_id, name)
);

-- Mismos índices que core.city: similitud y prefijo sobre el nombre sin tildes.
create index city_alias_search_trgm_idx on core.city_alias
  using gin (core.search_key(name) extensions.gin_trgm_ops);
create index city_alias_search_prefix_idx on core.city_alias
  (core.search_key(name) text_pattern_ops);

alter table core.city_alias enable row level security;
