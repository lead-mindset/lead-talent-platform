# Tests de LEAD Talent

Hay tres niveles de pruebas. Los dos primeros no tocan Supabase ni mandan correos.

| Nivel | Qué prueba | Comando | Necesita |
|---|---|---|---|
| Unitarios (pytest) | Backend: reglas, seguridad JWT, API, CLI | `cd backend` y `uv run pytest` | Nada |
| UI con mocks (Playwright) | Login, sign-up, wizard, perfil, CV, rutas | `cd frontend` y `pnpm test:e2e` | Nada |
| E2E real (Playwright) | Todo el flujo contra Supabase y FastAPI reales | `cd frontend` y `pnpm test:e2e:real` | `pnpm dev`, uvicorn y `backend/.env` |

## Primera vez

```
cd frontend
pnpm install
pnpm exec playwright install chromium
```

## 1. Unitarios del backend

```
cd backend
uv run pytest            # todos
uv run pytest -k resume  # solo los que mencionan "resume"
uv run ruff check .      # estilo
```

## 2. UI con mocks

Supabase y la API son simulados dentro del navegador. Corre en el puerto 3100, así que no choca con tu `pnpm dev`.

```
cd frontend
pnpm test:e2e            # corre todo (compila la primera vez, ~1 min)
pnpm test:e2e:ui         # modo visual: ves cada paso y puedes repetir un test
pnpm e2e:report          # abre el reporte HTML del último run
```

Para correr varias veces seguidas más rápido, deja el servidor de prueba en otra terminal:

```
pnpm e2e:server
```

Archivos en `frontend/e2e/mocked/`:
- `mocks.ts`: el Supabase y la API falsos, y el estado de cada test.
- `auth.spec.ts`: login, sign-up, código correcto e incorrecto, backend caído, correo sin confirmar.
- `wizard.spec.ts`: validaciones y el registro completo (revisa el JSON exacto que se envía).
- `profile.spec.ts`: perfil, subida de CV, archivo inválido, visibilidad, editar.
- `routes.spec.ts`: rutas ocultas del módulo 1.

## 3. E2E real

Usa tu Supabase y tu backend de verdad. No manda correos: intercepta el pedido del código y genera uno con el CLI del backend.

```
# terminal 1
cd backend && uv run uvicorn app.main:app --reload
# terminal 2
cd frontend && pnpm dev
# terminal 3
cd frontend && pnpm test:e2e:real
```

Usa el correo `talent+e2e@leadmindset.org` (cámbialo con `E2E_EMAIL`). Lo borra antes y después. Para ver los datos al terminar: `E2E_KEEP=1 pnpm test:e2e:real` (en PowerShell: `$env:E2E_KEEP=1; pnpm test:e2e:real`).

Importante: corre contra el proyecto que tenga `backend/.env`. Usa `lead-core-qa` cuando exista, no producción.

## Acciones rápidas (CLI del backend)

Desde `backend/`:

```
uv run python -m scripts.e2e health                                  # ¿API, Supabase y DB responden?
uv run python -m scripts.e2e otp tu.correo@leadmindset.org           # código para entrar sin esperar el correo
uv run python -m scripts.e2e token ana+e2e@leadmindset.org           # access token para probar en /docs
uv run python -m scripts.e2e me ana+e2e@leadmindset.org              # GET /me
uv run python -m scripts.e2e profile ana+e2e@leadmindset.org         # GET /talent/profile
uv run python -m scripts.e2e fill-profile ana+e2e@leadmindset.org    # perfil con datos de ejemplo
uv run python -m scripts.e2e upload-resume ana+e2e@leadmindset.org cv.pdf
uv run python -m scripts.e2e reset ana+e2e@leadmindset.org           # borra cuenta, persona, perfil y CV
```

Seguridad del CLI:
- Todo lo que crea, modifica o borra solo funciona con correos que contienen `+e2e@`. No puede tocar una cuenta real por error.
- `otp` funciona con cualquier correo, porque solo genera un código para entrar. Si después pides otro código desde la web, este deja de servir.
- Usa la secret key de `backend/.env`. Nunca la copies al frontend.

Para probar la API a mano en http://localhost:8000/docs: corre `token`, copia el resultado y pégalo en el botón Authorize.
