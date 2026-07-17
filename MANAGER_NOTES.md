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
