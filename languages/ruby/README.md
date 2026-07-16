# Ruby Standards

## Naming Conventions
- **Files**: `snake_case.rb`
- **Classes/Modules**: `PascalCase`
- **Methods/Variables**: `snake_case`
- **Constants**: `UPPER_SNAKE_CASE`
- **Predicate methods**: end with `?`; mutating methods end with `!`

## Project Structure
```text
project_root/
├── lib/
│   └── project_name/
├── app/            # (Rails)
├── spec/ (or test/)
├── Gemfile
├── Gemfile.lock
├── .ruby-version
└── .gitignore
```

## Tools
- **Linting/Formatting**: RuboCop (standard config).
- **Dependencies**: Bundler; commit `Gemfile.lock`.
- **Testing**: RSpec preferred.

## Best Practices
- Follow the community Ruby Style Guide; let RuboCop enforce it.
- Keep methods short and expressive; favor blocks and enumerables over loops.
- Pin the Ruby version via `.ruby-version` for reproducible environments.

## Framework Deep-Dives
- **Rails**: [`rails/README.md`](./rails) — skinny controllers + service objects — no fat controllers or god models (mandatory for non-trivial apps).
