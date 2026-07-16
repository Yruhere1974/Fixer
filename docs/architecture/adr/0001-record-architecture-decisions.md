# 0001. Record architecture decisions

- **Status:** Accepted
- **Date:** 2026-07-09
- **Deciders:** The Governor

## Context
The Ummard/Simon ecosystem is built by multiple agents and sessions that wake up without shared memory. Significant architectural choices — stacks, patterns, trade-offs — were being made implicitly and lost between sessions. `RATCHETING.md` already mandates that decisions be documented ("documentation is the lock") and that stack selection be an explicit, justified step. We need a durable, low-friction format for that.

## Options Considered
1. **Architecture Decision Records (Michael Nygard style)** — one short markdown file per decision, numbered and append-only. Lightweight, version-controlled, diffable, industry-standard.
2. **A single running architecture wiki/doc** — everything in one place, but edits overwrite history and decisions blur together.
3. **No formal record** — rely on commit messages and memory. Fails the moment a new session starts.

## Decision
We will record every significant architectural decision as an **ADR** under `docs/architecture/adr/`, following the template in [`0000-adr-template.md`](./0000-adr-template.md). ADRs are append-only; a decision is reversed by a new ADR that supersedes the old one. This operationalizes the RATCHETING mandate that "documentation is the lock."

## Consequences
- **Positive:** Decisions and their rationale survive across sessions; new agents can read the trail to sync context. Stack-selection reviews have a home. Reversals are explicit and traceable.
- **Negative / trade-offs:** A small process cost per significant decision (write and index an ADR).
- **Follow-ups:** Future stack/framework choices in this repo should be backed by an ADR; the ADR index is kept current in [`README.md`](./README.md).
