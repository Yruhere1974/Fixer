# Terraform / IaC Standards

> **Mandate:** all cloud resources are provisioned via **version-controlled Terraform** with **remote, locked state** and **no hardcoded secrets**. Click-ops in a cloud console and local `terraform.tfstate` committed to git are rejected.

See [`../README.md`](../README.md) for infrastructure principles.

## Structure
```text
terraform/
├── modules/
│   └── <resource>/            # reusable module: main.tf, variables.tf, outputs.tf
├── environments/
│   ├── staging/               # thin composition: calls modules with env vars
│   └── production/
└── versions.tf                # required_providers + pinned versions
```

## Standards
- **Remote state + locking**: backend in S3+DynamoDB / GCS / Terraform Cloud. Never commit `*.tfstate` (it contains secrets).
- **Pin provider & module versions** in `required_providers` and module sources.
- **Modules for reuse**; environments are thin compositions that pass variables — no copy-paste between envs.
- **Naming**: `kebab-case` resource names; consistent tags (`env`, `owner`, `managed-by=terraform`) on every taggable resource.
- **No secrets in `.tf` or `.tfvars`**: source from a secret manager / environment; mark outputs `sensitive = true`.
- **`fmt` + `validate` + `tflint`** in CI; **`plan`** on PR, **`apply`** gated on approval.

## Anti-Patterns (Rejected by This Standard)
- ❌ Local/committed state files.
- ❌ Unpinned providers/modules (`>= x` with no upper bound).
- ❌ Secrets or credentials in `.tf`/`.tfvars`.
- ❌ Duplicated resource blocks per environment instead of shared modules.
- ❌ Manual console changes that drift from code (import or destroy them).
