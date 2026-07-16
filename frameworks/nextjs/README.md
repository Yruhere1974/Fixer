# Next.js Standards

> React meta-framework for SSR/SSG, routing, and full-stack apps. Default for production React.

## Naming Conventions
- **Route folders**: `kebab-case/` inside `app/`
- **Special files**: lowercase reserved names (`page.tsx`, `layout.tsx`, `loading.tsx`, `route.ts`)
- **Components**: `PascalCase.tsx`
- **Server Actions/utils**: `camelCase` in `kebab-case.ts` files

## Project Structure
```text
project_root/
├── src/
│   ├── app/             # App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── (routes)/
│   ├── components/
│   ├── lib/
│   └── styles/
├── public/
├── next.config.ts
├── package.json
├── tsconfig.json
└── .gitignore
```

## Tools
- **Router**: App Router (default for new projects).
- **Language**: TypeScript.
- **Linting/Formatting**: ESLint (eslint-config-next) + Prettier.
- **Testing**: Vitest/Jest + Playwright for E2E.

## Best Practices
- Server Components by default; add `"use client"` only where interactivity is needed.
- Fetch data in Server Components / Server Actions; keep secrets server-side.
- Use `next/image` and `next/font`; colocate route-specific components.
- Keep environment variables typed and validated at startup.

## Architecture Deep-Dive
See [`architecture/README.md`](./architecture) — full production application-architecture standard: Server Components by default, `use client` pushed to the leaves, Server Actions (with a rejected-anti-patterns section).
