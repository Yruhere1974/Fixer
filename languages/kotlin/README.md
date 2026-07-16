# Kotlin Standards

## Naming Conventions
- **Files**: `PascalCase.kt` (named after primary class, or purpose if multiple)
- **Packages**: `lowercase.dotted` (no underscores)
- **Classes/Interfaces**: `PascalCase`
- **Functions/Variables**: `camelCase`
- **Constants (top-level/`const val`)**: `UPPER_SNAKE_CASE`

## Project Structure
```text
project_root/
├── src/
│   ├── main/
│   │   ├── kotlin/com/ummard/project/
│   │   └── resources/
│   └── test/
│       └── kotlin/com/ummard/project/
├── build.gradle.kts
└── .gitignore
```

## Tools
- **Build**: Gradle (Kotlin DSL, `build.gradle.kts`).
- **Formatting/Linting**: ktlint or detekt.
- **JVM Target**: current LTS (Java 21) unless the platform dictates otherwise.

## Best Practices
- Prefer `val` over `var`; favor immutability and data classes.
- Use null-safety intentionally — avoid `!!`; model absence with nullable types.
- Leverage coroutines for async work instead of raw threads.

## Framework Deep-Dives
- **Ktor**: [`ktor/README.md`](./ktor) — module/plugin composition with Koin DI (mandatory for non-trivial services).
