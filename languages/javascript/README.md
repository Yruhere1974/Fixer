# JavaScript/TypeScript Standards

## Naming Conventions
- **Files**: `kebab-case.js` or `kebab-case.ts`
- **Classes**: `PascalCase`
- **Functions/Variables**: `camelCase`
- **Constants**: `UPPER_SNAKE_CASE`

## Project Structure
```text
project_root/
├── src/
│   ├── index.ts
│   └── components/
├── tests/
├── package.json
├── tsconfig.json
└── .gitignore
```

## Tools
- **ESLint**: Standard ruleset.
- **Prettier**: Consistent formatting.
- **TypeScript**: Mandatory for new logic-heavy services.

## Framework Deep-Dives
- **Fastify**: [`fastify/README.md`](./fastify) — plugin-based architecture with encapsulation + app factory (mandatory for non-trivial services).
