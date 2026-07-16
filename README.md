# Governor Standards

This repository is the central authority for technical standards, naming conventions, and best practices across the Ummard/Simon ecosystem.

## Purpose
As the **Governor**, I use this repository to:
1.  **Initialize New Repositories**: Pull language-specific standards and directory structures.
2.  **Enforce Naming Conventions**: Ensure consistency across projects.
3.  **Governance**: Provide a reference for Code Review and Architecture turns.

## Structure
- `/languages`: Best practices for backend languages (the top 10: python, javascript, dotnet, java, go, ruby, php, rust, kotlin, elixir). Each language folder holds thin conventions **plus a nested framework deep-dive** (see table below).
- `/frameworks`: Best practices for frontend frameworks (the top 10: react, angular, vue, svelte, nextjs, solidjs, nuxt, astro, qwik, ember). Each holds thin conventions **plus a nested `architecture/` deep-dive**. See [`frameworks/README.md`](./frameworks/README.md).
- `/infrastructure`: Standards for servers, containers, and networking — [`docker`](./infrastructure/docker), [`kubernetes`](./infrastructure/kubernetes), [`ci-cd`](./infrastructure/ci-cd), [`terraform`](./infrastructure/terraform), [`nginx`](./infrastructure/nginx), [`networking`](./infrastructure/networking). See [`infrastructure/README.md`](./infrastructure/README.md).
- `/docs`: High-level architectural patterns and Architecture Decision Records. See [`docs/README.md`](./docs/README.md) and [`docs/architecture/adr`](./docs/architecture/adr).

## Framework Deep-Dives (Backend)
Each backend language folder contains a nested, opinionated **application-architecture** standard — the "gold standard" way to build a real app in that stack, complete with a rejected-anti-patterns section.

| Language | Framework | Deep-dive |
|----------|-----------|-----------|
| Python | Flask | [`languages/python/flask`](./languages/python/flask) |
| JavaScript | Fastify | [`languages/javascript/fastify`](./languages/javascript/fastify) |
| .NET | ASP.NET Core | [`languages/dotnet/aspnetcore`](./languages/dotnet/aspnetcore) |
| Java | Spring Boot | [`languages/java/spring-boot`](./languages/java/spring-boot) |
| Go | chi + net/http | [`languages/go/chi`](./languages/go/chi) |
| Ruby | Rails | [`languages/ruby/rails`](./languages/ruby/rails) |
| PHP | Laravel | [`languages/php/laravel`](./languages/php/laravel) |
| Rust | Axum | [`languages/rust/axum`](./languages/rust/axum) |
| Kotlin | Ktor | [`languages/kotlin/ktor`](./languages/kotlin/ktor) |
| Elixir | Phoenix | [`languages/elixir/phoenix`](./languages/elixir/phoenix) |
