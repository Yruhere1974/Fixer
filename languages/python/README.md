# Python Standards

## Naming Conventions
- **Files/Modules**: `snake_case.py`
- **Classes**: `PascalCase`
- **Functions/Variables**: `snake_case`
- **Constants**: `UPPER_SNAKE_CASE`

## Project Structure (Starter Template)
```text
project_root/
├── src/
│   └── project_name/
│       ├── __init__.py
│       └── main.py
├── tests/
├── docs/
├── README.md
├── pyproject.toml (or requirements.txt)
└── .gitignore
```

## Linting & Formatting
- **Ruff**: Preferred for both linting and formatting.
- **Type Hints**: Mandatory for public APIs and complex logic.

## Framework Deep-Dives
- **Flask**: [`flask/README.md`](./flask) — application-factory + blueprint pattern (mandatory for non-trivial apps).
