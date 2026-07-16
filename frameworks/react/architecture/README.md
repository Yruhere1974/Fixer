# React Application Architecture

> Deep-dive standard for React apps (TypeScript + Vite) in the Ummard/Simon ecosystem.
> **Mandate:** server state is fetched and cached with **TanStack Query**, client state is kept minimal, and features are organized in **feature-based folders**.
> Fetching data inside `useEffect`, drilling props through intermediate components, and storing **server state in a global client store** (Redux/Zustand) are **not** acceptable — they produce race conditions, stale caches, unmemoized re-renders, and untestable spaghetti.

See [`../README.md`](../README.md) for base React conventions (naming, tooling, Rules of Hooks). This document layers the application architecture on top.

## The Non-Negotiable Rules
1. **Server state ≠ client state.** Anything that lives on a server (users, posts, orders) is fetched, cached, and revalidated through **TanStack Query** — **never** copied into Redux/Zustand/`useState`. The cache *is* your source of truth.
2. **Client state is minimal.** Only genuine UI/session state (theme, modal open, wizard step, auth token) lives in a client store — **Zustand** for global, **Context** for scoped, `useState` for local.
3. **Components are thin; logic lives in hooks.** JSX renders; custom hooks own data fetching, mutations, and derivation. A component is a template, not a controller.
4. **Never fetch in `useEffect`.** Data fetching goes through a Query hook. `useEffect` is for synchronizing with *external* non-React systems (subscriptions, DOM APIs) — not for loading data or computing derived values.

Everything below follows from these four rules.

## Prescribed Structure
```text
project_root/
├── src/
│   ├── app/                         # composition root — wiring, not features
│   │   ├── App.tsx                  # provider stack + <RouterProvider>
│   │   ├── router.tsx               # route tree (React Router)
│   │   ├── query-client.ts          # single QueryClient instance
│   │   └── providers.tsx            # QueryClientProvider, ThemeProvider, …
│   ├── features/                    # one folder per domain — self-contained
│   │   ├── auth/
│   │   │   ├── components/          # LoginForm.tsx (feature-scoped UI)
│   │   │   ├── hooks/               # useLogin.ts, useCurrentUser.ts
│   │   │   ├── api/                 # auth.api.ts (fetchers) + queries.ts (keys/options)
│   │   │   ├── schemas.ts           # Zod schemas + inferred types
│   │   │   └── store.ts             # Zustand slice IF this feature needs client state
│   │   └── projects/
│   │       ├── components/
│   │       ├── hooks/
│   │       └── api/
│   ├── shared/                      # cross-feature, domain-agnostic
│   │   ├── ui/                      # Button, Input, Card — pure presentational
│   │   ├── hooks/                   # useDebounce, useMediaQuery
│   │   ├── lib/                     # http client, formatters
│   │   └── types/
│   └── main.tsx                     # ReactDOM.createRoot(...).render(<App />)
├── src/test/                        # setup.ts, MSW handlers + server
├── public/
├── package.json
├── tsconfig.json                    # "strict": true
├── vite.config.ts
└── .env.example                     # documented VITE_* vars, NO secrets
```
- **Features own their slice of everything** (UI, hooks, API, schemas). A feature never reaches into another feature's internals — cross-feature code lives in `shared/`.
- `app/` is the only place providers and routes are wired. `shared/ui` holds presentational primitives with zero domain knowledge.

## The Composition Root
```tsx
// src/app/query-client.ts
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
  },
});
```
```tsx
// src/app/providers.tsx
import { QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { queryClient } from "./query-client";

export function AppProviders({ children }: PropsWithChildren) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
```
```tsx
// src/app/App.tsx
import { RouterProvider } from "react-router-dom";
import { AppProviders } from "./providers";
import { router } from "./router";

export function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
}
```
One `QueryClient`, created once, provided at the root. The cache it owns is the app's server-state source of truth.

## Server State — TanStack Query
The fetcher is a plain, testable async function. Query *options* (key + fn) are colocated and reused so keys never drift.
```ts
// src/features/projects/api/projects.api.ts
import type { Project } from "../schemas";
import { http } from "@/shared/lib/http";

export const listProjects = () => http.get<Project[]>("/projects");
export const createProject = (input: { name: string }) =>
  http.post<Project>("/projects", input);
```
```ts
// src/features/projects/api/queries.ts
import { queryOptions } from "@tanstack/react-query";
import { listProjects } from "./projects.api";

export const projectKeys = {
  all: ["projects"] as const,
  list: () => [...projectKeys.all, "list"] as const,
};

export const projectsQuery = () =>
  queryOptions({ queryKey: projectKeys.list(), queryFn: listProjects });
```
```ts
// src/features/projects/hooks/useProjects.ts
import { useQuery } from "@tanstack/react-query";
import { projectsQuery } from "../api/queries";

export function useProjects() {
  return useQuery(projectsQuery()); // { data, isPending, isError, ... }
}
```
### Mutations + invalidation
A mutation writes, then **invalidates** the affected query so the cache refetches. No manual state syncing.
```ts
// src/features/projects/hooks/useCreateProject.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createProject } from "../api/projects.api";
import { projectKeys } from "../api/queries";

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectKeys.all }); // cache is the source of truth
    },
  });
}
```
- **Never** `useEffect(() => { fetch(...).then(setState) }, [])`. That reinvents caching, dedup, retries, and cancellation — badly.
- **Never** stash `data` from a query into `useState`/Zustand. Read it from the query; it stays fresh automatically.

## Client State — Zustand (minimal)
Only for state the server does not own. Keep stores small and per-concern.
```ts
// src/features/auth/store.ts
import { create } from "zustand";

interface AuthState {
  token: string | null;
  setToken: (token: string | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  setToken: (token) => set({ token }),
}));
```
```ts
// selector subscribes to a slice — component re-renders only when `token` changes
const token = useAuthStore((s) => s.token);
```
For state scoped to a subtree (not truly global), prefer **Context** over Zustand; for state used by one component, prefer `useState`. Reach for a global store last, not first.

## Forms — React Hook Form + Zod
The Zod schema is the single source of validation *and* types.
```tsx
// src/features/auth/components/LoginForm.tsx
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "At least 8 characters"),
});
type LoginValues = z.infer<typeof schema>;

export function LoginForm({ onSubmit }: { onSubmit: (values: LoginValues) => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(schema) });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <input aria-label="Email" type="email" {...register("email")} />
      {errors.email && <p role="alert">{errors.email.message}</p>}

      <input aria-label="Password" type="password" {...register("password")} />
      {errors.password && <p role="alert">{errors.password.message}</p>}

      <button type="submit" disabled={isSubmitting}>
        Log in
      </button>
    </form>
  );
}
```
Uncontrolled inputs via `register` avoid a re-render per keystroke. Validate with the schema — never hand-rolled `if` chains in the submit handler.

## Container / Presentational Split
Logic hooks feed **pure presentational** components. The presentational component knows nothing about the network.
```tsx
// presentational — pure, trivially testable, reusable
export function ProjectList({ projects }: { projects: Project[] }) {
  return (
    <ul>
      {projects.map((p) => (
        <li key={p.id}>{p.name}</li>
      ))}
    </ul>
  );
}
```
```tsx
// container — wires the hook to the view, owns loading/error branches
import { useProjects } from "../hooks/useProjects";
import { ProjectList } from "./ProjectList";

export function ProjectListContainer() {
  const { data, isPending, isError } = useProjects();

  if (isPending) return <Spinner />;
  if (isError) return <ErrorState />;
  return <ProjectList projects={data} />;
}
```

## Routing — React Router
Routes live in `app/router.tsx`; feature containers are the route elements. Code-split large routes with `lazy`.
```tsx
// src/app/router.tsx
import { createBrowserRouter } from "react-router-dom";
import { RootLayout } from "@/shared/ui/RootLayout";
import { ProjectListContainer } from "@/features/projects/components/ProjectListContainer";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <ProjectListContainer /> },
      {
        path: "settings",
        lazy: async () => {
          const { SettingsPage } = await import("@/features/settings/components/SettingsPage");
          return { Component: SettingsPage };
        },
      },
    ],
  },
]);
```

## Testing (Behavior, Not Implementation)
Test what a user sees and does. Render the component, drive it via role/label queries, assert on output. **Mock the network with MSW** — never mock your own hooks or the query client.
```ts
// src/test/server.ts
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

export const server = setupServer(
  http.get("*/projects", () => HttpResponse.json([{ id: "1", name: "Apollo" }])),
);
```
```ts
// src/test/setup.ts
import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "./server";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```
```tsx
// src/features/projects/components/ProjectListContainer.test.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { ProjectListContainer } from "./ProjectListContainer";

function renderWithClient(ui: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

test("renders projects returned by the API", async () => {
  renderWithClient(<ProjectListContainer />);
  expect(await screen.findByText("Apollo")).toBeInTheDocument();
});
```
- Query by **role/label/text** (what the user perceives), not by `data-testid` or component internals.
- A fresh `QueryClient` with `retry: false` per test → isolated, deterministic caches.

## Tooling
- **Build/Dev**: Vite (fast HMR, native ESM). Never eject to a bespoke Webpack config.
- **Language**: TypeScript with `"strict": true` — no implicit `any`, no non-null `!` as a habit.
- **Server state**: TanStack Query. **Client state**: Zustand / Context. **Forms**: React Hook Form + Zod.
- **Routing**: React Router.
- **Linting/Formatting**: ESLint + Prettier (per base React standard).
- **Testing**: Vitest + React Testing Library; **MSW** for network mocking.

## Anti-Patterns (Rejected by This Standard)
- ❌ Fetching in `useEffect` + `useState` instead of a TanStack Query hook (races, no caching, no cancellation).
- ❌ Storing server data in Redux/Zustand/Context instead of the query cache (stale data, manual invalidation hell).
- ❌ Prop drilling through 3+ layers instead of composition (`children`) or Context.
- ❌ Giant "god" components mixing fetching, mutation, form logic, and layout — split into hooks + presentational pieces.
- ❌ Business logic embedded in JSX instead of custom hooks / pure functions.
- ❌ `useEffect` to compute derived state (`setFullName(first + last)`) — derive it during render, memoize only if measured hot.
- ❌ Testing implementation details (hook internals, state, `data-testid` soup) instead of user-visible behavior.
