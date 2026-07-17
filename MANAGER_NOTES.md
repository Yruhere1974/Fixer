# Manager Notes: Fixer (MVP)

## Intent
Keep Fixer's business operating system, planning documents, and implementation
standards together as the project's source of truth.

## Context
- **Base Repo:** https://github.com/Yruhere1974/Fixer
- **Protocol:** We follow the **Ratcheting Protocol** (see `RATCHETING.md`) to ensure progress is locked in and quality never slips.
- **Environment:** [Notes on where this project runs or its primary infrastructure.]

## Open Tasks
- [ ] **Task 1:** [Description of the next logical improvement.]
- [ ] **Task 2:** [Description of a pending feature or bugfix.]
- [ ] **Infrastructure:** [Any pending setup or deployment tasks.]

## Ratcheted
- **2026-07-16 — Local operating content import:** Added the existing `Business/`
  operating documents, `Documents/` project plans, and
  `Project_Operating_System.md` to the repository.
  - **Verification:** Reviewed the imported file list, checked for oversized files,
    and scanned for obvious credential/private-key patterns before commit.
  - **Version:** Import commit on `main`.
- **2026-07-16 — Change log (§6.10, journey step 12):** Built scope/cost change
  control — the last unbuilt journey step. `ChangeRequest` model (requestedBy,
  description, reason, service/schedule/cost/privacy impact, status, decision + note,
  tasksUpdated) + `ChangeStatus` enum + migration. Client page gains a "Scope & cost
  changes" section: log a request (impact fields), and approve/reject with a decision
  note. Pending requests surface in the daily exception view ("Change requests pending").
  RBAC (`canCoordinate` + client access) + audit on every action. Updated §17.4.1
  coverage: step 12 → ✅. **Every journey step is now at least partial; 12 of 15 fully
  operable; 0 ⛔ remaining.**
  - **Verification:** Playwright (`scripts/change-e2e.mjs`) — create a change request
    (pending) then approve it with a note; DB confirms create → pending → approved with
    decision recorded, and the audit trail logs both. typecheck + lint + build clean;
    containers rebuilt.
  - **Version:** Committed on `develop`. Remaining partials: tracking/invoicing (10),
    handoff export (13), secure destruction (14); plus §17.5 incident log and §17.8 gate.
- **2026-07-16 — Provider directory (§17.7, journey step 7):** Built the curated
  provider/community-service directory. `Provider` model (identity, category, services/
  fit, location/accessibility, pricing/wait/referral, registration/insurance, conflict
  disclosure, verification fields, review dates, status). Pages: `/providers` (search +
  category filter), `/providers/new`, `/providers/[id]`. Actions: create (enters pending
  verification), **verify credentials** (records source + date + reviewer, sets Verified,
  schedules a 90-day review), mark reviewed, set/restrict status — all RBAC-gated
  (`canManageDirectory`) and audited. Stale logic: a verified entry past its review date
  displays as **Stale** and is flagged not-presentable (§17.7). Added a "Providers to
  verify / review" card to the daily exception view and a Providers nav link. Seeded a
  verified/pending/stale example each. Updated §17.4.1 coverage (step 7 → ✅; only the
  change-log, step 12, remains ⛔).
  - **Verification:** Playwright (`scripts/providers-e2e.mjs`) — seeded statuses render
    correctly (verified/pending/stale), create → pending and verify → active confirmed in
    the DB, and the dashboard shows the provider-exception card. typecheck + lint + build
    clean.
  - **Version:** Committed on `develop`.
- **2026-07-16 — Controlled client journey operable end-to-end:** Turned the §17.4
  journey from data-modelled/read-only into a UI a navigator can actually run. Added:
  a **New engagement** flow (`/clients/new`) creating client + inquiry + scope/safety
  screen (steps 1–3); record/update **agreement** (4); edit **intake** (6); **consent**
  create + withdraw and **approved-contact** management (5) — which unlocks the guard
  for real use; **action-plan** authoring — create plan + add items (8); a **closeout**
  with retention + feedback and a status control (13–15). All mutations enforce auth,
  §5 role/access, and write to the audit trail. New shared form primitives
  (`components/fields.tsx`, `submit-button.tsx`, `lib/forms.ts`). Updated the §17.4.1
  coverage diagram in `Project_Operating_System.md` (now 9 ✅ / 3 🟡 / 2 ⛔).
  - **Verification:** Playwright end-to-end (`scripts/journey-e2e.mjs`) creates a full
    engagement from scratch through the UI — agreement, intake, contact, consent, plan
    item, and a guard-permitted family update — all asserted present and attributed in
    the audit trail. Caught + fixed a real bug: multi-select checkboxes submitted "on"
    instead of the enum value. typecheck + lint + build clean; containers rebuilt.
  - **Version:** Committed on `develop`. Deferred slices: provider directory + credential
    verification (step 7 / §17.7) and the decision/change log (step 12).
- **2026-07-16 — Authentication + §5 role enforcement (ADR 0003):** Replaced the
  placeholder actor with real auth: email + password (scrypt), DB-backed **revocable**
  sessions (httpOnly cookie), a Next 16 `proxy.ts` for optimistic redirects, and a
  server-side Data Access Layer (`requireUser`). Enforced the §5 access model
  (`lib/access.ts`): Founder/Lead Navigator/Privacy Lead see all clients; Navigator/
  Assistant see only assigned clients; coordination mutations gated to those roles;
  Bookkeeper/Reviewer/External Advisor have no client access. Scoping is applied in
  the query and re-checked in every server action (defence-in-depth). Login/logout UI
  + header user badge added. Seed now sets a dev password (`password123`) for all
  fictional staff and adds a second navigator + a bookkeeper for testing.
  - **Verification:** Playwright end-to-end — unauthenticated redirects to /login;
    founder sees all; an unassigned navigator does NOT see the client and a direct URL
    returns not-found; the assigned navigator sees it and can coordinate; the
    bookkeeper sees nothing, is denied direct access, and has no coordinate controls.
    typecheck + lint + build clean.
  - **Version:** Committed on `develop`. Follow-ups: hash session tokens at rest,
    password reset, lockout/rate-limiting, MFA for Founder/Privacy Lead, user-admin UI.
- **2026-07-16 — Full dockerization (separate containers):** The app and database
  now run as separate containers via `app/docker-compose.yml`: `fixer-app` (Next.js
  `standalone` image, own multi-stage `Dockerfile`, non-root, port 3000), `fixer-db`
  (Postgres 16 + volume + healthcheck), and a one-shot `fixer-migrate` job that runs
  `prisma migrate deploy` and exits. Startup order: db healthy → migrate → app.
  Migrations run in the `migrate` service (built from the `builder` stage with full
  Prisma deps), keeping the app runtime lean. `next.config.ts` set to
  `output: "standalone"`.
  - **Verification:** cold start with a wiped volume applied the init migration to a
    fresh DB, the app served HTTP 200, and after seeding the dashboard + client page
    render the consent guard and audit trail. `docker compose up --build` brings up
    the whole stack.
  - **Version:** Committed on `develop`. Note: production still requires a
    Canadian-region host for data residency (ADR 0002); the container alone does not
    satisfy it.
- **2026-07-16 — Serene Lavender reskin:** Applied the `design/serene_lavender`
  design system to the workspace UI (muted-purple `#5a5689` primary, Manrope, soft
  rounded cards with ambient tinted shadows, pill chips, filled-fill inputs) — the
  `MedFixer` brand. Also fixed a real bug found during verification: the dashboard
  was statically prerendered at build time and served stale data; forced dynamic
  rendering. Added a Playwright screenshot harness (`scripts/shot.mjs`) for visual
  verification.
  - **Verification:** typecheck + lint + build clean; captured full-page screenshots
    of the dashboard and client page confirming the lavender theme, the live consent
    guard, evidence-gated actions, and the audit trail render correctly.
  - **Version:** Committed on `develop`.
- **2026-07-16 — Fixer Operations Platform, slices 1 & 2:** Began building the
  custom application (`app/`) from `Documents/fixer-software-project-plan.md`.
  Stack chosen and recorded as **ADR 0002** (TypeScript + Next.js 16 + Postgres
  via Prisma 7). **Slice 1 (consent/audit/retention spine):** full data model for
  §5 roles / §6 capabilities / §7 data; a consent guard (`evaluateDisclosure` /
  `recordDisclosure`) that permits or refuses any share and records both outcomes;
  an audit event on every mutation; retention category + legal-hold fields.
  **Slice 2 (intake → action-plan journey per `workflow.md`):** navigator dashboard
  with the daily exception view, and a client page (journey record, live consent
  status, evidence-gated action items, a live family-update guard tester, disclosure
  history, and audit trail). Local dev DB via `docker-compose` (Postgres on 5434);
  fictional data only.
  - **Verification:** `npm run typecheck` clean, `npm run lint` clean, `npm run build`
    passes (3 routes). Seed proves the guard (scheduling→family→email allowed;
    health-sensitive blocked; SMS channel blocked). Both routes return HTTP 200 with
    the blocked attempts visible in the UI and audit log.
  - **Version:** Committed on `develop` (not yet tagged to `main` — pilot-readiness
    gates in the plan remain open).

**Handoff:** App scaffold and the consent/audit spine + client-journey slice are in
`app/` on `develop`. Next: reskin the workspace to the **Serene Network** design
system in `design/` (currently generic Tailwind). Still open before any `main` tag:
real authentication + §5 role enforcement, consent creation/withdrawal UI, and the
plan's Phase-5 fictional-client test matrix. Run the app with `docker compose up -d`
then `npm run dev` (seed with `npm run db:seed`).
