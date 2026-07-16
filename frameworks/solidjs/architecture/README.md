# Solid.js Application Architecture

> Deep-dive standard for Solid.js + SolidStart apps in the Ummard/Simon ecosystem.
> **Mandate:** components are **setup functions that run exactly once** — reactivity lives in signals and stores, never in re-execution.
> Destructuring `props` is **not** acceptable (it reads values once and severs reactivity), and treating signals like React `useState` is a category error — Solid components **do not re-run**, so nothing "re-renders." Code that assumes a render loop is rejected outright.

See [`../README.md`](../README.md) for base Solid conventions (naming, tooling). This document layers the application architecture on top.

## The Non-Negotiable Rules
1. **Components run once.** The function body is setup. It executes a single time to build the reactive graph; only the fine-grained subscriptions inside it re-run.
2. **Never destructure `props`.** Access `props.x` directly (or use `splitProps`/`mergeProps`). Destructuring reads the value at setup time and breaks tracking.
3. **State is signals and stores** — `createSignal` for atoms, `createStore` for nested/object state. Derived values are `createMemo`, never `createEffect`.
4. **Async data is a resource.** Use `createResource` in client-only code; use SolidStart's `query` + `createAsync` for router-integrated, SSR-friendly loading.
5. **Control flow is components.** Render lists with `<For>`, branches with `<Show>`/`<Switch>` — never `.map()` or ternaries in JSX (they discard keying and re-create DOM).

Everything below follows from these five rules.

## Prescribed Structure
```text
project_root/
├── src/
│   ├── routes/                     # SolidStart file-based routing — path = file path
│   │   ├── index.tsx               # "/"
│   │   ├── about.tsx               # "/about"
│   │   ├── users/
│   │   │   ├── [id].tsx            # "/users/:id" — dynamic segment
│   │   │   └── index.tsx           # "/users"
│   │   └── api/
│   │       └── health.ts           # server route (GET/POST handlers)
│   ├── components/                 # reusable, route-agnostic UI (PascalCase.tsx)
│   │   ├── UserCard.tsx
│   │   └── ui/                      # primitives (Button, Dialog…)
│   ├── lib/                        # non-UI logic
│   │   ├── queries.ts              # query() definitions (data access)
│   │   ├── primitives/             # custom reactive primitives (createXxx)
│   │   └── db.ts
│   ├── app.tsx                     # root: <Router> + <Suspense> shell
│   ├── app.css
│   └── entry-client.tsx / entry-server.tsx   # SolidStart entrypoints
├── public/
├── app.config.ts                   # SolidStart config
├── package.json
├── tsconfig.json
└── vite.config.ts                  # (or configured via app.config.ts)
```
- **One component per file**, named `PascalCase.tsx`.
- Data access (`query`) lives in `src/lib`, not inline in routes — routes compose, `lib` fetches.
- Custom reactive logic is extracted into `createXxx` primitives under `lib/primitives`.

## Components Run Once
```tsx
// src/components/Counter.tsx
import { createSignal, createMemo, type Component } from "solid-js";

export const Counter: Component<{ start?: number }> = (props) => {
  // This body runs ONCE. `count` is a getter; calling it subscribes the reader.
  const [count, setCount] = createSignal(props.start ?? 0);

  // Derived state — recomputes ONLY when `count` changes. Never a createEffect.
  const doubled = createMemo(() => count() * 2);

  const increment = () => setCount((c) => c + 1);

  return (
    <button type="button" onClick={increment}>
      {count()} × 2 = {doubled()}   {/* reads re-run in place; the component does not */}
    </button>
  );
};
```
- `count` is a **function**. `count()` reads and subscribes; `setCount(v)` writes.
- The JSX expression `{count()}` is the fine-grained subscription — only that text node updates.
- `props.start` is read directly. `const { start } = props` would capture the initial value and never react to changes.

## Nested State with `createStore`
```tsx
// src/components/ProfileEditor.tsx
import { createStore, produce } from "solid-js/store";
import { For, type Component } from "solid-js";

interface Profile {
  name: string;
  address: { city: string; zip: string };
  tags: string[];
}

export const ProfileEditor: Component = () => {
  const [profile, setProfile] = createStore<Profile>({
    name: "Ada",
    address: { city: "London", zip: "EC1" },
    tags: ["admin"],
  });

  // Path syntax — only subscribers of `address.city` update.
  const rename = () => setProfile("address", "city", "Paris");

  // `produce` for imperative, mutation-style updates on a draft.
  const addTag = (tag: string) =>
    setProfile(produce((p) => void p.tags.push(tag)));

  return (
    <form>
      <input
        value={profile.name}
        onInput={(e) => setProfile("name", e.currentTarget.value)}
      />
      <p>{profile.address.city}</p>
      <button type="button" onClick={rename}>Move to Paris</button>
      <button type="button" onClick={() => addTag("editor")}>Add tag</button>
      <ul>
        <For each={profile.tags}>{(tag) => <li>{tag}</li>}</For>
      </ul>
    </form>
  );
};
```
- **`createStore` for objects/arrays**, `createSignal` for atomic values. Stores give per-property fine-grained tracking; a signal holding an object does not.
- Update via the path setter (`setProfile("address", "city", v)`) or `produce` — never replace the whole store when you mean to change one field.

## Async Data — `createResource`
```tsx
// src/components/UserView.tsx  (client-driven fetching)
import { createSignal, createResource, Suspense, Show, type Component } from "solid-js";

async function fetchUser(id: number): Promise<{ id: number; name: string }> {
  const res = await fetch(`/api/users/${id}`);
  if (!res.ok) throw new Error(`user ${id}: ${res.status}`);
  return res.json();
}

export const UserView: Component = () => {
  const [id, setId] = createSignal(1);
  // Source signal drives refetch: whenever `id` changes, the resource re-fetches.
  const [user] = createResource(id, fetchUser);

  return (
    <Suspense fallback={<p>Loading…</p>}>
      <Show when={user()} fallback={<p>No user</p>}>
        {(u) => <h1>{u().name}</h1>}
      </Show>
      <button type="button" onClick={() => setId((n) => n + 1)}>Next</button>
    </Suspense>
  );
};
```

### SolidStart: `query` + `createAsync`
For router-integrated, SSR-safe, dedupable data prefer **`query`** (defines a cached, keyed data function) with **`createAsync`** (consumes it inside a `Suspense` boundary). This is the standard for route data.
```tsx
// src/lib/queries.ts
import { query } from "@solidjs/router";

export const getUser = query(async (id: string) => {
  "use server"; // runs on the server; the client calls it via RPC
  const user = await db.user.findUnique({ where: { id } });
  return user;
}, "user"); // cache key prefix — enables dedup + revalidation
```
```tsx
// src/routes/users/[id].tsx
import { createAsync, useParams, type RouteDefinition } from "@solidjs/router";
import { Suspense, Show } from "solid-js";
import { getUser } from "~/lib/queries";

// Preload on navigation/hover for instant transitions.
export const route = {
  preload: ({ params }) => getUser(params.id),
} satisfies RouteDefinition;

export default function UserPage() {
  const params = useParams();
  const user = createAsync(() => getUser(params.id)); // reactive, Suspense-aware

  return (
    <Suspense fallback={<p>Loading…</p>}>
      <Show when={user()}>{(u) => <h1>{u().name}</h1>}</Show>
    </Suspense>
  );
}
```
- `createResource` = local/imperative fetching. `query` + `createAsync` = router-aware fetching with caching, dedup, preloading and SSR.
- Both integrate with `<Suspense>`; read the resource **inside** a Suspense boundary.

## Control Flow & Props
```tsx
// src/components/UserList.tsx
import { For, Show, Switch, Match, splitProps, mergeProps, type Component } from "solid-js";

interface User { id: number; name: string; role: "admin" | "member" }

export const UserList: Component<{
  users: User[];
  heading?: string;
  onSelect: (u: User) => void;
}> = (rawProps) => {
  // mergeProps: reactive defaults without destructuring.
  const props = mergeProps({ heading: "Users" }, rawProps);
  // splitProps: partition while KEEPING reactivity (never `const { a } = props`).
  const [local, rest] = splitProps(props, ["users", "heading"]);

  return (
    <section>
      <h2>{local.heading}</h2>

      {/* <Show> instead of `cond && <…>` or a ternary */}
      <Show when={local.users.length > 0} fallback={<p>No users.</p>}>
        {/* <For> is keyed by reference — rows are NOT re-created on reorder */}
        <For each={local.users}>
          {(user) => (
            <button type="button" onClick={() => rest.onSelect(user)}>
              {user.name}
              <Switch fallback={<span> (member)</span>}>
                <Match when={user.role === "admin"}>
                  <span> (admin)</span>
                </Match>
              </Switch>
            </button>
          )}
        </For>
      </Show>
    </section>
  );
};
```
- `<For>` keys by item identity; use `<Index>` only when the value at a position changes but the position is stable.
- `splitProps`/`mergeProps` are the **only** sanctioned ways to "spread" or default props — plain destructuring is banned.
- Access `local.heading`/`rest.onSelect` as properties so each read stays a live subscription.

## Testing
```tsx
// src/components/Counter.test.tsx
import { render, fireEvent, screen } from "@solidjs/testing-library";
import { describe, it, expect } from "vitest";
import { Counter } from "./Counter";

describe("Counter", () => {
  it("increments and derives doubled", async () => {
    render(() => <Counter start={2} />);

    const btn = screen.getByRole("button");
    expect(btn).toHaveTextContent("2 × 2 = 4");

    await fireEvent.click(btn);
    expect(btn).toHaveTextContent("3 × 2 = 6");
  });
});
```
- **Vitest** + **@solidjs/testing-library**; pass a component *factory* (`() => <Counter/>`), matching how Solid mounts.
- Assert observable DOM after `fireEvent`, not internal signal values — behavior over implementation.
- Configure Vitest with `jsdom` and the `solid` Vite plugin (via `vite-plugin-solid`) so JSX compiles correctly under test.

## Tooling
- **Meta-framework**: SolidStart (file routing, SSR, server functions) on **Vite**.
- **Language**: TypeScript — components typed with `Component<Props>`, props interfaces exported.
- **Linting/Formatting**: ESLint with **eslint-plugin-solid** (catches destructured props, reactivity mistakes) + Prettier.
- **Testing**: Vitest + @solidjs/testing-library, jsdom environment.
- **Data**: `query`/`createAsync` for route data; `createResource` for local async.

## Anti-Patterns (Rejected by This Standard)
- ❌ Destructuring props: `const { name } = props` — captures the value once, breaks reactivity. Use `props.name` / `splitProps`.
- ❌ Treating signals as React state that triggers a re-render — the component body runs **once**; there is no render loop to hook into.
- ❌ `array.map(...)` or ternaries in JSX for lists/branches instead of `<For>` / `<Show>` / `<Switch>` (loses keying, re-creates DOM).
- ❌ Reading a signal outside a tracking scope (e.g. in the component body, not inside JSX/`createMemo`/`createEffect`) and expecting it to stay current — it won't update.
- ❌ Using `createEffect` to compute derived state (`createEffect(() => setX(a() + b()))`) instead of `createMemo` — creates extra renders, glitches, and manual sync bugs.
- ❌ Storing nested objects in a `createSignal` and mutating them — no fine-grained tracking; use `createStore`.
