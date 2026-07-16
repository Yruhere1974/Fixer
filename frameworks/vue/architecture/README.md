# Vue Application Architecture

> Deep-dive standard for production Vue 3 apps in the Ummard/Simon ecosystem.
> **Mandate:** every non-trivial Vue app is built with the **Composition API + `<script setup>`**, organised by **feature**, with **composables** for reusable logic, **Pinia** for global client state and **TanStack Query (vue-query)** for server state.
> The Options API for new code, mutating props to communicate upward, and dumping every piece of state into one global store are **not** acceptable baselines — they defeat type inference, hide data flow, and turn the store into an untestable god-object.

See [`../README.md`](../README.md) for base Vue conventions (naming, project layout, tooling). This document layers the application architecture on top.

## The Non-Negotiable Rules
1. **Composition API + `<script setup lang="ts">` only** — no Options API (`data`, `methods`, `mixins`) in new code.
2. **Reusable stateful logic lives in composables** (`useX`) — never in mixins, never copy-pasted between components.
3. **Client state → Pinia; server state → TanStack Query.** Data that lives on the server (fetched, cached, revalidated) is **never** hand-mirrored into Pinia.
4. **Props down, events up.** A child never mutates a prop; it `emit`s and the owner of the state decides.

Everything below follows from these four rules.

## Prescribed Structure
```text
project_root/
├── src/
│   ├── features/                       # one folder per domain — the unit of ownership
│   │   ├── auth/
│   │   │   ├── components/              # feature-scoped SFCs
│   │   │   │   ├── LoginForm.vue
│   │   │   │   └── UserBadge.vue
│   │   │   ├── composables/
│   │   │   │   └── useAuth.ts           # feature logic (queries, mutations, derived state)
│   │   │   ├── api/
│   │   │   │   └── auth.api.ts          # typed HTTP calls + DTO types
│   │   │   └── index.ts                 # public surface of the feature (re-exports)
│   │   └── projects/
│   │       ├── components/
│   │       ├── composables/
│   │       └── api/
│   ├── stores/                          # Pinia — GLOBAL client state only (session, ui, prefs)
│   │   ├── session.store.ts
│   │   └── ui.store.ts
│   ├── shared/                          # cross-feature, domain-agnostic
│   │   ├── components/                  # design-system / presentational (BaseButton, BaseModal)
│   │   ├── composables/                 # useDebounce, useMediaQuery …
│   │   ├── api/http.ts                  # configured fetch/axios client
│   │   └── lib/
│   ├── router/
│   │   └── index.ts
│   ├── App.vue
│   └── main.ts                          # app + Pinia + VueQuery + router wiring
├── tests/
│   └── setup.ts                         # jsdom + MSW server lifecycle
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── .env.example                         # documented VITE_* vars, NO secrets
```
- A **feature owns its components, composables and API layer** — you delete a feature by deleting its folder.
- `shared/` holds only domain-agnostic building blocks; if it imports from `features/`, it is not shared.
- `stores/` is deliberately thin: it is for *client* state that outlives a single view, not a dumping ground.

## Application Wiring
```ts
// src/main.ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'

import App from './App.vue'
import { router } from './router'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
})

createApp(App)
  .use(createPinia())
  .use(VueQueryPlugin, { queryClient }) // server-state cache — one per app
  .use(router)
  .mount('#app')
```

## Components — `<script setup lang="ts">`
```vue
<!-- src/features/projects/components/ProjectCard.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import type { Project } from '../api/projects.api'

// Typed props via the generic form — no runtime `type:` boilerplate.
const props = defineProps<{
  project: Project
  selected?: boolean
}>()

// Events are typed and explicit — this is the ONLY upward channel.
const emit = defineEmits<{
  (e: 'select', id: string): void
  (e: 'archive', id: string): void
}>()

const badgeLabel = computed(() =>
  props.project.archived ? 'Archived' : `${props.project.taskCount} tasks`,
)
</script>

<template>
  <article :class="{ 'is-selected': selected }" @click="emit('select', project.id)">
    <h3>{{ project.name }}</h3>
    <span class="badge">{{ badgeLabel }}</span>
    <button type="button" @click.stop="emit('archive', project.id)">Archive</button>
  </article>
</template>

<style scoped>
.is-selected {
  outline: 2px solid var(--accent);
}
</style>
```
- `defineProps<T>()` / `defineEmits<T>()` give **compile-time** prop and event types — never the untyped array form.
- Derive, don't duplicate: `badgeLabel` is a `computed`, not a second `ref` you keep in sync.
- The child never writes `props.selected = …`; selection is owned above and flows back down.

## Composables — Reusable Logic (`useX`)
```ts
// src/shared/composables/useDebouncedRef.ts
import { customRef } from 'vue'

/** A ref whose writes are debounced — reusable, no component knows the timer. */
export function useDebouncedRef<T>(initial: T, delayMs = 300) {
  let timer: ReturnType<typeof setTimeout>
  return customRef<T>((track, trigger) => {
    let value = initial
    return {
      get() {
        track()
        return value
      },
      set(next) {
        clearTimeout(timer)
        timer = setTimeout(() => {
          value = next
          trigger()
        }, delayMs)
      },
    }
  })
}
```
- A composable is a plain function that *may* call other composables (`ref`, `computed`, `useQuery`, `onMounted`).
- Return refs/computed/functions — the caller wires them into its own reactive graph.
- **This replaces mixins entirely.** Logic is imported explicitly, so its origin and types are always visible.

## Global Client State — Pinia (Setup Syntax)
```ts
// src/stores/session.store.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useSessionStore = defineStore('session', () => {
  // state
  const token = ref<string | null>(null)
  const userId = ref<string | null>(null)

  // getters
  const isAuthenticated = computed(() => token.value !== null)

  // actions
  function setSession(next: { token: string; userId: string }) {
    token.value = next.token
    userId.value = next.userId
  }
  function clear() {
    token.value = null
    userId.value = null
  }

  return { token, userId, isAuthenticated, setSession, clear }
})
```
- **Setup syntax only** (`defineStore(id, () => {…})`): a `ref` is state, a `computed` is a getter, a function is an action — no options object.
- One store **per client-state concern** (`session`, `ui`, `preferences`), never a single `app` store holding everything.
- Pinia is for state the *client* owns and mutates. Remote data does **not** belong here — see below.

## Server State — TanStack Query (vue-query)
```ts
// src/features/projects/api/projects.api.ts
import { http } from '@/shared/api/http'

export interface Project {
  id: string
  name: string
  taskCount: number
  archived: boolean
}

export const projectsApi = {
  list: () => http.get<Project[]>('/projects'),
  archive: (id: string) => http.post<Project>(`/projects/${id}/archive`),
}
```
```ts
// src/features/projects/composables/useProjects.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { projectsApi } from '../api/projects.api'

const projectsKey = ['projects'] as const

export function useProjects() {
  // Fetching, caching, loading & error flags — all owned by the query cache.
  return useQuery({
    queryKey: projectsKey,
    queryFn: projectsApi.list,
  })
}

export function useArchiveProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: projectsApi.archive,
    // Revalidate the cache — never manually splice a Pinia array.
    onSuccess: () => qc.invalidateQueries({ queryKey: projectsKey }),
  })
}
```
- `useQuery` gives you `data`, `isPending`, `isError`, `refetch` — the server owns the truth, the cache mirrors it.
- Writes go through `useMutation`; after success you **invalidate**, letting the cache re-fetch — no hand-maintained local copy.
- This is *why* server state never lives in Pinia: caching, deduping, staleness and revalidation are already solved here.

## Container / Presentational Split
```vue
<!-- Container: owns data + state, holds NO markup of its own beyond composition -->
<!-- src/features/projects/components/ProjectList.vue -->
<script setup lang="ts">
import { useProjects, useArchiveProject } from '../composables/useProjects'
import ProjectCard from './ProjectCard.vue'

const { data: projects, isPending, isError } = useProjects()
const { mutate: archive } = useArchiveProject()
</script>

<template>
  <p v-if="isPending">Loading…</p>
  <p v-else-if="isError">Could not load projects.</p>
  <ul v-else>
    <!-- Presentational children are dumb: props in, events out -->
    <ProjectCard
      v-for="project in projects"
      :key="project.id"
      :project="project"
      @archive="archive"
    />
  </ul>
</template>
```
- **Container** components talk to composables/stores and pass plain data down.
- **Presentational** components (`ProjectCard`, everything in `shared/components`) take props and emit events — no data fetching, no store access. They are trivially testable and reusable.

## Reactivity — Don't Lose It
```ts
import { storeToRefs } from 'pinia'
import { useSessionStore } from '@/stores/session.store'

const session = useSessionStore()

// ✅ Keep reactivity when pulling state/getters out of a store.
const { userId, isAuthenticated } = storeToRefs(session)

// ✅ Actions are plain functions — destructure them directly.
const { clear } = session

// ❌ const { userId } = session  →  a one-time snapshot, never updates.
```
Destructuring a store (or any `reactive`) copies values and severs the reactive link. Use `storeToRefs` for a store's state/getters and `toRefs` for a `reactive` object; take methods/actions off the object directly.

## Testing (Behavior-Focused)
```ts
// tests/setup.ts
import { afterAll, afterEach, beforeAll } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

export const server = setupServer(
  http.get('*/projects', () =>
    HttpResponse.json([{ id: 'p1', name: 'Apollo', taskCount: 3, archived: false }]),
  ),
)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```
```ts
// src/features/projects/components/ProjectList.test.ts
import { render, screen } from '@testing-library/vue'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createPinia } from 'pinia'
import { userEvent } from '@testing-library/user-event'
import ProjectList from './ProjectList.vue'

function renderWithProviders() {
  return render(ProjectList, {
    global: {
      plugins: [createPinia(), [VueQueryPlugin, { queryClient: new QueryClient() }]],
    },
  })
}

test('renders projects returned by the API and archives on click', async () => {
  renderWithProviders()

  // Assert on what the user sees, not on internal refs.
  expect(await screen.findByText('Apollo')).toBeInTheDocument()

  await userEvent.click(screen.getByRole('button', { name: /archive/i }))
  // …MSW handles the request; assert the resulting UI, never the component instance.
})
```
- **Vitest + Vue Testing Library**: query by role/text like a user; never reach into `vm`, `wrapper.setData`, or private refs.
- **MSW** intercepts network at the boundary — components run their real query/mutation code against fake HTTP, with no fetch mocking.
- Test **behavior** (what renders, what happens on interaction), not implementation details.

## Tooling
- **Build/Dev**: Vite — the only sanctioned dev server and bundler.
- **Language**: TypeScript in strict mode; `vue-tsc` for template type-checking in CI.
- **State**: Pinia (client) + `@tanstack/vue-query` (server) — per the rules above.
- **Linting/Formatting**: ESLint with `eslint-plugin-vue` + `@typescript-eslint`, formatted by Prettier (per base Vue standard).
- **Testing**: Vitest (jsdom) + `@testing-library/vue` + MSW.

## Anti-Patterns (Rejected by This Standard)
- ❌ Options API (`data() {}`, `methods: {}`, `mixins: []`) in new code instead of `<script setup>` + composables.
- ❌ Mutating a prop inside a child (`props.value = …`) instead of emitting an event and letting the owner update state.
- ❌ Storing fetched server data in Pinia and hand-syncing it, instead of caching it with `useQuery`/`useMutation`.
- ❌ Destructuring a store or `reactive` object (`const { x } = store`) and losing reactivity — use `storeToRefs` / `toRefs`.
- ❌ Business logic in templates (heavy expressions, filtering, formatting) instead of a `computed` or composable.
- ❌ One mega-store holding the entire app's state instead of small, per-concern Pinia stores.
