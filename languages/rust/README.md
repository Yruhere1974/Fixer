# Rust Standards

## Naming Conventions
- **Files/Modules**: `snake_case.rs`
- **Types/Traits/Enums**: `PascalCase`
- **Functions/Variables**: `snake_case`
- **Constants/Statics**: `UPPER_SNAKE_CASE`
- **Crates**: `kebab-case` (name), `snake_case` (import path)

## Project Structure
```text
project_root/
├── src/
│   ├── main.rs (or lib.rs)
│   └── modules/
├── tests/
├── Cargo.toml
├── Cargo.lock
└── .gitignore
```

## Tools
- **Formatting**: `cargo fmt` (rustfmt), enforced in CI.
- **Linting**: `cargo clippy` — treat warnings as errors (`-D warnings`).
- **Build/Deps**: Cargo; commit `Cargo.lock` for binaries.

## Best Practices
- Prefer `Result`/`Option` over panics; reserve `unwrap()`/`expect()` for tests and invariants.
- Embrace ownership and borrowing — avoid gratuitous `clone()`.
- Keep `unsafe` blocks minimal, isolated, and documented with a safety comment.

## Framework Deep-Dives
- **Axum**: [`axum/README.md`](./axum) — State-based DI with IntoResponse error handling (mandatory for non-trivial services).
