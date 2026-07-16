# Kubernetes Standards

> **Mandate:** every workload declares **resource requests/limits, liveness & readiness probes, and a non-root securityContext**, and is deployed from **version-pinned images** via Kustomize overlays. Naked `kubectl apply` of hand-edited YAML with `:latest` images is rejected.

See [`../README.md`](../README.md) for infrastructure principles.

## Structure (Kustomize)
```text
kubernetes/
├── base/
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── kustomization.yaml
├── overlays/
│   ├── staging/kustomization.yaml
│   └── production/kustomization.yaml
```

## Standards
- **Namespaces per environment/domain**; never deploy to `default`.
- **Standard labels** on every object: `app.kubernetes.io/{name,instance,version,part-of,managed-by}`.
- **Images pinned** by SHA/semver — never `:latest`.
- **Resources**: `requests` and `limits` are mandatory (memory + CPU) so the scheduler and OOM behavior are predictable.
- **Probes**: `readinessProbe` (gate traffic) and `livenessProbe` (restart wedged pods) required.
- **Security**: `runAsNonRoot: true`, drop all capabilities, read-only root filesystem where possible.
- **Config & secrets**: config via `ConfigMap`; secrets via an external manager (External Secrets Operator / CSI) — not committed `Secret` manifests.

## Reference (excerpt)
```yaml
containers:
  - name: api
    image: registry/team/api@sha256:...   # pinned, never :latest
    resources:
      requests: { cpu: "100m", memory: "128Mi" }
      limits:   { cpu: "500m", memory: "256Mi" }
    readinessProbe:
      httpGet: { path: /healthz, port: 8080 }
    livenessProbe:
      httpGet: { path: /livez, port: 8080 }
    securityContext:
      runAsNonRoot: true
      readOnlyRootFilesystem: true
      capabilities: { drop: ["ALL"] }
```

## Anti-Patterns (Rejected by This Standard)
- ❌ `:latest` images (no rollback, non-deterministic rollouts).
- ❌ Missing resource requests/limits (noisy-neighbor + unpredictable OOM kills).
- ❌ No probes (traffic sent to unready pods; wedged pods never restart).
- ❌ Committed `Secret` manifests (base64 is not encryption).
- ❌ Deploying to `default` namespace / unlabeled resources.
