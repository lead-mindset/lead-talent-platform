# Plan: Event Form Simplification (chapter editor)

Part of `ui-consistency-and-simplification.plan.md` (Phase 4, event-form). Owner-approved direction: **flatten the wizard, cut Pathway entirely**.

## Why this structure (best practice)

- Repeated data-entry task (chapter editors create events regularly) → a **single scrollable page with clear sections** is faster and friendlier than a wizard: all fields visible, easy to scan, no click-through, simpler keyboard/AT navigation.
- It makes the chapter event form **match the admin event form** (already single-page), killing the "same entity, two totally different forms" inconsistency.
- The 5-step wizard and its per-step validation/navigation machinery are removed.

## Data-layer safety (verified in code)

- `toEventPathwayMetadataInput({ payload: undefined })` returns `null` → `updateEvent` **skips** the pathway upsert (`if (pathwayMetadataInput)`) → **existing pathway metadata is preserved on edit** when the form omits it.
- `createEvent` accepts `pathwayMetadata` as optional → omitted on create = no pathway metadata created.
- Consequence (intended): events created/edited from now on are not pathway-eligible; the student-recommendation feature simply stops receiving new pathway-eligible events. No data deletion, no migration.

## Tasks

1. **State**: remove `step` + next/back navigation; remove all pathway state (primary okr, student goal, okr alignment, pillar keys, growth stage fit, student outcomes, audience, cta type, proof outcome, pathway-eligible/disabled flags, evidence-signal derivation).
2. **Submit payload**: drop the pathway fields from create/update payloads (keep title/description/cover/dates/location/meetingUrl/type/capacity/published/chapter/accessModel/applicationQuestions).
3. **Validation**: replace step-based `validateFields(step|all, ...)` with a single `validateFields()`; remove pathway checks.
4. **Render**: one scrollable page, sections as **plain layout containers** (per UI_UX: "sections are layout containers, not floating cards"):
   - Datos del evento (title, description)
   - Imagen de portada (upload dropzone / URL)
   - Formato de asistencia (radio cards — keep sr-only accessible pattern)
   - Fecha y hora
   - Lugar (in_person/hybrid only)
   - Conexión virtual (online/hybrid only)
   - Capacidad
   - Acceso (access-model radio cards + application-question builder + published checkbox)
   - Sticky bottom save bar (kept); remove the wizard step column/summary.
5. **Field labels**: replace the uppercase `FieldLabel` + `RequirementBadge` convention with the standard `Label` + destructive `*` marker (matches the app + Input primitive).
6. **Dead code**: remove unused helpers/imports (evidence-signal helpers, taxonomy filter if unused, wizard icons, stepper).
7. **Admin/chapter parity**: both forms are now single-scroll with standard sections. Full component unification is a separate follow-up (out of scope here to avoid a risky mega-merge).

## Files changed

- `app/[locale]/chapter/events/_components/event-form.tsx` (major rewrite, ~1,896 → ~900 lines)
- Possibly `app/[locale]/chapter/events/new/page.tsx` / `[id]/page.tsx` if they reference the wizard wrapper or step column.

## Verification

- `pnpm exec tsc --noEmit` clean
- `pnpm lint` 0 errors
- `pnpm test` (595 tests) green
- `pnpm build` compiles
- grep: no references to removed pathway/wizard identifiers remain in event-form
- Visual/click-through QA deferred until supabase env is provided (documented, not blocking)

## Risks

- Large single-file rewrite → done carefully in one pass, then verified by typecheck/lint/test/build.
- Application-question builder preserved unchanged (feature not cut).
- No backend changes; actions untouched.