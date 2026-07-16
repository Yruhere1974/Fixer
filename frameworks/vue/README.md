# Vue.js Standards

> Progressive, approachable framework. Gentle learning curve with great DX.

## Naming Conventions
- **Component files**: `PascalCase.vue` (e.g. `UserCard.vue`)
- **Components in templates**: `PascalCase` (`<UserCard />`)
- **Composables**: `useCamelCase.ts` (e.g. `useAuth.ts`)
- **Props/Variables**: `camelCase`; events `kebab-case` (`@update-value`)

## Project Structure
```text
project_root/
├── src/
│   ├── components/
│   ├── composables/
│   ├── views/ (or pages/)
│   ├── stores/
│   ├── router/
│   └── main.ts
├── public/
├── package.json
├── tsconfig.json
├── vite.config.ts
└── .gitignore
```

## Tools
- **Build**: Vite.
- **API Style**: Composition API with `<script setup>` (standard for new code).
- **State**: Pinia.
- **Language**: TypeScript.
- **Linting/Formatting**: ESLint (eslint-plugin-vue) + Prettier.

## Best Practices
- Single-File Components; keep `<template>`, `<script setup>`, `<style scoped>`.
- Prefer `ref`/`computed` over reactive mutation sprawl.
- Scope styles by default; reach for global styles deliberately.

## Architecture Deep-Dive
See [`architecture/README.md`](./architecture) — full production application-architecture standard: Composition API + composables, Pinia for client state + vue-query for server state (with a rejected-anti-patterns section).
