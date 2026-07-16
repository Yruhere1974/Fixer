# Elixir Standards

## Naming Conventions
- **Files**: `snake_case.ex` (source) / `snake_case.exs` (scripts, tests)
- **Modules**: `PascalCase` (nested with dots, e.g. `MyApp.Accounts.User`)
- **Functions/Variables/Atoms**: `snake_case`
- **Module attributes / constants**: `@snake_case`
- **Predicate functions**: end with `?`; raising variants end with `!`

## Project Structure
```text
project_root/
├── lib/
│   └── my_app/
├── test/
├── config/
├── mix.exs
├── mix.lock
└── .gitignore
```

## Tools
- **Build/Deps**: Mix; commit `mix.lock`.
- **Formatting**: `mix format` (built-in, enforced in CI).
- **Linting**: Credo.
- **Static Analysis**: Dialyzer (via Dialyxir) for type checks.

## Best Practices
- Embrace the "let it crash" philosophy — supervise processes, don't over-defend.
- Keep functions pure where possible; isolate side effects.
- Use pattern matching and `with` chains over deeply nested conditionals.

## Framework Deep-Dives
- **Phoenix**: [`phoenix/README.md`](./phoenix) — contexts as the business-logic boundary with a thin web layer (mandatory for non-trivial apps).
