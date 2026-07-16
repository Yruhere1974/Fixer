# Svelte Standards

> Compiler-based framework — no virtual DOM. Minimal runtime, high performance.

## Naming Conventions
- **Component files**: `PascalCase.svelte` (e.g. `UserCard.svelte`)
- **Components in markup**: `PascalCase` (`<UserCard />`)
- **Module/util files**: `kebab-case.ts` or `camelCase.ts`
- **Stores**: `camelCase` (e.g. `userStore`)

## Project Structure
```text
project_root/
├── src/
│   ├── lib/
│   │   ├── components/
│   │   └── stores/
│   ├── routes/          # (SvelteKit)
│   └── app.html
├── static/
├── package.json
├── svelte.config.js
├── vite.config.ts
└── .gitignore
```

## Tools
- **Meta-framework**: SvelteKit for routing, SSR, and builds.
- **Language**: TypeScript.
- **Linting/Formatting**: ESLint (eslint-plugin-svelte) + Prettier (prettier-plugin-svelte).
- **Testing**: Vitest + Testing Library.

## Best Practices
- Use Svelte 5 runes (`$state`, `$derived`, `$effect`) for reactivity in new code.
- Keep reusable code under `src/lib`; import via the `$lib` alias.
- Prefer scoped component styles; keep logic out of markup expressions.

## Architecture Deep-Dive
See [`architecture/README.md`](./architecture) — full production application-architecture standard: SvelteKit load functions + runes + form actions, $lib boundaries (with a rejected-anti-patterns section).
