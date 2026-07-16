# Networking Standards

> **Mandate:** **private by default, encrypted in transit, least-privilege ingress.** Public subnets for stateful services, wide-open security groups, and unencrypted internal traffic are rejected.

See [`../README.md`](../README.md) for infrastructure principles.

## Standards
- **Topology**: public subnets hold only load balancers / bastions; app and data tiers live in **private subnets** with egress via NAT.
- **TLS everywhere**: external *and* service-to-service traffic encrypted; internal CA or mesh mTLS for east-west.
- **Least-privilege firewalls / security groups**: default-deny; open only the specific ports a service needs, referencing source SGs/CIDRs — never `0.0.0.0/0` on app ports.
- **DNS conventions**: `<service>.<env>.<domain>` (e.g. `api.staging.example.com`); internal names via private zones.
- **Ingress**: a single managed entry point (ALB / ingress controller) with WAF; no direct public exposure of app instances.
- **Zero-trust posture**: authenticate and authorize every hop; network location is not identity.

## Standard Ports
- `443` external HTTPS · `80` redirect-only · app ports bound to private interfaces · admin/SSH via bastion or SSM, never public.

## Anti-Patterns (Rejected by This Standard)
- ❌ Security groups open to `0.0.0.0/0` on non-public ports.
- ❌ Databases / app servers in public subnets.
- ❌ Unencrypted internal service-to-service traffic.
- ❌ SSH/RDP exposed directly to the internet.
- ❌ Ad-hoc DNS names with no environment convention.
