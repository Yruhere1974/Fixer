# Java Standards

## Naming Conventions
- **Files**: `PascalCase.java` (one public class per file)
- **Packages**: `lowercase.dotted` (reverse-domain, e.g. `com.ummard.service`)
- **Classes/Interfaces**: `PascalCase`
- **Methods/Variables**: `camelCase`
- **Constants**: `UPPER_SNAKE_CASE`

## Project Structure
```text
project_root/
├── src/
│   ├── main/
│   │   ├── java/com/ummard/project/
│   │   └── resources/
│   └── test/
│       └── java/com/ummard/project/
├── pom.xml (or build.gradle)
└── .gitignore
```

## Tools
- **Build**: Maven or Gradle (pick one per repo, do not mix).
- **Formatting**: `google-java-format` or Spotless.
- **Linting**: Checkstyle + SpotBugs.
- **JDK**: Target the current LTS (Java 21+) unless a target ecosystem requires otherwise.

## Best Practices
- Prefer immutability (`final`, records) and constructor injection.
- Use `Optional` for absent return values; never return `null` collections.
- Handle checked exceptions deliberately — no empty `catch` blocks.

## Framework Deep-Dives
- **Spring Boot**: [`spring-boot/README.md`](./spring-boot) — constructor-injection layering — controller → service → repository (mandatory for non-trivial services).
