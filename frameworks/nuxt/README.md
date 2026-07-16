# Nuxt Standards

> Vue meta-framework for SSR/SSG, routing, and full-stack apps.

## Naming Conventions
- **Page files**: `kebab-case.vue` inside `pages/` (file-based routing)
- **Components**: `PascalCase.vue` (auto-imported by name)
- **Composables**: `useCamelCase.ts` in `composables/`
- **Server routes**: `kebab-case.ts` in `server/api/`

## Project Structure
```text
project_root/
├── pages/
├── components/
├── composables/
├── layouts/
├── server/
│   └── api/
├── stores/
├── app.vue
├── nuxt.config.ts
├── package.json
└── .gitignore
```

## Tools
- **Framework**: Nuxt 3+ (Nitro server engine).
- **State**: Pinia.
- **Language**: TypeScript.
- **Linting/Formatting**: ESLint (@nuxt/eslint) + Prettier.

## Best Practices
- Lean on auto-imports for components/composables — keep the conventional folders.
- Choose rendering per route (SSR / SSG / ISR) via `routeRules`.
- Use `useFetch`/`useAsyncData` for data; keep secrets in `server/` and runtime config.

## Architecture Deep-Dive
See [`architecture/README.md`](./architecture) — full production application-architecture standard: useAsyncData + SSR-safe useState + Nitro server routes, runtimeConfig secrets (with a rejected-anti-patterns section).
