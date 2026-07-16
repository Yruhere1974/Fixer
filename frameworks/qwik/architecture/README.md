# Qwik Application Architecture

> Deep-dive standard for Qwik + Qwik City apps (TypeScript) in the Ummard/Simon ecosystem.
> **Mandate:** everything the application captures across a `$` boundary must be **serializable**, and work must be **resumable** — deferred until an event actually needs it.
> Non-serializable state (class instances, closures over live objects, DOM nodes) and forcing eager client execution (`useVisibleTask$` used as `useEffect`, top-level side effects) **defeat resumability** and are **not** acceptable. Qwik's entire value — zero hydration, instant interactivity — collapses the moment the app must re-run on the client to rebuild state.

See [`../README.md`](../README.md) for base Qwik conventions (naming, tooling, structure). This document layers the Qwik City application architecture on top.

## The Non-Negotiable Rules
1. **Everything captured is serializable.** Any value referenced across a `$` boundary (event handlers, tasks, `component$` bodies) is serialized into the HTML and resumed on the client. It must be a plain serializable value — no class instances with methods, no live closures over framework/DOM objects.
2. **Respect the `$` lazy boundary.** `$` marks a lazily-loaded, independently-cacheable chunk. Handlers (`onClick$`), tasks (`useTask$`), and server functions (`server$`) are `$`-suffixed so Qwik can defer their download and execution until needed. Never inline heavy synchronous logic that should live behind a `$`.
3. **State lives in `useSignal` / `useStore`.** Reactive state is a serializable signal (`useSignal`) or a deep proxy (`useStore`). Never hold state in module-level mutable variables or plain component-scope `let`.
4. **Data in via `routeLoader$`.** Server-side data fetching for a route is a `routeLoader$` — it runs on the server before render and its result is serialized to the client. Do **not** fetch in a task on the client to populate initial state.
5. **Mutations via `routeAction$` / `server$`.** Form submissions and mutations use `routeAction$` (progressively enhanced, works without JS) or `server$` for typed RPC. Validate every input with `zod$`.
6. **Avoid `useVisibleTask$` unless truly needed.** It runs eagerly in the browser after paint and is the single biggest resumability leak. Reach for it only for genuine client-only concerns (third-party DOM libs, `IntersectionObserver`, `requestAnimationFrame`) — never for data loading or state derivation.

Everything below follows from these rules.

## Prescribed Structure
```text
project_root/
├── src/
│   ├── routes/                     # Qwik City file-based routing
│   │   ├── layout.tsx              # root layout (nav/footer, shared loaders)
│   │   ├── index.tsx               # "/"  — home route (default export component$)
│   │   ├── products/
│   │   │   ├── index.tsx           # "/products"  — list (routeLoader$)
│   │   │   └── [id]/
│   │   │       └── index.tsx       # "/products/:id" — detail (routeLoader$, routeAction$)
│   │   └── api/
│   │       └── health/
│   │           └── index.ts        # onGet endpoint (RequestHandler)
│   ├── components/                 # reusable, route-agnostic UI
│   │   ├── product-card/
│   │   │   └── product-card.tsx    # export const ProductCard = component$(...)
│   │   └── ui/                     # buttons, inputs, primitives
│   ├── lib/                        # framework-agnostic logic
│   │   ├── db.ts                   # data-access (server-only)
│   │   └── schemas.ts              # zod schemas shared by loaders/actions
│   ├── root.tsx                    # <QwikCityProvider> app shell
│   ├── entry.ssr.tsx               # SSR entry
│   └── global.css
├── public/                         # static assets served as-is
├── vite.config.ts
├── tsconfig.json
├── package.json
└── .gitignore
```
- **Routes own their data** (`routeLoader$` / `routeAction$` co-located in `index.tsx`).
- **`src/components/`** holds reusable UI with no route coupling; one folder per component.
- **`src/lib/`** holds pure/server logic; server-only modules must never be imported into client-eager code paths.

## Components, Signals, and Stores
```tsx
// src/components/counter/counter.tsx
import { component$, useSignal, useStore } from "@builder.io/qwik";

export const Counter = component$(() => {
  const count = useSignal(0);                       // single serializable value
  const state = useStore({ history: [] as number[] }); // deep reactive proxy

  return (
    <div>
      <p>Count: {count.value}</p>
      {/* onClick$ is a $ boundary: this closure is serialized + lazily loaded.
          It may only capture serializable values (count, state) — never a
          class instance, a DOM node, or a live external object. */}
      <button
        onClick$={() => {
          count.value++;
          state.history.push(count.value);
        }}
      >
        Increment
      </button>
      <small>{state.history.length} clicks</small>
    </div>
  );
});
```
- `useSignal` for a single value (`.value` reads/writes and tracks). `useStore` for structured/nested reactive state.
- The `onClick$` closure is a lazily-downloaded chunk — keep it small and keep everything it captures serializable.

## Loading Data — `routeLoader$`
```tsx
// src/routes/products/index.tsx
import { component$ } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";
import { db } from "~/lib/db";

// Runs on the server before render; the returned data is serialized to the client.
export const useProducts = routeLoader$(async () => {
  return db.product.findMany({ orderBy: { name: "asc" } });
});

export default component$(() => {
  const products = useProducts();          // a signal — resolved, no client fetch

  return (
    <ul>
      {products.value.map((p) => (
        <li key={p.id}>{p.name}</li>
      ))}
    </ul>
  );
});
```
- Loaders are named `use*` and **exported** so Qwik City can wire them to the route.
- Data is fetched once, on the server, and resumed — the client never re-runs the query to render initial UI.

## Mutations — `routeAction$` + `zod$` + `Form`
```tsx
// src/routes/products/[id]/index.tsx
import { component$ } from "@builder.io/qwik";
import { routeAction$, routeLoader$, zod$, z, Form } from "@builder.io/qwik-city";
import { db } from "~/lib/db";

export const useProduct = routeLoader$(async ({ params, status }) => {
  const product = await db.product.findUnique({ where: { id: params.id } });
  if (!product) status(404);
  return product;
});

// Validated on the server. Progressive enhancement: the Form works without JS.
export const useRename = routeAction$(
  async (data, { params }) => {
    const product = await db.product.update({
      where: { id: params.id },
      data: { name: data.name },
    });
    return { success: true, product };
  },
  zod$({
    name: z.string().min(1).max(120),
  }),
);

export default component$(() => {
  const product = useProduct();
  const rename = useRename();

  return (
    <Form action={rename}>
      <input name="name" value={product.value?.name} />
      <button type="submit" disabled={rename.isRunning}>Save</button>
      {rename.value?.failed && <p role="alert">{rename.value.fieldErrors?.name}</p>}
      {rename.value?.success && <p>Saved.</p>}
    </Form>
  );
});
```
- `routeAction$` + `<Form>` is the default for mutations: it submits over a native form POST and is enhanced with JS when available.
- `zod$` validation runs on the server; `action.value.fieldErrors` surfaces typed messages back to the UI.

## Typed RPC — `server$`
```tsx
// src/components/search/search.tsx
import { component$, useSignal } from "@builder.io/qwik";
import { server$ } from "@builder.io/qwik-city";
import { db } from "~/lib/db";

// Body runs ONLY on the server; the client gets a typed async proxy.
// Keep it a thin $-boundary — heavy imports stay server-side, out of the client bundle.
const searchProducts = server$(async function (query: string) {
  return db.product.findMany({ where: { name: { contains: query } } });
});

export const Search = component$(() => {
  const results = useSignal<{ id: string; name: string }[]>([]);

  return (
    <input
      onInput$={async (_, el) => {
        results.value = await searchProducts(el.value);   // network call, fully typed
      }}
    />
  );
});
```
- `server$` gives type-safe client→server calls without hand-written API routes. Server-only dependencies (`db`) never reach the client bundle.
- The returned function is itself a `$` chunk — the closure it captures must stay serializable.

## Why Closures Must Stay Serializable
When Qwik renders on the server it **serializes the state each handler captures** into the HTML, then resumes on the client with zero replay. A handler capturing a class instance, a live socket, a `Date`-with-methods contract, or a DOM node has nothing serializable to resume — Qwik cannot rebuild it, so it either throws at build/serialize time or silently forces eager client execution. Capture plain data (signals, stores, primitives); derive live objects **inside** the handler or a task when it actually runs.

## Testing
```tsx
// src/components/counter/counter.spec.tsx
import { createDOM } from "@builder.io/qwik/testing";
import { test, expect } from "vitest";
import { Counter } from "./counter";

test("increments on click", async () => {
  const { screen, render, userEvent } = await createDOM();
  await render(<Counter />);

  expect(screen.querySelector("p")?.textContent).toBe("Count: 0");
  await userEvent("button", "click");
  expect(screen.querySelector("p")?.textContent).toBe("Count: 1");
});
```
- **Unit/component**: Vitest + `@builder.io/qwik/testing`'s `createDOM()` — render, query, and drive events (`userEvent`) in a lightweight DOM.
- **E2E**: Playwright against a built app — the only reliable way to assert real resumability (interact **before** any framework JS would have hydrated) and full route/loader/action flows.

## Tooling
- **Meta-framework**: Qwik City (routing, SSR, loaders/actions) on **Vite**.
- **Language**: TypeScript, `strict` mode.
- **Linting/Formatting**: ESLint with **eslint-plugin-qwik** (enforces `$` rules and serializability) + Prettier.
- **Testing**: Vitest + `@builder.io/qwik/testing` for units; Playwright for E2E.
- **Data access**: server-only modules under `src/lib/`, reached exclusively through `routeLoader$` / `routeAction$` / `server$`.

## Anti-Patterns (Rejected by This Standard)
- ❌ Non-serializable state or closures — capturing class instances, live sockets, `Map`/`Set` of objects with methods, or DOM nodes across a `$` boundary.
- ❌ `useVisibleTask$` for work that should be lazy/event-driven (data loading, state derivation) instead of a genuine client-only concern.
- ❌ Eager execution that defeats resumability — top-level side effects, `useEffect`-style patterns, or forcing the client to re-run to rebuild state.
- ❌ Fetching in a `useTask$`/`useVisibleTask$` to populate initial data instead of a server-side `routeLoader$`.
- ❌ Giant non-`$` handlers — heavy synchronous logic inlined into components instead of behind an `onClick$` / `server$` lazy boundary.
- ❌ Module-level mutable state instead of `useSignal` / `useStore`.
- ❌ Unvalidated actions — a `routeAction$` / `server$` without `zod$` on its input.
