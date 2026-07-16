# Infrastructure Standards

Standards for how we build, package, ship, and run software across the Ummard/Simon ecosystem — servers, containers, networking, and the pipelines that deliver them.

## Guiding Principles
1. **Everything as code.** Servers, images, pipelines, and network config live in version control — never hand-configured and forgotten. Mirror any live system change back into this repo (e.g. `/etc/nginx/*` → [`nginx/`](./nginx)).
2. **Least privilege by default.** Non-root containers, scoped IAM, private-by-default networking, short-lived credentials.
3. **Immutable & reproducible.** Pinned versions and digests; rebuild from source, don't mutate in place.
4. **No secrets in the repo.** Ever. Secrets come from a manager (Vault, cloud secret store) or CI OIDC — never committed, never baked into images.
5. **The pipeline is the gate.** Lint → test → build → scan → deploy. A release is a tagged, green pipeline (see [`../RATCHETING.md`](../RATCHETING.md) — the tag is the "click").

## Sections
| Area | Folder | Covers |
|------|--------|--------|
| Containers | [`docker/`](./docker) | Dockerfile & image standards |
| Orchestration | [`kubernetes/`](./kubernetes) | Manifest structure, probes, resources |
| Delivery | [`ci-cd/`](./ci-cd) | Pipeline stages, secrets, releases |
| Provisioning | [`terraform/`](./terraform) | IaC module structure, state |
| Reverse proxy | [`nginx/`](./nginx) | TLS, headers, upstreams |
| Networking | [`networking/`](./networking) | DNS, TLS, firewalls, zero-trust |
