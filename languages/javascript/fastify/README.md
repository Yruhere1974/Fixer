# Fastify Standards — Application Architecture

> Deep-dive standard for Fastify apps in the Ummard/Simon ecosystem.
> **Mandate:** every non-trivial Fastify service uses the **app-factory + encapsulated-plugin** pattern, in TypeScript.
> A flat single-file `server.ts` with a module-level `const app = Fastify()`, inline route handlers, and business logic wedged into those handlers is **not** an acceptable baseline — it is untestable, listens at import time, and collapses routing, validation, and domain logic into one blob.

See [`../README.md`](../README.md) for base JavaScript/TypeScript conventions (naming, tooling). This document layers the Fastify-specific architecture on top.

## The Non-Negotiable Rules
1. **The app is assembled only inside `buildApp()`** — a factory that returns a configured `FastifyInstance` and **never** calls `.listen()`. Listening happens exclusively in `server.ts`.
2. **Everything is a plugin.** Routes, integrations, and cross-cutting concerns register through the plugin system. Shared decorators/hooks use `fastify-plugin` (fp) to break encapsulation deliberately; feature routes stay **encapsulated**.
3. **Route handlers contain no business logic.** Handlers parse the validated request and delegate to a **service**; services own domain logic and call **repositories** for I/O.

Everything below follows from these three rules.

## Prescribed Structure
```text
project_root/
├── src/
│   ├── app.ts                     # buildApp() factory — the ONLY place the app is assembled
│   ├── server.ts                  # entrypoint: builds app, reads config, calls .listen()
│   ├── config.ts                  # env-driven, schema-validated config (fail fast)
│   ├── plugins/                   # SHARED plugins (fp) — autoloaded, break encapsulation
│   │   ├── sensible.ts            # @fastify/sensible (httpErrors, etc.)
│   │   ├── prisma.ts              # decorates fastify.prisma (DB client)
│   │   └── auth.ts                # decorates fastify.authenticate (hook factory)
│   ├── routes/                    # ENCAPSULATED route plugins — autoloaded, prefixed by folder
│   │   ├── health/
│   │   │   └── index.ts           # GET /health
│   │   └── users/
│   │       ├── index.ts           # route plugin: schemas + handlers, thin
│   │       ├── users.service.ts   # business logic
│   │       ├── users.repository.ts# data access
│   │       └── users.schema.ts    # JSON Schema (validation + serialization)
│   ├── lib/
│   │   └── errors.ts              # domain error types
│   └── error-handler.ts          # setErrorHandler — centralized error mapping
├── test/
│   ├── helpers/build-app.ts       # test fixture: buildApp() with test config
│   └── users.test.ts              # app.inject() — no live socket
├── package.json
├── tsconfig.json
├── .env.example                   # documented env vars, NO secrets
└── .gitignore
```

## The App Factory
`buildApp()` assembles the instance and returns it. It logs, registers plugins/routes, and wires the error handler — but it does **not** listen. This is what makes the same app bootable in production and injectable in tests.

```typescript
// src/app.ts
import Fastify, { type FastifyInstance, type FastifyServerOptions } from "fastify";
import autoload from "@fastify/autoload";
import { join } from "node:path";
import { setErrorHandler } from "./error-handler.js";

export async function buildApp(
  opts: FastifyServerOptions = {},
): Promise<FastifyInstance> {
  const app = Fastify({
    logger: true, // pino under the hood; override per-env from the caller
    ajv: { customOptions: { removeAdditional: "all", coerceTypes: true } },
    ...opts,
  }).withTypeProvider(); // enables schema-derived types on routes

  // Shared, de-encapsulated plugins first (decorators must exist before routes use them).
  await app.register(autoload, { dir: join(import.meta.dirname, "plugins") });

  // Encapsulated route plugins; folder name becomes the URL prefix.
  await app.register(autoload, {
    dir: join(import.meta.dirname, "routes"),
    options: { prefix: "/api" },
  });

  setErrorHandler(app);

  return app;
}
```

- `buildApp` is `async` because plugin registration is asynchronous; `await app.ready()` is implied when the caller listens or injects.
- **Plugin order matters**: shared decorators (`plugins/`) register before routes so the routes can rely on `fastify.prisma`, `fastify.authenticate`, etc.

## Entrypoint (The Only Thing That Listens)
```typescript
// src/server.ts
import { buildApp } from "./app.js";
import { config } from "./config.js";

const app = await buildApp({
  logger: { level: config.LOG_LEVEL },
});

try {
  await app.listen({ port: config.PORT, host: "0.0.0.0" });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
```
`server.ts` is the single place a socket is opened. Nothing importable calls `.listen()`, so importing the app for tests never binds a port.

## Configuration (Fail Fast)
```typescript
// src/config.ts
import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

const Schema = Type.Object({
  NODE_ENV: Type.Union(
    [Type.Literal("development"), Type.Literal("production"), Type.Literal("test")],
    { default: "development" },
  ),
  PORT: Type.Number({ default: 3000 }),
  LOG_LEVEL: Type.String({ default: "info" }),
  DATABASE_URL: Type.String(), // no default — required, fails fast if absent
});

// Throws at startup if the environment is malformed — never boot half-configured.
export const config = Value.Parse(Schema, {
  ...process.env,
  PORT: process.env.PORT ? Number(process.env.PORT) : undefined,
});
```
- Read config from the environment; **never** hardcode secrets. Commit `.env.example` documenting every variable; never commit `.env`.
- Validate at boot so a missing `DATABASE_URL` crashes on start, not on first request.

## Shared Plugins vs Encapsulated Plugins (The Core Distinction)
Fastify plugins form an **encapsulation tree**: anything a plugin decorates or hooks is visible only to that plugin and its children — siblings and the parent cannot see it. This is the feature to master.

- **Encapsulated (default)** — a plain `async (app) => {…}` plugin. Its decorators, hooks, and routes are scoped to its subtree. Feature route folders are encapsulated: their schemas and hooks cannot leak into other features.
- **De-encapsulated (`fastify-plugin`)** — wrap with `fp()` when you *want* a decorator/hook to be visible to the whole app. Shared infrastructure (DB client, auth, error helpers) is registered this way so routes anywhere can use it.

```typescript
// src/plugins/prisma.ts  — SHARED: fp() so fastify.prisma is visible app-wide
import fp from "fastify-plugin";
import { PrismaClient } from "@prisma/client";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

export default fp(async (app) => {
  const prisma = new PrismaClient();
  await prisma.$connect();

  app.decorate("prisma", prisma); // shared dependency — one instance, injected everywhere
  app.addHook("onClose", async (instance) => {
    await instance.prisma.$disconnect();
  });
});
```

```typescript
// src/plugins/auth.ts  — SHARED: decorates a reusable preHandler hook
import fp from "fastify-plugin";
import type { FastifyReply, FastifyRequest } from "fastify";

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export default fp(async (app) => {
  app.decorate("authenticate", async (req, reply) => {
    try {
      await req.jwtVerify(); // provided by @fastify/jwt, registered earlier
    } catch {
      reply.code(401).send({ error: "unauthorized" });
    }
  });
});
```
> **Rule of thumb:** if a sibling route plugin needs to *see* what your plugin adds, wrap it in `fp()`. If it should stay private to one feature, leave it encapsulated.

## Autoloading
`@fastify/autoload` registers every file in a directory as a plugin. Route folders map to URL prefixes, so structure *is* routing.

- `plugins/` autoloads first — these are `fp()`-wrapped, so their decorators are hoisted app-wide.
- `routes/` autoloads with `prefix: "/api"`; `routes/users/index.ts` → `/api/users`. Each folder is its own encapsulated context.

No manual `app.register(...)` wiring per file, and no hardcoded prefixes inside route files — the filesystem is the source of truth.

## A Route Plugin (Thin, Schema-First, Delegating)
Routes declare a **JSON Schema** for validation *and* serialization, then delegate to a service. No `try/catch` for domain errors — the centralized error handler owns that.

```typescript
// src/routes/users/users.schema.ts
import { Type, type Static } from "@sinclair/typebox";

export const CreateUserBody = Type.Object({
  email: Type.String({ format: "email" }),
  name: Type.String({ minLength: 1 }),
});
export type CreateUserBody = Static<typeof CreateUserBody>;

export const UserReply = Type.Object({
  id: Type.String(),
  email: Type.String(),
  name: Type.String(),
});
```

```typescript
// src/routes/users/index.ts  — ENCAPSULATED route plugin
import type { FastifyInstance } from "fastify";
import { CreateUserBody, UserReply } from "./users.schema.js";
import { UsersService } from "./users.service.js";
import { UsersRepository } from "./users.repository.js";

export default async function usersRoutes(app: FastifyInstance) {
  // Compose the layers from shared decorators exposed by the plugin tree.
  const service = new UsersService(new UsersRepository(app.prisma));

  app.post(
    "/",
    {
      // JSON Schema: `body` is validated in; response is SERIALIZED out (fast + leak-proof).
      schema: {
        body: CreateUserBody,
        response: { 201: UserReply },
      },
      preHandler: [app.authenticate], // reusing the shared decorator
    },
    async (req, reply) => {
      // req.body is fully typed via the type provider — no manual casting.
      const user = await service.createUser(req.body);
      reply.code(201);
      return user; // only id/email/name survive serialization, even if service returns more
    },
  );

  app.get(
    "/:id",
    { schema: { response: { 200: UserReply } } },
    async (req) => {
      const { id } = req.params as { id: string };
      return service.getUser(id); // throws NotFoundError → caught by setErrorHandler
    },
  );
}
```
- **Validation** rejects malformed input before the handler runs (400).
- **Serialization** via the `response` schema is faster than `JSON.stringify` *and* guarantees no accidental field leaks (e.g. password hashes).
- The handler is ~2 lines: validate (declared), delegate, return.

## Service and Repository Layers
Business logic lives in services; I/O lives in repositories. Neither imports Fastify.

```typescript
// src/routes/users/users.service.ts
import { NotFoundError } from "../../lib/errors.js";
import type { UsersRepository } from "./users.repository.js";
import type { CreateUserBody } from "./users.schema.js";

export class UsersService {
  constructor(private readonly repo: UsersRepository) {}

  async createUser(input: CreateUserBody) {
    const existing = await this.repo.findByEmail(input.email);
    if (existing) throw new NotFoundError("email already registered");
    return this.repo.create(input);
  }

  async getUser(id: string) {
    const user = await this.repo.findById(id);
    if (!user) throw new NotFoundError(`user ${id} not found`);
    return user;
  }
}
```

```typescript
// src/routes/users/users.repository.ts
import type { PrismaClient } from "@prisma/client";
import type { CreateUserBody } from "./users.schema.js";

export class UsersRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }
  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }
  create(data: CreateUserBody) {
    return this.prisma.user.create({ data });
  }
}
```
This is *why* handlers stay thin: the same service is unit-testable without Fastify, reusable across HTTP routes, CLI tasks, or queue consumers.

## Lifecycle Hooks
Hooks intercept the request/response lifecycle. Register cross-cutting hooks in shared plugins (`onRequest`, `preHandler`, `onResponse`, `onClose`); scope feature-specific hooks inside the encapsulated route plugin.

```typescript
// example: request-scoped context in a shared plugin
app.addHook("onRequest", async (req) => {
  req.log.info({ url: req.url }, "incoming request");
});
```
- Prefer hooks over middleware — they run inside Fastify's lifecycle and are encapsulation-aware.
- Encapsulated hooks fire only for routes in that plugin's subtree.

## Centralized Error Handling
One `setErrorHandler` maps domain errors and validation failures to HTTP responses. Handlers never format errors themselves — they `throw`.

```typescript
// src/error-handler.ts
import type { FastifyInstance } from "fastify";
import { NotFoundError, ValidationError } from "./lib/errors.js";

export function setErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((err, req, reply) => {
    // Fastify's own schema validation errors carry `.validation`.
    if (err.validation) {
      return reply.code(400).send({ error: "validation_failed", details: err.validation });
    }
    if (err instanceof NotFoundError) {
      return reply.code(404).send({ error: err.message });
    }
    if (err instanceof ValidationError) {
      return reply.code(422).send({ error: err.message });
    }

    req.log.error(err);
    return reply.code(500).send({ error: "internal server error" });
  });
}
```

## Testing (Built From the App Factory)
`app.inject()` drives the full routing/validation/serialization stack **in-process** — no port, no HTTP socket, no flakiness. The fixture builds a fresh app from `buildApp()` with test config.

```typescript
// test/helpers/build-app.ts
import { buildApp } from "../../src/app.js";
import type { FastifyInstance } from "fastify";

export async function buildTestApp(): Promise<FastifyInstance> {
  const app = await buildApp({ logger: false }); // quiet logs in tests
  await app.ready(); // ensure all plugins/decorators are loaded before injecting
  return app;
}
```

```typescript
// test/users.test.ts
import { afterAll, beforeAll, expect, test } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildTestApp } from "./helpers/build-app.js";

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildTestApp();
});
afterAll(async () => {
  await app.close(); // triggers onClose hooks (DB disconnect, etc.)
});

test("rejects an invalid email at the schema layer", async () => {
  const res = await app.inject({
    method: "POST",
    url: "/api/users",
    payload: { email: "not-an-email", name: "Ada" },
  });
  expect(res.statusCode).toBe(400); // never reaches the handler
});

test("creates a user", async () => {
  const res = await app.inject({
    method: "POST",
    url: "/api/users",
    payload: { email: "ada@example.com", name: "Ada" },
  });
  expect(res.statusCode).toBe(201);
  expect(res.json()).toMatchObject({ email: "ada@example.com" });
});
```
The factory is *why* this is testable: each run gets its own fully-wired app, exercised end-to-end through `inject()` with zero global state and zero open ports.

## Tooling
- **Language**: TypeScript, mandatory. Use `withTypeProvider()` so JSON Schemas produce request/response types — no duplicated interfaces.
- **Server**: `buildApp()` for the instance; `.listen()` only in `server.ts`. Run behind a process manager (PM2/systemd) or a container in production.
- **Logging**: `pino` (Fastify's built-in logger). Structured JSON in production; `pino-pretty` in development. Use `req.log` for request-scoped logs.
- **Validation/Serialization**: JSON Schema via TypeBox (`@sinclair/typebox`) or `json-schema-to-ts`; enforced by AJV on every route.
- **Linting/Formatting**: ESLint + Prettier (per base JS/TS standard).
- **Testing**: `vitest` (or `tap`) with `app.inject()` fixtures built from the factory.

## Anti-Patterns (Rejected by This Standard)
- ❌ Business logic (DB queries, domain rules) inside route handlers instead of in services/repositories.
- ❌ Routes without JSON Schema — no input validation, no serialization schema, hand-rolled `JSON.stringify` and manual field-stripping.
- ❌ Module-level `const app = Fastify()` plus `app.listen()` at import time — untestable and binds a port on import.
- ❌ Breaking encapsulation carelessly: wrapping everything in `fp()`, or leaking one feature's decorators/hooks into unrelated routes.
- ❌ Global mutable state (module-level singletons, shared `let` config) instead of decorators injected through the plugin tree.
- ❌ Secrets or connection strings hardcoded in source instead of read from a validated environment config.
