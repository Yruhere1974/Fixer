# Astro Standards

> Content-focused framework. Ships zero JS by default; islands for interactivity.

## Naming Conventions
- **Page files**: `kebab-case.astro` in `src/pages/` (file-based routing)
- **Components**: `PascalCase.astro` (or `.tsx`/`.vue`/`.svelte` islands)
- **Content collections**: `kebab-case.md`/`.mdx` under `src/content/`
- **Utils**: `kebab-case.ts`

## Project Structure
```text
project_root/
├── src/
│   ├── pages/
│   ├── components/
│   ├── layouts/
│   ├── content/
│   └── styles/
├── public/
├── astro.config.mjs
├── package.json
├── tsconfig.json
└── .gitignore
```

## Tools
- **Language**: TypeScript (strict config).
- **Integrations**: Add React/Vue/Svelte only where an island needs it.
- **Linting/Formatting**: ESLint + Prettier (prettier-plugin-astro).

## Best Practices
- Default to static, server-rendered `.astro`; add client JS only via islands.
- Use client directives deliberately (`client:load`, `client:visible`, `client:idle`).
- Model structured content with type-safe Content Collections.

## Architecture Deep-Dive
See [`architecture/README.md`](./architecture) — full production application-architecture standard: islands architecture, type-safe content collections, zero JS by default (with a rejected-anti-patterns section).
