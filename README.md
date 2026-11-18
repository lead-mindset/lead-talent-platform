# LEAD Talent Platform

The LEAD platform for community and talent. A student creates an account, fills in a profile and uploads a resume, and recruiters can later find students who chose to be visible.

The repo has three parts:

| Folder | What it is | Stack |
|---|---|---|
| `frontend/` | Web app (and the high-fidelity prototype it grew from) | Next.js 16 (App Router) · React 19 · Tailwind v4 · shadcn/ui (Radix) · Supabase JS |
| `backend/` | API: the only way into the data | FastAPI · Pydantic v2 · psycopg 3 · PyJWT |
| `supabase/` | Database schema, auth email templates, local Supabase config | Postgres 17 · Supabase Auth + Storage |

Design notes and decisions live in [`docs/plans/`](docs/plans/). Testing is covered in detail in [`docs/testing.md`](docs/testing.md).

> **Status:** Module 1 (student registration + resume) is in progress on `feat/student-registration`. Most screens outside that module still use dummy data from `frontend/src/lib/data/`.

---

## How it fits together

```
Browser (Next.js) ──login / OTP──▶ Supabase Auth
       │                                 │ JWT (access token)
       └──Bearer token──▶ FastAPI ──▶ Postgres (schemas core, talent)
       │                     │
       └──signed URL upload──┴──▶ Supabase Storage (bucket "resumes", private)
```

- The `core` and `talent` schemas are **not** exposed through the Supabase Data API. RLS is on with no policies, so FastAPI is the only door in.
- The browser uploads resumes straight to Storage with a signed URL. The backend never receives the file.
- Recruiter visibility is **off by default**. When a student turns it on, the backend saves the consent date.

---

## Prerequisites

| Tool | Version | Why | Check |
|---|---|---|---|
| [Node.js](https://nodejs.org/) | 20.9+ (we use 24 LTS) | Next.js 16 | `node -v` |
| [pnpm](https://pnpm.io/) | 12.x (pinned in `frontend/package.json`) | Frontend package manager | `pnpm -v` |
| [Python](https://www.python.org/) | 3.12+ | Backend | `python --version` |
| [uv](https://docs.astral.sh/uv/) | latest | Python env + dependencies (`uv.lock`) | `uv --version` |
| [Git](https://git-scm.com/) | any recent | | `git --version` |
| [Supabase CLI](https://supabase.com/docs/guides/cli) | optional | Only if you run Supabase locally or push migrations | `supabase -v` |
| [Docker](https://www.docker.com/) | optional | Required by `supabase start` | `docker -v` |

Enable pnpm through Corepack so you get the exact pinned version:

```bash
corepack enable
```

You also need access to a Supabase project (`lead-core-qa` for development, never production) **or** a local Supabase started with the CLI. Ask the VP Tech for access.

---

## Getting started

### 1. Clone and install

```bash
git clone <repo-url> lead-talent-platform
cd lead-talent-platform

# Frontend
cd frontend
pnpm install
pnpm exec playwright install chromium   # only needed for the UI tests

# Backend
cd ../backend
uv sync                                 # creates .venv and installs app + dev deps
```

### 2. Configure environment variables

Copy the examples and fill them in. Real `.env` files are ignored by git and must never be committed.

```bash
cp frontend/.env.example frontend/.env
cp backend/.env.example  backend/.env
```

#### `frontend/.env`

| Variable | Required | Example | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | `https://<project-ref>.supabase.co` | Supabase project URL (or `http://127.0.0.1:54321` locally) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | yes | `sb_publishable_...` | Public key, safe in the browser |
| `NEXT_PUBLIC_API_URL` | yes | `http://localhost:8000` | FastAPI base URL |

Anything with the `NEXT_PUBLIC_` prefix is shipped to the browser. **Never** put a secret in a `NEXT_PUBLIC_` variable.

#### `backend/.env`

| Variable | Required | Example | Notes |
|---|---|---|---|
| `SUPABASE_URL` | yes | `https://<project-ref>.supabase.co` | Same project as the frontend |
| `SUPABASE_SECRET_KEY` | yes | `sb_secret_...` | **Secret.** Backend only. Used for Storage signed URLs and the test CLI |
| `DATABASE_URL` | yes | `postgresql://postgres.<ref>:<pwd>@aws-0-<region>.pooler.supabase.com:6543/postgres` | Use the transaction pooler (port 6543) |
| `SUPABASE_JWT_SECRET` | no | | Leave empty if the project uses asymmetric JWT keys (recommended); the backend reads the JWKS. Set it only for legacy HS256 projects |
| `CORS_ORIGINS` | yes | `http://localhost:3000,https://talent.leadmindset.org` | Comma-separated frontend origins |

Optional variables for tests and tooling:

| Variable | Used by | Default |
|---|---|---|
| `E2E_API_URL` | backend test CLI (`scripts.e2e`) | `http://localhost:8000` |
| `E2E_EMAIL` | real E2E test | `talent+e2e@leadmindset.org` (must contain `+e2e@`) |
| `E2E_KEEP` | real E2E test | unset. Set to `1` to keep the test data afterwards |
| `E2E_BASE_URL` | real E2E test | `http://localhost:3000` |
| `E2E_MOCK_PORT` | mocked UI tests | `3100` |
| `DEMO_BASE_URL` | `pnpm record-demos` | `http://localhost:3001` |

### 3. Database

**Remote project (usual case):** the migrations in `supabase/migrations/` are already applied to `lead-core-qa`. Nothing to do.

**Local Supabase (optional):**

```bash
supabase start          # needs Docker. API on :54321, DB on :54322, Studio on :54323
supabase db reset       # applies every migration from scratch
```

`supabase start` prints the local URL and keys; put them in both `.env` files.

### 4. Run it locally

Use two terminals:

```bash
# terminal 1: API on http://localhost:8000 (interactive docs at /docs)
cd backend
uv run uvicorn app.main:app --reload

# terminal 2: web app on http://localhost:3000
cd frontend
pnpm dev
```

Quick check that everything is connected:

```bash
cd backend
uv run python -m scripts.e2e health
```

To call the API by hand, get a token with `uv run python -m scripts.e2e token you+e2e@leadmindset.org` and paste it into **Authorize** at http://localhost:8000/docs.

---

## Tests

There are three levels. The first two need no network, no Supabase and send no email.

| Level | What it covers | Command | Needs |
|---|---|---|---|
| Backend unit (pytest) | Rules, JWT security, API, test CLI | `cd backend && uv run pytest` | nothing |
| UI with mocks (Playwright) | Login, sign-up, wizard, profile, resume, routes | `cd frontend && pnpm test:e2e` | nothing |
| Real E2E (Playwright) | Full flow against real Supabase + FastAPI | `cd frontend && pnpm test:e2e:real` | `uvicorn` + `pnpm dev` running, `backend/.env` set |

Useful variants:

```bash
# backend
uv run pytest -k resume       # only tests matching "resume"
uv run ruff check .           # lint
uv run ruff format .          # format

# frontend
pnpm test:e2e:ui              # Playwright visual mode
pnpm e2e:server               # keep the mock server (port 3100) up between runs
pnpm e2e:report               # open the last HTML report
```

The real E2E test only touches accounts whose email contains `+e2e@`, and deletes them before and after the run. Point it at `lead-core-qa`, never production.

See [`docs/testing.md`](docs/testing.md) for every test file and all the CLI shortcuts.

---

## Project structure

```
backend/
  app/
    core/            config, db, JWT security, storage
    modules/
      core/          /me, /universities
      talent/        /talent/profile, /talent/resume
    main.py          FastAPI app, CORS, error handler
  scripts/e2e.py     test CLI (health, otp, token, reset...)
  tests/             pytest
frontend/
  src/app/           routes (App Router)
  src/components/    UI + design system primitives
  src/lib/           api client, auth, supabase client, dummy data
  e2e/mocked/        Playwright tests with mocked Supabase + API
  e2e/real/          Playwright test against the real stack
supabase/
  migrations/        SQL migrations (source of truth for the schema)
  templates/         auth email templates
docs/
  plans/             feature plans and decisions
  testing.md         testing guide
```

---

## Prototype features

These parts of the frontend are still the clickable prototype with dummy data.

**Roles (View As):** open the "Ver como" panel (bottom right) to simulate each role.

| Role | View |
|---|---|
| Student / Member | `/inicio` · `/eventos` · `/personas` · `/perfil` · `/perfil/nuevo` |
| Chapter President / E-board | `/admin` |
| Board (Founders) | `/board` |
| Company (Recruiter) | `/empresa` |

**Design system:** documented at `/design-system`. Primitives: `StatusBadge`, `Chip`, `IconTile`, `InitialsAvatar`, `FilterChip`, `Segmented`. Forms use `Field` + `useForm` + `validators`.

**Demo videos:** `DEMO_BASE_URL=http://localhost:3000 pnpm record-demos` records every view (the dev server must be running). Output goes to `~/Videos/lead-demos/`, outside the repo.

---

## Contributing

Read [`CONTRIBUTING.md`](CONTRIBUTING.md) before opening a pull request.
