# Solid.js Standards

> Fine-grained reactivity with JSX. React-like ergonomics, no virtual DOM.

## Naming Conventions
- **Component files**: `PascalCase.tsx` (e.g. `UserCard.tsx`)
- **Components**: `PascalCase`
- **Primitives/composables**: `createCamelCase` or `useCamelCase`
- **Signals**: `[value, setValue]` pairs in `camelCase`

## Project Structure
```text
project_root/
├── src/
│   ├── components/
│   ├── routes/          # (SolidStart)
│   ├── lib/
│   └── app.tsx
├── public/
├── package.json
├── tsconfig.json
├── vite.config.ts
└── .gitignore
```

## Tools
- **Meta-framework**: SolidStart for routing/SSR.
- **Build**: Vite.
- **Language**: TypeScript.
- **Linting/Formatting**: ESLint (eslint-plugin-solid) + Prettier.

## Best Practices
- Remember components run once — reactivity lives in signals, not re-renders.
- Never destructure props (breaks reactivity); access `props.x` directly.
- Use `createMemo` for derived values and `<For>`/`<Show>` over raw `.map`/ternaries.

## Architecture Deep-Dive
See [`architecture/README.md`](./architecture) — full production application-architecture standard: fine-grained signals + stores, createResource, components-run-once model (with a rejected-anti-patterns section).
