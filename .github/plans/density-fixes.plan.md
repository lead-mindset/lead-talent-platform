# Plan: Phase 6 — Density & cramped layout fixes

Part of `ui-consistency-and-simplification.plan.md` (Phase 6).

## Findings

- **Admin users table** — already handbook-compliant: filters sit above the table, bulk-action bar appears on selection, mobile uses card rows (`md:hidden`), desktop table wraps in `overflow-x-auto`. Admin tables are meant to be dense on desktop. **No change** (forcing one risks breakage for no gain).
- **Pathway check-in confidence grid** — already fixed earlier (`grid-cols-3 sm:grid-cols-5`).
- **Funding budget rows** — genuinely cramped: 4 inputs forced into one row at `md` (768px): `md:grid-cols-[minmax(0,1fr)_13rem_8rem_auto]`. Fix: stack 1-col → 2-col at `sm` → 4-col only at `lg`.
- Other `grid-cols-[...]` usages are page-level layout grids (`1fr_20rem` etc.), not crammed controls — leave them.

## Tasks

- [ ] Budget item rows: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_12rem_8rem_auto]` so each input gets breathing room until wide screens.
- [ ] Scan once more for any repeated-row grids under `sm` that cram controls (none found beyond budget rows).

## Verification

- `pnpm exec tsc --noEmit`, `pnpm lint` (0 errors), `pnpm test` (595), build compiles.
- Visual check deferred to env-backed QA.