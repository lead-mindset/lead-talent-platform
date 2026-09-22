# Plan: UI Consistency And Simplification

Source evidence:

- `docs/handbook/UI_UX.md` (canonical product UI/UX contract, incl. implementation order)
- `docs/handbook/LAUNCH_UI_STANDARD.md` (button/form/table/destructive/accessibility contracts)
- `design-system.json` + `app/[locale]/globals.css` (tokens; note `design-system.json` radius is stale — real default is `0.625rem`)
- `.github/reports/production-readiness-validation-report.md` (baseline: product stable, "pass with issues")

Goal: one coherent, fully accessible LEAD product that uses the shared `components/ui` primitives and handbook rules everywhere; stop inventing one-off UI in pages/forms; simplify and cut the accumulated operational bloat so the product reads as a talent platform again (student chapters ⇄ partner recruiters), not an over-built event/admin console.

## Verified drift (from page-by-page audit)

- **Raw controls bypassing primitives**: 12 files with raw `<button>`, ~15 with raw `<input>`, raw `<select>`/`<textarea>`/radios in student flows.
- **Inline mini-systems**: `event-form.tsx` (13 section cards, local `FieldLabel`/`CheckboxOptionGrid`, hand-rolled stepper), 7+ copy-pasted icon-circle empty states, rounded-full pills.
- **3+ form conventions**: RHF+zod (2 files), controlled `useState` + plain Label/Input (~20), raw server-action. Same entity, two different forms: `admin-event-form.tsx` vs chapter `event-form.tsx`. shadcn `Form` primitives are dead code. Heights/labels/required-markers inconsistent (`h-9` vs `h-11`; `text-red-500 *` vs `text-primary *` vs uppercase `FieldLabel`).
- **Headers**: 12 operational pages hand-roll `<h1>`; hero-scale `text-4xl` in `admin/companies/[id]`.
- **Card-heavy/nested operational pages**: `admin/chapters/[id]` ~9 stacked cards; card-in-card in `onboard-president-panel`, `event-form`, `collaborator-manager`.
- **Cramped/overloaded**: `event-form.tsx` 1,896 lines / ~45 fields / 5-step wizard + autosave + sticky bar; admin users 8-col table; budget rows 4 inputs/row; 5 radio cards in `sm:grid-cols-5`.
- **A11y red flags**: unlabeled icon buttons (kebab/more/clear), non-focusable active tab on company login, unlabeled textareas/selects in `apply-modal`/`member-card`.
- **Dead weight**: 4 near-duplicate autocomplete components; unreferenced routes `/design-audit` (gallery) and `/student-redesign` (mock dashboard); unused Button variants `filled/tonal/outlined/text/glass/brand/hero`; `company/(protected)/settings` duplicates `profile`.

## Implementation Order (follows `UI_UX.md`)

Cut dead weight first, then normalize primitives, then forms, then page structure, then surfaces, then a11y, then density. Route-level polish last.

## Phases / Tasks

### Phase 0 — Cut dead weight
- [ ] Remove dead routes `app/[locale]/design-audit` and `app/[locale]/student-redesign` (unreferenced; confirm no links remain).
- [ ] Consolidate the 4 location-autocomplete implementations into **one** shared primitive; remove `location-autocomplete-new.tsx`; kill `border-gray-300`/`text-gray-500` non-palette colors.
- [ ] Trim unused `Button` variants to the handbook canonical set (`default/secondary/outline/ghost/destructive/link`); keep `hero`/`brand` only if public CTAs adopt them.
- [ ] Merge `company/(protected)/settings` into `company/(protected)/profile` (duplicate surface).

### Phase 1 — Normalize primitives (shared contract first)
- [ ] Wire shadcn `Form` primitives (`FormField/FormItem/FormLabel/FormControl/FormMessage`) into react-hook-form as the canonical form layer; the existing `FormInput` in `ui/stepper` bridges RHF→Input.
- [ ] Standardize input heights: default `h-9`; remove ad-hoc `h-11` overrides (use the `lg` size intentionally where a taller control is justified).
- [ ] Standardize label + required-marker convention inside `Input`/`Form` primitives (single style: `*` in destructive tone, helper/error under field).
- [ ] Add a `RadioGroup` primitive (none exists) for accessible radio/choice groups; audit existing `ToggleGroup`.
- [ ] Audit `Button`/`Badge`/`Card`/`Table`/`EmptyState` variant sets for drift; add domain status-badge mapping helpers so page code stops picking badge variants ad hoc.

### Phase 2 — Unify forms
- [ ] Make the admin event form and chapter event form the **same** contract (shared form component or identical primitives/layout/validation).
- [ ] Convert the ~20 plain controlled forms to RHF + shadcn Form + primitives (auth login/sign-up/forgot/update-password; admin create dialogs; funding request/review; role/identity/onboard panels; student profile/resume).
- [ ] Convert raw-control student forms to primitives (`apply-modal`, `growth-reflection`, `pathway-check-in` incl. radio groups).
- [ ] Standardize submit state: loading + disabled, field-level errors near fields, summary when blocked, Spanish success/error feedback.

### Phase 3 — Page structure
- [ ] Convert the 12 hand-rolled operational `<h1>` headers to `PageHeader`; remove hero-scale type in operational admin pages.
- [ ] Standardize `PageHeader` usage per area (eyebrow/description/primary-action consistency).

### Phase 4 — Surfaces cleanup
- [ ] `event-form.tsx`: replace section cards with `Card`, local `FieldLabel`/`CheckboxOptionGrid` with primitives, wizard dots with `Stepper`; **simplify field set** (confirm cut list: OKR/pillar/stage/result grids → essential only; simplify application-question builder) — needs owner sign-off before deleting fields.
- [ ] Replace 7+ hand-rolled empty states with the `EmptyState` primitive; remove local reimplementations.
- [ ] Replace rounded-full stat pills with `Badge`.
- [ ] De-card operational pages: `admin/chapters/[id]` (~9 cards → sections/tables), `admin/users/[id]`, funding pages.
- [ ] Fix nested card-in-card in `onboard-president-panel` and `collaborator-manager`.

### Phase 5 — Accessibility
- [ ] Label all icon-only buttons (kebab/more/clear/sort).
- [ ] Company login tab bar → real focusable `Tabs` (fix non-focusable active tab).
- [ ] Link labels to controls in `apply-modal`/`member-card` (htmlFor/aria-label).
- [ ] Radios → `RadioGroup` for keyboard access.

### Phase 6 — Density & cramped layouts
- [ ] Admin users: filters above table, actions visible, mobile record cards instead of 8-col squeeze.
- [ ] Budget rows / pathway-check-in grids: give inputs breathing room, responsive stacking.
- [ ] Remove redundant/duplicative controls introduced during accumulation.

### Phase 7 — Validation
- [ ] `pnpm test` (all suites), `pnpm lint` (0 errors), `pnpm build` (prod compile).
- [ ] Playwright a11y/performance gates if local env allows; else document.
- [ ] Update `docs/handbook/UI_UX.md` if primitives/contracts changed materially.

## Files Expected To Change

| Area | Files |
|---|---|
| Primitives | `components/ui/{button,input,card,badge,form,select,textarea,checkbox,stepper,empty-state}.tsx` + new `radio-group.tsx`, shared `location-autocomplete.tsx` |
| Forms | `components/onboarding.tsx`, `components/auth/*`, `components/events/{apply-modal,event-registration-checkout,cancel-registration-dialog}.tsx`, `app/[locale]/admin/**` forms, `app/[locale]/chapter/**` forms, `app/[locale]/student/**` forms, `app/[locale]/company/**` forms |
| Pages | `app/[locale]/admin/**`, `app/[locale]/chapter/**`, `app/[locale]/student/**`, `app/[locale]/company/**`, `app/[locale]/(public)/**` (only if shared primitives affect them) |
| Removals | `app/[locale]/design-audit`, `app/[locale]/student-redesign`, `location-autocomplete-new.tsx`, duplicate `settings` |
| Docs | `docs/handbook/UI_UX.md` if contracts change |

## Acceptance Criteria

- No raw `<button>`/`<input>`/`<select>`/`<textarea>` outside `components/ui` (except hidden inputs / sr-only file inputs).
- All operational pages use `PageHeader`, `Card`, `Badge`, `EmptyState`, `Table`, `Input`/`Form`, `Dialog` primitives — no page-level mini-systems.
- One form convention (RHF + shadcn Form) with consistent heights, labels, required markers, error/success states.
- No card-in-card, no card-heavy operational pages, no hero-scale type in operational pages.
- Icon-only controls have accessible names; tabs/radios keyboard-reachable; labels linked.
- Dead routes/duplicates removed; event form simplified to essential fields (owner-approved cut list).
- `pnpm test` passes, `pnpm lint` 0 errors, `pnpm build` compiles.

## Delivery

Branch per phase group (`refactor/ui-consistency-phase0`, etc.), small PRs, Conventional Commits. Run validation (`pnpm test`, `pnpm lint`, `pnpm build`) before each push. Update this plan's checkboxes as phases land.