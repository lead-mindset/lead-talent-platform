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

## Nombres en español

GeoNames trae nombres en inglés o locales ("Mexico City", "Los Lagos Region"). El script también descarga los nombres alternativos de cada país (`alternatenames/<CC>.zip`, unos 44 MB en total) y toma los nombres en español, sin los coloquiales ni los históricos:

| Columna | Regla | Si no hay |
|---|---|---|
| `core.city.name_es` | Nombre `es` marcado como preferido ("Ciudad de México") | `NULL`, se muestra `name` |
| `core.city.admin1_es` | Región para mostrar (ver abajo) | `NULL` si es igual al original: se muestra `admin1` |
| `core.city_alias` | Todos los nombres `es` de la ciudad ("Santiago de Chile") | Solo sirven para buscar, no se muestran |

Región para mostrar, en este orden:

1. El nombre `es` corto ("Los Lagos"). Si no hay, el `es` preferido ("Región de Los Lagos").
2. Si no hay en español, el original sin prefijos ni sufijos administrativos en inglés: "Lima Province" → "Lima", "Region of Magallanes" → "Magallanes".
3. Al final, [`backend/scripts/data/admin1_overrides.csv`](../backend/scripts/data/admin1_overrides.csv) (`country_code,admin1_code,name`), que gana siempre. Sirve para los casos que las reglas no arreglan, como "Veracruz-Llave" → "Veracruz". El `admin1_code` es el de `admin1CodesASCII.txt` sin el país (`PE.08` → `08`).

**Brasil (`BR`)** se muestra con sus nombres originales en portugués: no usa `name_es` ni la región en español. Sus alias en español sí se cargan, para buscar.

`name` y `admin1` se conservan tal como vienen de GeoNames. La API siempre devuelve `coalesce(name_es, name)` y `coalesce(admin1_es, admin1)`, así que nunca hay un campo vacío.

## Búsqueda

`core.search_key(text)` pasa a minúsculas y quita tildes (`'Chillán'` → `'chillan'`). Es un envoltorio `immutable` de `unaccent`, para poder indexarlo. Los índices de `core.city` usan esa función:

- `city_search_trgm_idx` (GIN, `gin_trgm_ops`): búsqueda por similitud.
- `city_search_prefix_idx` (`country_code`, `text_pattern_ops`): coincidencia exacta y por prefijo.

`core.city_alias` tiene los mismos dos índices.

La búsqueda compara contra el nombre original y contra todos los alias en español, y cada ciudad se queda con su mejor coincidencia. Así, "mexico city" y "ciudad de mexico" devuelven la misma ciudad, y "santiago de chile" encuentra Santiago.

El orden de resultados es: coincidencia exacta, prefijo, similitud y, al final, población.

Para no mostrar ruido:

- Las coincidencias exactas y de prefijo se devuelven siempre.
- Las que solo coinciden por similitud se devuelven si llegan a 0,5 (`MIN_SIMILARITY` en `backend/app/modules/core/repository.py`).
- Si no hay ninguna exacta ni de prefijo (la persona escribió con errores, como "valparaizo"), también se devuelven las que estén a menos de 0,1 del mejor puntaje (`FUZZY_MARGIN`).

## Licencia

Los datos de ciudades son de [GeoNames](https://www.geonames.org), bajo licencia [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
