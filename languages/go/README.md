# Go Standards

## Naming Conventions
- **Files**: `snake_case.go`; test files `snake_case_test.go`
- **Packages**: short, lowercase, single-word (no underscores or mixedCaps)
- **Exported identifiers**: `PascalCase`
- **Unexported identifiers**: `camelCase`
- **Acronyms**: keep consistent casing (`ID`, `URL`, `HTTP`)

## Project Structure
```text
project_root/
├── cmd/
│   └── app/main.go
├── internal/
│   └── service/
├── pkg/
├── go.mod
├── go.sum
└── .gitignore
```

## Tools
- **Formatting**: `gofmt` / `goimports` (non-negotiable, enforced in CI).
- **Linting**: `golangci-lint` with the project ruleset.
- **Modules**: Go modules only; commit `go.sum`.

## Best Practices
- Handle every error explicitly; wrap with `fmt.Errorf("...: %w", err)`.
- Accept interfaces, return structs.
- Keep `internal/` for code that must not be imported by other repos.
- Favor small packages with clear boundaries over one large package.

## Framework Deep-Dives
- **chi + net/http**: [`chi/README.md`](./chi) — explicit constructor DI with a composition root in main.go (mandatory for non-trivial services).
