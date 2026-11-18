# Plan: Módulo 1. Registro de estudiantes y resume

Rama: `feat/student-registration` (sale de `mockup/lead-platform-prototype`)
Dueña: Angela (VP Tech)
Estado: backend y base de datos listos para pruebas manuales. Frontend pendiente.

## Objetivo

Una persona crea su cuenta, completa su perfil y sube su resume. Nada más.
Capítulos, eventos, recruiters, admin y funding quedan fuera de este módulo.

## Decisiones

1. Frontend Next.js (pantallas del mockup) + backend FastAPI, igual que Aspire.
2. Un proyecto Supabase con nombre neutro, `lead-core`, para que otras plataformas se sumen después.
3. Dos schemas: `core` (compartido) y `talent` (solo Talent). Regla: si Aspire también lo necesitaría, va en `core`.
4. Persona y cuenta son cosas distintas. `core.person.auth_user_id` es opcional para poder importar personas sin cuenta.
5. La cuenta se enlaza con la persona solo cuando el email está confirmado. Así nadie se apropia del historial de otra persona registrándose con su email.
6. Los schemas no se exponen por la Data API. RLS activado sin políticas. FastAPI es la única puerta.
7. El resume se sube directo del navegador a Storage con URL firmada. El backend no recibe el archivo.
8. Visibilidad para recruiters apagada por defecto. Al activarla se guarda la fecha del consentimiento.
9. Talent no tiene usuarios en producción: partimos limpio, sin migrar datos.

## Modelo de datos

Archivo: `supabase/migrations/20261118000000_core_and_talent.sql`

| Tabla | Para qué |
|---|---|
| `core.university` | Catálogo compartido de universidades |
| `core.person` | Datos de la persona: nombres, apellidos (opcional), nombre completo calculado, email, ciudad, país, universidad, carrera, año de egreso, LinkedIn |
| `core.person_app_role` | Rol por plataforma. Hoy: `talent / student` |
| `talent.profile` | Inglés, skills, top 3 skills, roles de interés, disponibilidad, visibilidad y consentimiento |
| `talent.resume` | Historial de resumes. Solo uno vigente por persona |
| bucket `resumes` | Privado, máximo 10 MB, PDF, DOC o DOCX |

También incluye:
- Trigger `core.link_auth_user_to_person` en `auth.users`.
- Hook `core.custom_access_token_hook`, que agrega `app_roles` al JWT.

Para sumar Aspire más adelante: `alter type core.app add value 'aspire';` y crear el schema `aspire`.

## API (FastAPI, `backend/`)

Base: `/api/v1`. Todas las rutas piden `Authorization: Bearer <access token de Supabase>`.

| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/me` | Persona y roles. 409 si el email no está confirmado |
| GET | `/universities?q=` | Busca en el catálogo |
| GET | `/countries` | Países del catálogo (`code`, `name_es`, `name_en`) |
| GET | `/cities?country=CL&q=&limit=10` | Busca ciudades de un país, sin tildes. Mínimo 2 letras. Ver `docs/city-catalog.md` |
| GET | `/talent/profile` | Perfil actual (`profile` es null si no completó el registro) |
| PUT | `/talent/profile` | Guarda el perfil completo y asigna el rol `student` |
| POST | `/talent/resume/upload-url` | Valida tipo y tamaño, devuelve URL firmada y ruta |
| POST | `/talent/resume` | Confirma la subida y la marca como vigente |
| GET | `/talent/resume` | Resume vigente con URL de descarga (5 minutos). 204 si no hay |
| POST | `/talent/events` | Evento del embudo de registro (6 nombres fijos). 204. Sin datos personales: guarda paso, dispositivo, segundos y un `session_id` aleatorio |

Estructura:

```
backend/app/
  core/            config, seguridad JWT, conexión DB, storage
  modules/core/    personas, roles, universidades
  modules/talent/  schemas, repository (SQL), service (reglas), router (HTTP)
backend/tests/     pytest con repositorios en memoria
```

Toda regla de negocio vive en `service.py`. El router solo autentica, valida y llama al servicio.

## Tareas

### Hecho
- [x] Migración core + talent, probada en Postgres 16 (enlace por email, hook, restricciones).
- [x] Backend FastAPI con 7 endpoints.
- [x] 25 tests (servicio y API) en verde. Ruff sin errores.
- [x] Repositorios probados contra Postgres real con la migración aplicada.

### Pendiente: configurar Supabase
- [ ] Crear el proyecto `lead-core`.
- [ ] `supabase link` y `supabase db push` con la migración.
- [ ] Activar el hook: Authentication > Hooks > Custom Access Token > `core.custom_access_token_hook`.
- [ ] Activar Google y email en Auth. Agregar las URLs de redirección de localhost y talent.leadmindset.org.
- [ ] Cargar el catálogo de universidades (empezar con los capítulos actuales).
- [ ] Llenar `backend/.env` a partir de `.env.example`.

### Pendiente: frontend
- [ ] Agregar `@supabase/ssr` y login real en `src/app/login`.
- [ ] Cliente de API que manda el access token a FastAPI.
- [ ] Conectar `ProfileWizard` con `PUT /talent/profile`. Ocultar el paso de capítulo en este módulo.
- [ ] Después de guardar el perfil, llamar a `supabase.auth.refreshSession()` para que el token traiga el rol `student`.
- [ ] Conectar `cv-card` con el flujo de subida: pedir URL, subir el archivo, confirmar.
- [ ] Ocultar en la navegación todo lo que no es perfil y resume.

### Pendiente: seguridad antes de abrir el registro
- [ ] Templates de correo: pegar `supabase/templates/confirm-signup.html` en "Confirm sign up" (cuentas nuevas) y `supabase/templates/magic-link.html` en "Magic link or OTP" (login). Repetir en QA.
- [ ] Mantener activado "Confirm email" en Auth > Sign In / Providers > Email.
- [ ] Cloudflare Turnstile en login y sign-up (CAPTCHA casi invisible contra bots y envío masivo de correos).
- [ ] Bajar la expiración del código a 10 minutos y revisar Auth > Rate Limits.
- [ ] Job de limpieza: borrar de `auth.users` las cuentas sin confirmar con más de 7 días. Se crean al pedir el código y nunca llegan a `core.person`.

### Pendiente: despliegue
- [ ] Proyecto Vercel para `backend/` (FastAPI), igual que Aspire.
- [ ] Variable `NEXT_PUBLIC_API_URL` en el frontend.

## Mejoras a revisar en las pruebas manuales

- Ciudad es texto libre. Cada persona puede escribirla distinto ("Lima", "lima", "Lima, Perú"). Opciones: catálogo `core.city` por país, o un autocompletado con un servicio de lugares que guarde un id.
- Mismo riesgo en `university_other`, `major`, `skills` y `target_roles`. Revisar si conviene catálogo para cada uno.
- `PUT /talent/profile` reemplaza el perfil completo. Si el wizard guarda paso a paso, hará falta un `PATCH`.
- Confirmar la subida del resume no verifica que el archivo exista en Storage. Agregar esa verificación antes de producción.
- Los resumes reemplazados quedan en Storage. Definir si se borran o se guardan como historial.
- Foto de perfil: el wizard la pide pero este módulo no la guarda (`avatar_path` ya existe en la tabla).

## Cómo correr el backend

Usamos [uv](https://docs.astral.sh/uv/).

```bash
cd backend
uv sync                         # crea .venv e instala todo, incluido dev
copy .env.example .env          # y llenar los valores
uv run pytest
uv run uvicorn app.main:app --reload --port 8000
```

Agregar una dependencia: `uv add nombre`. Solo para desarrollo: `uv add --dev nombre`.
Commitear `uv.lock` para que todo el equipo tenga las mismas versiones.

Documentación interactiva de la API: http://localhost:8000/docs
