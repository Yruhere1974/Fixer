# Svelte + SvelteKit Application Architecture

> Deep-dive standard for Svelte 5 + SvelteKit apps in the Ummard/Simon ecosystem.
> **Mandate:** data is loaded in **`load` functions**, state is expressed with **runes**, and mutations go through **form actions**.
> Fetching data in `onMount`, putting business logic in components, or bypassing `load` to reach an API directly is **not** an acceptable baseline — it breaks SSR, defeats progressive enhancement, and scatters untestable logic across the view layer.

See [`../README.md`](../README.md) for base Svelte conventions (naming, tooling, project skeleton). This document layers the SvelteKit application architecture on top.

## The Non-Negotiable Rules
1. **Data is loaded in `load` functions** (`+page.ts` / `+page.server.ts` / `+layout.*`) — never in `onMount`. The page renders on the server with data already present.
2. **Reactivity is expressed with runes** — `$state` for mutable state, `$derived` for computed values, `$effect` only for genuine side effects. No `$derived` logic hidden inside `$effect`.
3. **Mutations go through form actions** with `use:enhance` progressive enhancement — never ad-hoc `fetch` calls buried in click handlers.
4. **Reusable code lives under `$lib`**; server-only code lives under `$lib/server` and is never importable from the client.

Everything below follows from these four rules.

## Prescribed Structure
```text
project_root/
├── src/
│   ├── routes/
│   │   ├── +layout.svelte              # app shell (nav, slots)
│   │   ├── +layout.server.ts           # root load: session/user, runs on server
│   │   ├── +page.svelte                # home view — consumes `data`, never fetches
│   │   ├── +page.ts                    # universal load (public data, runs both sides)
│   │   ├── login/
│   │   │   ├── +page.svelte            # <form method="POST" use:enhance>
│   │   │   └── +page.server.ts         # load + form actions (default/named)
│   │   └── products/
│   │       ├── +page.svelte
│   │       ├── +page.server.ts         # server load (DB/secret access)
│   │       └── [id]/
│   │           ├── +page.svelte
│   │           └── +page.server.ts     # load({ params }) + actions
│   ├── lib/
│   │   ├── components/                 # PascalCase.svelte, dumb/presentational
│   │   ├── stores/                     # cross-cutting rune state (*.svelte.ts)
│   │   ├── server/                     # server-ONLY: db client, auth, secrets
│   │   │   ├── db.ts
│   │   │   └── products.ts             # domain/business logic lives here
│   │   └── schemas.ts                  # shared validation (zod), client-safe
│   ├── app.html
│   ├── app.d.ts                        # App.Locals / App.PageData typings
│   └── hooks.server.ts                 # auth on every request → event.locals
├── static/
├── tests/
│   └── e2e/                            # Playwright specs
├── svelte.config.js
├── vite.config.ts
├── package.json
└── .env.example                        # documented env vars, NO secrets
```

## Loading Data (Server `load`)
`+page.server.ts` runs **only on the server** — it is where DB queries and secret-bearing calls belong. Its return value is streamed to the page as `data`.

```typescript
// src/routes/products/+page.server.ts
import type { PageServerLoad } from './$types';
import { getProducts } from '$lib/server/products';

export const load: PageServerLoad = async ({ locals }) => {
  // locals.user was populated in hooks.server.ts — no fetch, no onMount
  const products = await getProducts({ ownerId: locals.user?.id });
  return { products }; // serialized to the client as `data`
};
```
- Use `+page.server.ts` when the load touches a database, filesystem, or secret.
- Use `+page.ts` (universal) only for public data that may run on the client during navigation.
- Throw `error(404, ...)` / `redirect(303, ...)` from `@sveltejs/kit` for control flow — do not return error shapes.

## Consuming Data (`+page.svelte`)
The component is a **pure view over `data`**. It declares its props with `$props()` and renders — it does not fetch.

```svelte
<!-- src/routes/products/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import ProductCard from '$lib/components/ProductCard.svelte';

  let { data }: { data: PageData } = $props();

  // Derived view state — computed, never fetched
  let count = $derived(data.products.length);
</script>

<h1>Products ({count})</h1>
{#each data.products as product (product.id)}
  <ProductCard {product} />
{/each}
```

## Mutations (Form Actions + `use:enhance`)
State changes go through **form actions**, which work without JavaScript and are enhanced when it is present. Validate on the server; return `fail(...)` for invalid input.

```typescript
// src/routes/login/+page.server.ts
import type { Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { verifyCredentials, createSession } from '$lib/server/auth';

export const actions: Actions = {
  default: async ({ request, cookies }) => {
    const form = await request.formData();
    const email = String(form.get('email') ?? '');
    const password = String(form.get('password') ?? '');

    const user = await verifyCredentials(email, password); // logic in $lib/server
    if (!user) {
      return fail(400, { email, error: 'Invalid credentials' });
    }

    cookies.set('session', await createSession(user), { path: '/' });
    throw redirect(303, '/products');
  },
};
```
```svelte
<!-- src/routes/login/+page.svelte -->
<script lang="ts">
  import { enhance } from '$app/forms';
  import type { ActionData } from './$types';

  let { form }: { form: ActionData } = $props();
</script>

<form method="POST" use:enhance>
  <input name="email" type="email" value={form?.email ?? ''} required />
  <input name="password" type="password" required />
  {#if form?.error}<p class="error">{form.error}</p>{/if}
  <button>Log in</button>
</form>
```
- The form submits a real `POST` — it works with JS disabled; `use:enhance` upgrades it to a fetch + reactive `form` update.
- Named actions (`?/create`, `?/delete`) live in the same `actions` object; wire them with `<button formaction="?/delete">`.

## Component State (Runes)
Local, mutable UI state uses `$state`; computed values use `$derived`; genuine side effects use `$effect`.

```svelte
<!-- src/lib/components/Counter.svelte -->
<script lang="ts">
  let { start = 0 }: { start?: number } = $props();

  let count = $state(start);
  let doubled = $derived(count * 2);          // computed — NOT $effect
  let isEven = $derived(count % 2 === 0);

  function increment() {
    count += 1;
  }
</script>

<button onclick={increment}>
  {count} (×2 = {doubled}, {isEven ? 'even' : 'odd'})
</button>
```

## Shared State (`.svelte.ts` Rune Store)
Cross-component reactive state lives in a `.svelte.ts` module, which may use runes at module scope. Prefer this over `writable` stores in new code.

```typescript
// src/lib/stores/cart.svelte.ts
class Cart {
  items = $state<{ id: string; qty: number }[]>([]);

  total = $derived(this.items.reduce((n, i) => n + i.qty, 0));

  add(id: string) {
    const line = this.items.find((i) => i.id === id);
    if (line) line.qty += 1;
    else this.items.push({ id, qty: 1 });
  }
}

export const cart = new Cart(); // singleton; import { cart } anywhere in the client
```
> Note: a module-level singleton is shared across requests on the server. For per-user server state, keep it in `event.locals` / `load`, not in a module rune. Rune singletons like this are for **client-side** cross-component state.

## Server-Only Code (`$lib/server`)
Business logic, the DB client, and anything touching secrets live under `$lib/server`. SvelteKit **fails the build** if this is imported into client-reachable code — that guarantee is the point.

```typescript
// src/lib/server/products.ts
import { db } from '$lib/server/db';
import { API_KEY } from '$env/static/private'; // private env — server only

export async function getProducts({ ownerId }: { ownerId?: string }) {
  return db.product.findMany({ where: ownerId ? { ownerId } : {} });
}
```
- Import secrets from `$env/static/private` or `$env/dynamic/private` — **never** `$env/static/public` for anything sensitive.
- Keep domain logic here, not in `+page.server.ts` (which stays a thin loader/action) and never in `.svelte` components.

## Testing
```typescript
// src/lib/components/Counter.test.ts  (Vitest + @testing-library/svelte)
import { render, screen } from '@testing-library/svelte';
import { expect, test } from 'vitest';
import userEvent from '@testing-library/user-event';
import Counter from './Counter.svelte';

test('increments and derives doubled', async () => {
  render(Counter, { props: { start: 1 } });
  const button = screen.getByRole('button');
  expect(button).toHaveTextContent('1 (×2 = 2');

  await userEvent.click(button);
  expect(button).toHaveTextContent('2 (×2 = 4');
});
```
```typescript
// tests/e2e/login.spec.ts  (Playwright)
import { expect, test } from '@playwright/test';

test('login form works without client JS', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[name="email"]', 'user@example.com');
  await page.fill('input[name="password"]', 'hunter2');
  await page.click('button');
  await expect(page).toHaveURL('/products');
});
```
- **Unit / component**: Vitest + `@testing-library/svelte`, run in a jsdom (client) and node (server) environment split via `vitest.workspace.ts`.
- **`load` / actions**: test as plain async functions — pass a mock `event`, assert the returned data or `fail`/`redirect`.
- **E2E**: Playwright drives real navigation and progressive enhancement; run the form-action tests with and without JS.

## Tooling
- **Meta-framework**: SvelteKit — routing, SSR, `load`, form actions, adapters.
- **Language**: TypeScript with `svelte-check` in CI; generated `./$types` for every route.
- **Linting/Formatting**: ESLint (`eslint-plugin-svelte`) + Prettier (`prettier-plugin-svelte`), per base Svelte standard.
- **Testing**: Vitest + `@testing-library/svelte` (unit/component); Playwright (E2E).
- **Env**: typed via `$env/*` modules; commit `.env.example`, never `.env`.

## Anti-Patterns (Rejected by This Standard)
- ❌ Fetching data in `onMount` (or a bare `<script>` `fetch`) instead of a `load` function — breaks SSR, flashes empty content, and is unreachable during server render.
- ❌ Business/domain logic embedded in `.svelte` components instead of `$lib/server` — untestable and duplicated across views.
- ❌ Reaching for `writable`/`readable` stores where a `load` return, `$derived`, or a `.svelte.ts` rune fits — legacy reactivity in greenfield code.
- ❌ Returning secrets from a **universal** `+page.ts` (or importing private `$env` there) — universal `load` runs on the client and leaks them; secrets belong in `+page.server.ts` / `$lib/server`.
- ❌ Using `$effect` to compute a value that should be `$derived` — creates redundant re-runs, glitches, and infinite-loop foot-guns. `$effect` is for side effects only.
