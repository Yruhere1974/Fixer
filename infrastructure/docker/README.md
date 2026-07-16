# Docker Standards

> **Mandate:** images are **multi-stage, minimal, non-root, and version-pinned**. A `FROM some:latest` image running as root with the build toolchain still inside it is rejected.

See [`../README.md`](../README.md) for infrastructure principles.

## Naming & Tagging
- **Images**: `registry/team/service` in `kebab-case`.
- **Tags**: immutable — a git SHA or semver (`1.4.2`), plus a moving `main` alias. **Never deploy `:latest`.**
- Pin base images by digest (`python:3.12-slim@sha256:...`) for reproducibility.

## Standards
- **Multi-stage builds**: a `build` stage with the toolchain, a lean `runtime` stage that copies only artifacts.
- **Minimal base**: `-slim`, `alpine`, or `distroless`. No full OS images for app runtimes.
- **Non-root**: create and switch to an unprivileged `USER`; the process must not run as UID 0.
- **`.dockerignore`**: exclude `.git`, `node_modules`, secrets, build caches — keep context small.
- **Layer order for cache**: copy dependency manifests and install deps *before* copying source.
- **One concern per container**: one long-running process; no init systems or SSH.
- **`HEALTHCHECK`**: define one so orchestrators can detect liveness.

## Reference Dockerfile
```dockerfile
# --- build stage ---
FROM node:22-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN npm run build

# --- runtime stage ---
FROM gcr.io/distroless/nodejs22-debian12 AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
USER nonroot
EXPOSE 3000
HEALTHCHECK CMD ["node", "dist/healthcheck.js"]
CMD ["dist/server.js"]
```

## Anti-Patterns (Rejected by This Standard)
- ❌ `FROM ...:latest` or unpinned bases — non-reproducible builds.
- ❌ Running as root (no `USER` directive).
- ❌ Secrets or `.env` files baked into image layers (they persist in history).
- ❌ Single-stage images shipping compilers, dev deps, and source to production.
- ❌ `ADD` of remote URLs / `apt-get` without cleaning caches in the same layer.
