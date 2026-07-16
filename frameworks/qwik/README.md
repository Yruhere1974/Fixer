# Qwik Standards

> Resumable framework — instant load via serialized state, no hydration.

## Naming Conventions
- **Component files**: `PascalCase.tsx` (e.g. `UserCard.tsx`)
- **Components**: `PascalCase`, defined with `component$()`
- **Route folders**: `kebab-case/` inside `src/routes/` (Qwik City)
- **Event handlers/lazy boundaries**: suffix with `$` (`onClick$`, `useTask$`)

## Project Structure
```text
project_root/
├── src/
│   ├── components/
│   ├── routes/          # Qwik City file-based routing
│   │   └── index.tsx
│   ├── global.css
│   └── root.tsx
├── public/
├── vite.config.ts
├── package.json
├── tsconfig.json
└── .gitignore
```

## Tools
- **Meta-framework**: Qwik City for routing/SSR.
- **Build**: Vite.
- **Language**: TypeScript.
- **Linting/Formatting**: ESLint (eslint-plugin-qwik) + Prettier.

## Best Practices
- Understand the `$` boundary — it marks lazy-loadable, serializable chunks.
- Keep state serializable; use `useStore`/`useSignal` for reactivity.
- Prefer resumability over eager work — avoid forcing early client execution.

## Architecture Deep-Dive
See [`architecture/README.md`](./architecture) — full production application-architecture standard: resumability + the $ boundary, serializable state, routeLoader$/routeAction$ (with a rejected-anti-patterns section).
