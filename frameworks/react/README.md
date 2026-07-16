# React Standards

> Component-based UI library. The default choice for interactive frontends.

## Naming Conventions
- **Component files**: `PascalCase.tsx` (e.g. `UserCard.tsx`)
- **Hook files**: `useCamelCase.ts` (e.g. `useAuth.ts`)
- **Components**: `PascalCase`
- **Props interfaces**: `PascalCaseProps`
- **Non-component files/utils**: `kebab-case.ts`

## Project Structure
```text
project_root/
├── src/
│   ├── components/
│   ├── hooks/
│   ├── pages/ (or routes/)
│   ├── lib/
│   └── main.tsx
├── public/
├── package.json
├── tsconfig.json
├── vite.config.ts
└── .gitignore
```

## Tools
- **Build**: Vite.
- **Language**: TypeScript (mandatory).
- **Linting/Formatting**: ESLint + Prettier.
- **Testing**: Vitest + React Testing Library.

## Best Practices
- Function components + hooks only; no class components in new code.
- One component per file; keep components small and composable.
- Derive state — avoid duplicating server state in local state (use TanStack Query).
- Follow the Rules of Hooks; keep `useEffect` dependency arrays honest.

## Architecture Deep-Dive
See [`architecture/README.md`](./architecture) — full production application-architecture standard: TanStack Query for server state + minimal Zustand, feature-based folders, thin components (with a rejected-anti-patterns section).
