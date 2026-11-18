# Contributing to LEAD Talent Platform

Thanks for helping build the LEAD platform. This guide covers how we work. For setup, see the [README](README.md).

## Before you start

- Set up the project with the README and make sure the tests pass: `uv run pytest` in `backend/` and `pnpm test:e2e` in `frontend/`.
- Find or open an issue for the work, and say in it that you are taking it.
- For anything bigger than a small fix (a new module, a schema change, a new endpoint), write a short plan in `docs/plans/<feature>.plan.md` first and get it reviewed. Look at [`docs/plans/student-registration.plan.md`](docs/plans/student-registration.plan.md) for an example.

## Branches

`qa` is the base branch for LEAD Talent. Never commit to it directly.

> [!CAUTION]
> **Never merge or push `qa`, `feat/registro`, or any branch created from them into `master` or `dev`.**
> `master` and `dev` hold the previous LEAD platform, a different application. `dev` also runs a workflow (`deploy-qa.yml`) that applies migrations to another database. Never open a PR against `master` or `dev` from these branches.

Make a branch from `qa` named `<type>/<short-description>`:

```
feat/registro
fix/resume-upload-size
docs/contributing-guide
```

Keep a branch focused on one thing. Rebase on `qa` before opening the PR if it has moved.

## Commits

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<optional scope>): <what changed, imperative, lowercase>
```

| Type | Use for |
|---|---|
| `feat` | New behavior |
| `fix` | Bug fix |
| `refactor` | Code change with no change in behavior |
| `test` | Adding or fixing tests |
| `docs` | Documentation only |
| `chore` | Tooling, deps, config |

Scopes we use: `frontend`, `backend`, `db`, `prototype`. Examples:

```
feat(backend): add GET /talent/resume with signed download url
fix(frontend): show error when resume is over 10 MB
chore(db): add index on core.person(email)
```

Make small commits that each leave the project working.

## How we build features: tests first

1. **Describe the behavior** in plain language (in the issue or the plan).
2. **Write the test first** and watch it fail:
   - User flows: Playwright in `frontend/e2e/mocked/`.
   - Backend rules, security and endpoints: pytest in `backend/tests/`.
3. **Write the smallest code** that makes it pass.
4. **Clean up** with the tests green.

A PR that changes behavior without a test is not ready.

## Code standards

### General

- Product text the user sees is **Spanish-first**. Code, identifiers and commit messages are in English. Code comments can be in either language; follow the file you are editing.
- Don't leave commented-out code, `console.log` or `print` debugging behind.
- Prefer clear names over comments. Comment the *why*, not the *what*.

### Frontend (`frontend/`)

- **Use pnpm only.** Don't commit a `package-lock.json` or `yarn.lock`; `pnpm-lock.yaml` is the only lockfile.
- Next.js 16 has breaking changes from older versions. Check `frontend/node_modules/next/dist/docs/` before using an API you aren't sure about (see `frontend/AGENTS.md`).
- Reuse the design system before building new UI: check `src/components/ui/` and `src/components/` (the `/design-system` page is hidden in Module 1; see the README). Use the tokens in `globals.css`, not hard-coded colors.
- Forms use `Field` + `useForm` + `validators`.
- Call the backend through `src/lib/api.ts`. Don't use `fetch` directly from components.
- Only `NEXT_PUBLIC_*` values reach the browser, and none of them may be secret.

### Backend (`backend/`)

- Python 3.12+, typed. Keep `uv run ruff check .` and `uv run ruff format .` clean (line length 100).
- New features go in a module under `app/modules/<name>/` with `router.py` (HTTP), `schemas.py` (Pydantic), `service.py` (rules) and `repository.py` (SQL). Routers stay thin, rules live in the service.
- Every route requires a Supabase access token unless there is a documented reason.
- Errors return `{"detail": {"code": "...", "message": "..."}}` with a stable `code` the frontend can check.
- Add dependencies with `uv add <pkg>` (or `uv add --dev <pkg>`) so `uv.lock` stays in sync.

### Database (`supabase/`)

- Every schema change is a new migration in `supabase/migrations/`, named `YYYYMMDDHHMMSS_<description>.sql`. **Never edit a migration that has already been applied**; add a new one.
- Shared data goes in the `core` schema, Talent-only data in `talent`. Rule of thumb: if another LEAD platform (for example Aspire) would need it, it goes in `core`.
- Keep RLS on with no policies for `anon`/`authenticated`. FastAPI is the only way in.
- Test the migration on a local Supabase (`supabase db reset`) or on `lead-core-qa` before the PR. Never on production.

## Security and secrets

- Never commit `.env` files, keys, tokens or real personal data. Only `.env.example` files are tracked. When you add a variable, add it to the right `.env.example` **and** the README table.
- `SUPABASE_SECRET_KEY` and `DATABASE_URL` live only in `backend/.env`. They must never reach the frontend.
- Use test emails with `+e2e@` (for example `you+e2e@leadmindset.org`). The test CLI refuses to create, change or delete anything else.
- Student data is personal data. Don't paste it into issues, PRs, screenshots or logs.
- If you find a security problem, tell the VP Tech privately. Don't open a public issue.

## Pull requests

Before you open a PR, run:

```bash
# backend
cd backend
uv run ruff check .
uv run ruff format --check .
uv run pytest

# frontend
cd frontend
pnpm build
pnpm test:e2e
```

If the change touches auth, the API or the database, also run the real E2E (`pnpm test:e2e:real`) against `lead-core-qa`.

Open the PR against `qa` (never `master` or `dev`) with:

- **Title** in Conventional Commit format.
- **What and why:** one or two short paragraphs. Link the issue or plan.
- **How to test:** the steps a reviewer follows.
- **Screenshots** for UI changes (desktop and mobile).
- **Checklist:**
  - [ ] Tests added or updated, and passing
  - [ ] Lint and format clean
  - [ ] New env variables added to `.env.example` and the README
  - [ ] New migrations, if any, tested on local or QA
  - [ ] Docs updated (`README.md`, `docs/`) if behavior or setup changed

Every PR needs at least one approving review before it is merged. Prefer **squash and merge** so `qa` stays one commit per change. Delete the branch after merging.

## Reviewing

- Review within two working days, or say when you will.
- Be kind and specific. Suggest a fix, not just a problem.
- Mark the difference between "must change" and "nit / optional".
- Pull the branch and try it for anything that touches a user flow.

## Questions

Ask in the team channel or tag the VP Tech on the issue.
