# CI/CD Standards

> **Mandate:** every change flows through **lint → test → build → scan → deploy**; credentials come from **OIDC (short-lived)**, actions are **pinned by SHA**, and a **release is a green pipeline on a tagged commit**. Long-lived cloud keys in CI secrets and unpinned third-party actions are rejected.

See [`../README.md`](../README.md) for infrastructure principles, and [`../../RATCHETING.md`](../../RATCHETING.md) — the git tag is the release "click."

## Pipeline Stages
1. **Lint / format check** — fail fast on style + static analysis.
2. **Test** — unit + integration; publish coverage.
3. **Build** — produce the immutable artifact/image (tagged with the git SHA).
4. **Scan** — dependency + image vulnerability scan; secret scan.
5. **Deploy** — to staging automatically; to production on a tag/approval.

## Standards
- **Pin actions by commit SHA**, not a moving tag (`uses: actions/checkout@<sha>`).
- **No long-lived secrets**: authenticate to cloud via **OIDC federation**; scope permissions per job (`permissions:` least privilege).
- **Branch protection**: PRs required into `main`/`develop`; required green checks; no direct pushes to protected branches except the ratchet flow.
- **Reproducible builds**: build once, promote the same artifact through environments — don't rebuild per stage.
- **Ephemeral runners**, cached dependencies keyed by lockfile hash.

## Reference (GitHub Actions excerpt)
```yaml
permissions:
  contents: read
  id-token: write            # OIDC — no static cloud keys
jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<pinned-sha>
      - run: make lint
      - run: make test
      - run: make build         # tags image with ${{ github.sha }}
      - run: make scan
```

## Anti-Patterns (Rejected by This Standard)
- ❌ Long-lived cloud access keys stored as CI secrets (use OIDC).
- ❌ Unpinned third-party actions (supply-chain risk).
- ❌ Rebuilding the artifact separately for each environment (drift).
- ❌ Deploying straight to production with no staging gate.
- ❌ `permissions: write-all` / default broad tokens.
