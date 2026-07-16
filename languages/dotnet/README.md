# .NET Standards

## Naming Conventions
- **Files**: `PascalCase.cs`
- **Namespaces**: `PascalCase.SubNamespace`
- **Classes/Interfaces**: `PascalCase` / `IPascalCase`
- **Methods**: `PascalCase`
- **Variables**: `camelCase`

## Project Structure
```text
project_root/
├── src/
│   └── ProjectName.Core/
├── tests/
├── ProjectName.sln
└── .gitignore
```

## Tools
- **dotnet format**: Standard formatting.
- **StyleCop**: Linting.

## Framework Deep-Dives
- **ASP.NET Core**: [`aspnetcore/README.md`](./aspnetcore) — DI-first layered architecture on the minimal hosting model (mandatory for non-trivial APIs).
