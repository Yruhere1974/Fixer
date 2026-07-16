# Ember.js Standards

> Convention-over-configuration framework. Mature, stable, batteries-included.

## Naming Conventions
- **Files**: `kebab-case.js`/`.ts` (e.g. `user-card.js`)
- **Components/Classes**: `PascalCase`
- **Routes/Templates**: `kebab-case` matching the URL structure
- **Services**: `kebab-case`, injected via `@service`

## Project Structure
```text
project_root/
├── app/
│   ├── components/
│   ├── routes/
│   ├── templates/
│   ├── services/
│   ├── models/
│   └── router.js
├── tests/
├── ember-cli-build.js
├── package.json
└── .gitignore
```

## Tools
- **CLI**: Ember CLI for all scaffolding and builds.
- **Language**: TypeScript (via ember-cli-typescript / Glint).
- **Linting/Formatting**: ESLint (eslint-plugin-ember) + Prettier + template-lint.
- **Testing**: QUnit with `@ember/test-helpers`.

## Best Practices
- Use Glimmer components and Octane idioms (`@tracked`, `@action`) for new code.
- Follow the framework's conventions — file location drives resolution.
- Use Ember Data for models; inject shared logic via services.

## Architecture Deep-Dive
See [`architecture/README.md`](./architecture) — full production application-architecture standard: Octane: Glimmer + @tracked + services, route model hooks, modifiers (with a rejected-anti-patterns section).
