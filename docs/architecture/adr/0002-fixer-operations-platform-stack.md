# 0002. Stack for the Fixer Operations Platform

- **Status:** Accepted
- **Date:** 2026-07-16
- **Deciders:** Founder (Simon), with agent-architect input

## Context

`Documents/fixer-software-project-plan.md` specifies a **controlled client-information environment** for a non-clinical Kelowna health & wellness navigator, governed by B.C. PIPA. The defining requirements are not CRUD features but cross-cutting controls:

- **Consent as a managed record** that can *block or warn* against any share that is unauthorized, expired, withdrawn, or narrower than the disclosure (plan §6.3).
- **Full traceability** — every add/change/approval/disclosure/download/deletion attributable to a person and date, reconstructable (plan §3.5, §6.10).
- **Role- and assignment-based access** across eight distinct roles (plan §5).
- **Data minimization + retention/destruction with legal holds** (plan §7, §8.8).
- **Data residency** — information should preferably not leave Canada without professional review (plan §7.2, §8.6).

The build must be maintainable by a very small, founder-led team. The plan's own default was to *configure existing SaaS*; the founder has instead chosen to **build a custom application** (this repo, `app/`, `develop` branch) so the consent/audit/retention spine can be enforced in code rather than assembled from disconnected tools.

Target ecosystem: a small B.C. professional-services business; web app serving an internal navigator workspace (and later a client portal). NIST SA-8(7) *reduced complexity* argues for one language and the smallest viable moving-part count.

## Options Considered

1. **TypeScript + Next.js (App Router) + Postgres via Prisma** — one language front-to-back; typed schema and migrations suit audit/consent tables; Postgres row-level security can back the §5 access model; parameterized queries by default (security standard); trivially hostable in a Canadian region for data residency. Repo already carries `frameworks/nextjs` + `frameworks/react` standards. Con: Node/JS supply-chain surface; RLS + Prisma needs care.
2. **ASP.NET Core + Postgres via EF Core** — mature identity/compliance tooling, strong typing. Con: heavier operational footprint for a solo founder; typically two languages if the UI is a separate SPA; more ceremony than this scale needs (works against SA-8(7)).
3. **Python + Django + Postgres** — batteries-included admin/auth/permissions/migrations fit a records system. Con: repo standards cover Flask (not Django); admin-centric UI is a weaker fit for the client-facing portal; second language for any rich frontend.

## Decision

We will build the Fixer Operations Platform on **TypeScript + Next.js (App Router) + PostgreSQL via Prisma**, with Server Components by default and Server Actions for mutations. Access control is enforced in the application layer now and reinforced with Postgres row-level security as the model matures. All client data is hosted in a **Canadian region**. This wins for our target ecosystem: one language keeps the moving-part count low for a small team (SA-8(7)), typed migrations give the auditable, evolvable schema the consent/audit/retention spine needs, and Canadian-region Postgres directly satisfies the residency constraint.

## Consequences

- **Positive:** Single language and toolchain; typed end-to-end from DB to UI; migrations give an auditable schema history; conforms to existing repo standards (`frameworks/nextjs`, `languages/javascript`, `security`); straightforward Canadian-region hosting.
- **Negative / trade-offs:** Node/npm dependency-supply-chain surface to manage; consent-gating and audit must be enforced by disciplined application-layer guards (and later RLS) rather than inherited from a platform; team must hold to Server-Component-by-default discipline.
- **Follow-ups:** Choose and record the Canadian-region host and the auth mechanism as their own ADRs before pilot; add a `frameworks/nextjs` note on Server Actions + audit-logging pattern once proven; the AI-prohibition (plan §4, §8.7) must be encoded as a build constraint, not just policy.
