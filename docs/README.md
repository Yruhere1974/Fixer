# Docs

High-level architectural documentation for the Ummard/Simon ecosystem — the "why" behind decisions, not the per-stack "how" (that lives in [`../languages`](../languages) and [`../frameworks`](../frameworks)).

## Contents
- [`architecture/`](./architecture) — how we document and govern architecture: stack selection, patterns, and diagrams.
- [`architecture/adr/`](./architecture/adr) — **Architecture Decision Records**: the immutable log of significant choices.

## Relationship to the rest of the repo
| Question | Lives in |
|----------|----------|
| *How do we name things / structure a Flask app?* | `languages/`, `frameworks/` |
| *How do we run it (containers, network, CI)?* | [`../infrastructure`](../infrastructure) |
| **Why did we choose X over Y?** | **`docs/architecture/adr/`** |

Per [`../RATCHETING.md`](../RATCHETING.md): significant architectural decisions MUST be recorded as ADRs — an undocumented decision means "the ratchet hasn't clicked."
