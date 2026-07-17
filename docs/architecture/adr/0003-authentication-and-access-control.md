# 0003. Authentication and access-control model

- **Status:** Accepted
- **Date:** 2026-07-16
- **Deciders:** Founder (Simon), with agent-architect input

## Context

The plan requires individual staff accounts, no shared logins, access matched to assigned
responsibilities, and **immediate access removal** on offboarding (§5, §8.4). Roles are distinct
(§5): Founder, Lead Navigator, Navigator, Assistant, Privacy Lead, Reviewer, Bookkeeper, External
Advisor — and a navigator should see only the clients assigned to them. Every mutation must remain
attributable in the audit trail (§3.5). Until now the app used a placeholder "acting user."

Constraints: small founder-led team; data residency (no identity data leaving Canada without
review, ADR 0002); reduced complexity (NIST SA-8(7)). The app is Next.js 16 (App Router) +
Postgres/Prisma.

## Options Considered

1. **First-party session auth (email + password, DB-backed sessions).** Passwords hashed with
   Node's built-in `scrypt`; an opaque session token in an httpOnly cookie, validated against a
   `Session` table each request. Pros: no third-party identity provider (nothing leaves Canada),
   full control, sessions are **revocable** (delete the row → instant offboarding), minimal deps.
   Cons: we own the security-sensitive code; no SSO/MFA out of the box.
2. **Auth.js (NextAuth v5).** Mature, but OAuth/provider-centric; a credentials provider re-implements
   the same password flow with more dependency weight, and its default JWT sessions are **not
   server-revocable** without adding a database adapter. More moving parts than this scale needs.
3. **Stateless JWT-in-cookie (per the Next auth guide).** Simplest, but a signed JWT cannot be
   revoked before expiry — directly conflicts with the §8.4 "remove access immediately" requirement.

## Decision

We will build **first-party session authentication with DB-backed, revocable sessions** (option 1).
Passwords are hashed with `scrypt` + per-user salt; login issues a random opaque token stored in a
`Session` row and an httpOnly/SameSite=Lax cookie (Secure in production). A Next 16 **`proxy.ts`**
performs optimistic cookie-only redirects (no DB) for unauthenticated requests; the authoritative
check is a server-side **Data Access Layer** (`requireUser()`), which validates the token against
the DB on every protected render/action.

**Access model (§5) — capability helpers, enforced server-side:**

| Capability | Roles |
|---|---|
| View **all** clients | Founder, Lead Navigator, Privacy Lead |
| View **assigned** clients only | Navigator, Assistant |
| Coordinate (approve/complete actions, attempt disclosures) | Founder, Lead Navigator, Navigator, Assistant |
| No client-record access by default | Reviewer, Bookkeeper, External Advisor |

Assignment scoping is applied **in the query** (non-view-all users only receive clients where
`assignedNavigatorId = user.id`), so an unauthorized id returns not-found rather than leaking
existence. Mutations re-check capability and access server-side before writing, and audit events are
attributed to the authenticated user.

## Consequences

- **Positive:** individual accounts; instant revocation on offboarding; no external identity vendor
  (aligns with residency); attribution is now real; enforcement lives in one Data Access Layer.
- **Negative / trade-offs:** we maintain the auth code; no SSO/MFA yet; session tokens are stored
  unhashed at rest in this first cut.
- **Follow-ups:** hash session tokens at rest; add password-reset, lockout/rate-limiting, and
  session-expiry sweeping; consider MFA for Founder/Privacy Lead; add an admin UI to manage users
  and revoke sessions; periodic access review (§8.4).
