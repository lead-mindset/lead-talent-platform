# Catálogo de países y ciudades

La persona elige su país y su ciudad de un catálogo, en vez de escribirlos como texto libre.

| Tabla | Qué tiene | De dónde sale |
|---|---|---|
| `core.country` | Los 23 países donde opera LEAD (`code`, `name_es`, `name_en`) | La migración `20261118020000_country_city_catalog.sql`. Es la fuente única: para sumar un país, agrega una migración nueva |
| `core.city` | Ciudades de esos países (`id` = geonameid, `name`, `ascii_name`, `admin1`, `population`) | [GeoNames](https://www.geonames.org), con el script de abajo |

En `core.person`, la ciudad se guarda como `city_id` (del catálogo) o `city_other` (texto, si la persona no la encuentra), nunca las dos a la vez. Una FK compuesta `(city_id, country_code)` obliga a que la ciudad sea del país elegido.

## Cargar las ciudades

Los datos no van en el repo. Hay que cargarlos una vez por base (local, QA, producción), después de correr las migraciones.

Desde `backend/`:

```bash
# Base de backend/.env
uv run python -m scripts.load_geonames

# Supabase local
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres uv run python -m scripts.load_geonames
# PowerShell:
# $env:DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"; uv run python -m scripts.load_geonames
```

Opciones:

| Opción | Qué hace |
|---|---|
| `--dataset cities5000` | Ciudades con más de 5000 habitantes, unas 20 mil filas (por defecto) |
| `--dataset cities1000` | Más de 1000 habitantes, unas 50 mil filas |
| `--dry-run` | Descarga y cuenta por país, sin escribir |
| `--refresh` | Vuelve a descargar los archivos |

- Es **idempotente**: hace upsert por `id`. Se puede volver a correr para actualizar.
- Solo carga las ciudades de los países de `core.country`.
- Puerto Rico tiene su propio código (`PR`) en GeoNames, así que sus ciudades no quedan dentro de `US`.
- Los archivos descargados quedan en `backend/.geonames/` (ignorado por git).

## Búsqueda

`core.search_key(text)` pasa a minúsculas y quita tildes (`'Chillán'` → `'chillan'`). Es un envoltorio `immutable` de `unaccent`, para poder indexarlo. Los índices de `core.city` usan esa función:

- `city_search_trgm_idx` (GIN, `gin_trgm_ops`): búsqueda por similitud.
- `city_search_prefix_idx` (`country_code`, `text_pattern_ops`): coincidencia exacta y por prefijo.

El orden de resultados es: coincidencia exacta, prefijo, similitud y, al final, población.

## Licencia

Los datos de ciudades son de [GeoNames](https://www.geonames.org), bajo licencia [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
