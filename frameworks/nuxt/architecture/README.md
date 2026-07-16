# Nuxt Application Architecture

> Deep-dive standard for Nuxt 3 (TypeScript) apps in the Ummard/Simon ecosystem.
> **Mandate:** data is fetched with **`useAsyncData`/`useFetch`** (explicit keys), SSR-shared state lives in **`useState`**, and server logic lives in **`server/api`** (Nitro).
> A bare `$fetch` in `setup`, a module-level `ref` used as shared state, or a secret in public `runtimeConfig` is **not** an acceptable baseline — the first double-fetches (client + server) with no SSR payload transfer, the second leaks one user's data into another's hydrated request, and the third ships your secrets to the browser bundle.

See [`../README.md`](../README.md) for base Nuxt conventions (naming, folders, tooling). This document layers the production application architecture on top.

## The Non-Negotiable Rules
1. **Data is fetched via `useAsyncData`/`useFetch` with an explicit key** — never a bare `$fetch`/`fetch` awaited directly in `setup`. These composables run once (server), serialize the result into the SSR payload, and rehydrate on the client instead of fetching twice.
2. **SSR-shared reactive state uses `useState`** — never a module-level `ref`/`reactive`. On the server a module is shared across every request, so a module-scoped `ref` cross-contaminates users. `useState` is per-request and payload-serialized.
3. **Server logic lives in `server/api` (Nitro)** — DB access, third-party calls, and anything touching a secret runs on the server, not in a component.
4. **Secrets live only in private `runtimeConfig`** — the top-level `runtimeConfig` is server-only; `runtimeConfig.public` is shipped to the browser. Secrets go in the former, never the latter.

Everything below follows from these four rules.

## Prescribed Structure
```text
project_root/
├── pages/                       # file-based routes (kebab-case.vue)
│   ├── index.vue
│   └── products/
│       └── [id].vue             # dynamic route param
├── components/                  # PascalCase.vue, auto-imported — presentation only
│   └── ProductCard.vue
├── composables/                 # useCamelCase.ts, auto-imported — shared client logic
│   └── useCart.ts
├── stores/                      # Pinia stores for cross-page shared state
│   └── cart.ts
├── layouts/
│   └── default.vue
├── server/                      # Nitro — server-only, never bundled to the client
│   ├── api/
│   │   └── products/
│   │       ├── index.get.ts     # GET /api/products
│   │       └── [id].get.ts      # GET /api/products/:id
│   ├── utils/                   # server-only helpers (db client, auth)
│   │   └── db.ts
│   └── middleware/              # runs on every request (auth, headers)
├── app.vue                      # root; <NuxtLayout> + <NuxtPage>
├── nuxt.config.ts               # runtimeConfig, routeRules, modules
├── package.json
├── tsconfig.json
├── .env.example                 # documented env vars, NO secrets
└── .gitignore
```

## Fetching Data — `useAsyncData` + a `server/api` Route
```vue
<!-- pages/products/[id].vue -->
<script setup lang="ts">
import type { Product } from '~/types'

const route = useRoute()

// Explicit, stable key → dedupes the request and keys the SSR payload cache.
// Runs once on the server, serializes into the payload, rehydrates on the client.
const { data: product, pending, error } = await useAsyncData<Product>(
  () => `product-${route.params.id}`,
  () => $fetch(`/api/products/${route.params.id}`),
  { watch: [() => route.params.id] },
)
</script>

<template>
  <div v-if="pending">Loading…</div>
  <ProductCard v-else-if="product" :product="product" />
  <p v-else-if="error">Failed to load product.</p>
</template>
```
- The **key** (`product-${id}`) is mandatory: it dedupes concurrent callers and lets Nuxt match the server-rendered payload to the client on hydration. Without it Nuxt auto-generates one from the call site — unstable across refactors and prone to collisions.
- `$fetch` is correct **inside** the `useAsyncData` handler (and in event handlers). It is wrong when awaited bare in `setup`.
- Use `useFetch(url)` as the shorthand for the common "GET this URL" case; reach for `useAsyncData` when you need a custom handler or a computed key.

## Server Route — Nitro Handler (`server/api/*.ts`)
```typescript
// server/api/products/[id].get.ts
import { getDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  const product = await getDb().product.findUnique({ where: { id } })
  if (!product) {
    throw createError({ statusCode: 404, statusMessage: 'Product not found' })
  }

  return product // auto-serialized to JSON
})
```
- File suffix sets the method: `[id].get.ts` → `GET`, `index.post.ts` → `POST`.
- Use `getRouterParam`, `getQuery`, and `readBody` for inputs; `createError` for typed HTTP errors.
- Anything secret (API keys, DB credentials, tokens) is read from `runtimeConfig` here — it never crosses into a component.

## SSR-Safe Shared State — `useState`
```typescript
// composables/useSessionUser.ts
import type { User } from '~/types'

export function useSessionUser() {
  // Per-request on the server, serialized into the payload, shared on the client.
  // NEVER `const user = ref<User | null>(null)` at module scope — that single ref
  // is shared across every concurrent SSR request and leaks users into each other.
  return useState<User | null>('session-user', () => null)
}
```
```vue
<script setup lang="ts">
const user = useSessionUser()
</script>

<template>
  <span v-if="user">Hi, {{ user.name }}</span>
</template>
```
- The string key (`'session-user'`) namespaces the value in the Nuxt payload — keep it unique per logical piece of state.
- For richer cross-page domain state (actions, getters), use a **Pinia** store in `stores/`; Pinia is SSR-safe by the same per-request mechanism.

## Composables — Shared Client Logic
```typescript
// composables/useCart.ts
import type { CartItem } from '~/types'

export function useCart() {
  const items = useState<CartItem[]>('cart-items', () => [])

  const total = computed(() =>
    items.value.reduce((sum, item) => sum + item.price * item.qty, 0),
  )

  function add(item: CartItem) {
    items.value.push(item)
  }

  return { items, total, add }
}
```
- Composables are auto-imported (`use*` in `composables/`) — no manual `import`.
- Wrap shared state in `useState`, expose a narrow API. Components consume composables; they do not own business logic.

## Runtime Config — Private vs Public
```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  runtimeConfig: {
    // SERVER-ONLY — never shipped to the browser. Secrets go here.
    apiSecret: '',              // overridden by NUXT_API_SECRET
    databaseUrl: '',            // overridden by NUXT_DATABASE_URL

    // Exposed to the client bundle. NON-secret values only.
    public: {
      apiBase: '/api',          // overridden by NUXT_PUBLIC_API_BASE
      siteUrl: 'https://example.com',
    },
  },
})
```
```typescript
// server/api/pay.post.ts — reading a secret, server-side only
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  return chargeProvider(config.apiSecret, await readBody(event))
})
```
- Keys are populated from `NUXT_`-prefixed env vars at runtime (`apiSecret` ← `NUXT_API_SECRET`, `public.apiBase` ← `NUXT_PUBLIC_API_BASE`). Commit `.env.example`; never commit `.env`.
- `useRuntimeConfig(event)` in server code sees both halves; in client code it sees **only** `public`. Putting a secret under `public` publishes it to every visitor — a rejected pattern.

## Per-Route Rendering — `routeRules`
```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  routeRules: {
    '/': { prerender: true },                       // SSG at build time
    '/products/**': { swr: 3600 },                  // ISR-style, revalidate hourly
    '/dashboard/**': { ssr: false },                // client-only SPA (auth'd app)
    '/admin/**': { ssr: true },                     // always server-rendered
  },
})
```
Choose the rendering mode **per route**, not globally: marketing pages prerender, catalogue pages cache-and-revalidate, authenticated dashboards render client-side.

## Testing
```typescript
// vitest.config.ts
import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: { environment: 'nuxt' },
})
```
```typescript
// tests/unit/useCart.spec.ts — unit, Nuxt environment
import { describe, it, expect } from 'vitest'
import { useCart } from '~/composables/useCart'

describe('useCart', () => {
  it('totals line items', () => {
    const cart = useCart()
    cart.add({ id: '1', price: 10, qty: 2 })
    expect(cart.total.value).toBe(20)
  })
})
```
```typescript
// tests/e2e/products.spec.ts — end-to-end, real Nuxt server
import { describe, it, expect } from 'vitest'
import { setup, $fetch } from '@nuxt/test-utils/e2e'

describe('products api', async () => {
  await setup({ server: true })

  it('serves a product over the API', async () => {
    const html = await $fetch('/products/1')
    expect(html).toContain('ProductCard')
  })
})
```
- **Unit** tests run under the `nuxt` Vitest environment so auto-imports and composables resolve.
- **E2E** tests boot a real Nuxt+Nitro server via `@nuxt/test-utils/e2e` and exercise pages and API routes together.

## Tooling
- **Framework**: Nuxt 3 (Nitro server engine) — never hand-roll an Express server alongside it.
- **Language**: TypeScript throughout (`<script setup lang="ts">`, typed `server/api`).
- **State**: `useState` for request-scoped state; Pinia for cross-page domain stores.
- **Linting/Formatting**: `@nuxt/eslint` + Prettier (per base Nuxt standard).
- **Testing**: Vitest + `@nuxt/test-utils` (unit under the `nuxt` environment, e2e via `setup`).

## Anti-Patterns (Rejected by This Standard)
- ❌ Bare `const data = await $fetch('/api/…')` in `setup` — fetches on the server **and** again on the client, ships no SSR payload, and shows a flash of empty content on hydration. Use `useAsyncData`/`useFetch`.
- ❌ Module-scoped `const user = ref(null)` (or `reactive`) as shared state — on the server that single instance is shared across all concurrent requests and leaks one user's data into another's response. Use `useState`.
- ❌ Secrets in `runtimeConfig.public` (or hardcoded in components) — they are bundled and served to every browser. Secrets go in private `runtimeConfig` and are read only in `server/`.
- ❌ Business logic, DB queries, or third-party API calls inside components — that belongs in `server/api` (Nitro) or composables; components are presentation.
- ❌ Omitting the `useAsyncData`/`useFetch` **key** — produces unstable auto-generated keys, payload-cache mismatches on hydration, and duplicate in-flight requests.
