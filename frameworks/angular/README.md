# Angular Standards

> Full-featured, opinionated framework by Google. Strong fit for large enterprise apps.

## Naming Conventions
- **Files**: `kebab-case.type.ts` (e.g. `user-card.component.ts`, `auth.service.ts`)
- **Classes**: `PascalCase` with type suffix (`UserCardComponent`, `AuthService`)
- **Selectors**: `app-kebab-case` (e.g. `app-user-card`)
- **Methods/Properties**: `camelCase`

## Project Structure
```text
project_root/
├── src/
│   ├── app/
│   │   ├── core/        # singletons, guards, interceptors
│   │   ├── shared/      # reusable components, pipes
│   │   ├── features/    # feature modules
│   │   └── app.config.ts
│   ├── assets/
│   └── main.ts
├── angular.json
├── package.json
├── tsconfig.json
└── .gitignore
```

## Tools
- **CLI**: Angular CLI (`ng`) for all scaffolding.
- **Language**: TypeScript with `strict` mode.
- **Linting/Formatting**: ESLint (angular-eslint) + Prettier.
- **Testing**: Jasmine/Karma or Jest.

## Best Practices
- Use standalone components and the modern `inject()` API for new code.
- Prefer Signals for reactive state; RxJS for streams/async.
- Enforce module boundaries: `core` (once), `shared` (reusable), `features` (lazy-loaded).
- Never mutate `@Input()` values directly.

## Architecture Deep-Dive
See [`architecture/README.md`](./architecture) — full production application-architecture standard: standalone components + Signals + OnPush, smart/presentational split, lazy routes (with a rejected-anti-patterns section).
