# Bash Standards

## General
- **Shebang**: Always use `#!/usr/bin/env bash`.
- **Set options**: Use `set -euo pipefail` for robustness.
- **Quoting**: Quote all variable expansions: `"$variable"`.

## Naming
- **Files**: `snake_case.sh`
- **Variables**: `snake_case` (lowercase for local, UPPERCASE for exported/env).

## Structure
```bash
#!/usr/bin/env bash
set -euo pipefail

# Main logic here
```
