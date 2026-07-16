# Architecture Decision Records (ADRs)

An ADR captures a **single significant architectural decision**: the context, the choice, and its consequences. Together they form the immutable decision log for the ecosystem.

## When to write one
Write an ADR when a decision is **significant and hard to reverse**, e.g.:
- Choosing a stack, framework, database, or major dependency.
- A cross-cutting pattern (auth model, API style, event vs. request/response).
- A structural change to how services are built, deployed, or communicate.

Trivial, easily-reversible choices don't need one.

## Process
1. Copy [`0000-adr-template.md`](./0000-adr-template.md) to `NNNN-short-title.md` with the **next zero-padded number**.
2. Fill it in; open it as **Proposed** in a PR for discussion.
3. On merge, set the status to **Accepted**. ADRs are **append-only** — never rewrite an accepted decision.
4. To reverse a decision, write a **new** ADR that **supersedes** the old one, and mark the old one `Superseded by NNNN`.
5. Add a row to the index below.

## Statuses
`Proposed` · `Accepted` · `Deprecated` · `Superseded by <NNNN>`

## Index
| # | Title | Status |
|---|-------|--------|
| [0001](./0001-record-architecture-decisions.md) | Record architecture decisions | Accepted |
| [0002](./0002-fixer-operations-platform-stack.md) | Stack for the Fixer Operations Platform | Accepted |
