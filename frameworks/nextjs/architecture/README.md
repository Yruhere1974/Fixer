# Next.js Application Architecture

> Deep-dive standard for Next.js apps (App Router, TypeScript) in the Ummard/Simon ecosystem.
> **Mandate:** every route tree is **Server Components by default**; `"use client"` is pushed to the **leaves**, data is fetched in **RSC / Server Actions**, and mutations run through **Server Actions**.
> A `"use client"` directive at the top of the tree, fetching data in a client `useEffect`, or leaking a secret into a client component is **not** an acceptable baseline — it ships your data layer and credentials to the browser, kills streaming/caching, and forfeits the entire point of the App Router.

See [`../README.md`](../README.md) for base Next.js conventions (naming, tooling, project structure). This document layers the App Router architecture on top.

## The Non-Negotiable Rules
1. **Server Components by default** — a file is a Server Component unless it *needs* the browser. Do not add `"use client"` speculatively.
2. **`"use client"` lives at the LEAVES** — mark the smallest interactive island (a button, a form field, a chart), never a `layout.tsx` / `page.tsx` at the root of a subtree.
3. **Data is fetched in RSC or Server Actions** — never in a client `useEffect`. The component that renders the data `await`s it directly.
4. **Mutations go through Server Actions** (`"use server"`) — not client-side `fetch` to hand-rolled endpoints. Server Actions own writes and their cache invalidation.
5. **Secrets stay server-side** — anything sensitive is read from `process.env` inside Server Components/Actions/Route Handlers. Only `NEXT_PUBLIC_*` values ever reach the client.

Everything below follows from these five rules.

## Prescribed Structure
```text
project_root/
├── src/
│   ├── app/                              # App Router — Server Components by default
│   │   ├── layout.tsx                    # root layout (Server Component)
│   │   ├── page.tsx                      # "/" — async RSC, fetches its own data
│   │   ├── loading.tsx                   # route-level Suspense fallback
│   │   ├── error.tsx                     # "use client" — error boundary (required client)
│   │   ├── not-found.tsx
│   │   ├── dashboard/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx                   # async RSC
│   │   │   ├── loading.tsx
│   │   │   └── _components/               # route-colocated UI (underscore = not a route)
│   │   │       ├── revenue-card.tsx       # Server Component
│   │   │       └── refresh-button.tsx     # "use client" island
│   │   └── api/
│   │       └── webhooks/stripe/
│   │           └── route.ts               # Route Handler — third-party callers ONLY
│   ├── features/                          # domain logic, framework-agnostic where possible
│   │   └── invoices/
│   │       ├── actions.ts                 # "use server" — mutations for this domain
│   │       ├── queries.ts                 # server-only data reads (import "server-only")
│   │       └── schema.ts                  # Zod schemas / types
│   ├── lib/
│   │   ├── db.ts                          # DB client (server-only)
│   │   └── env.ts                         # typed, validated env at startup
│   └── styles/
├── public/
├── e2e/                                   # Playwright specs
├── next.config.ts
├── tsconfig.json
├── vitest.config.ts
├── .env.example                           # documented env vars, NO secrets
└── .gitignore
```

## Async Server Component (fetch where you render)
```tsx
// src/app/dashboard/page.tsx  — no "use client"; this runs on the server
import { getRevenue } from "@/features/invoices/queries";
import { RevenueCard } from "./_components/revenue-card";
import { RefreshButton } from "./_components/refresh-button";

export default async function DashboardPage() {
  const revenue = await getRevenue();          // await data directly — no useEffect, no loading state
  return (
    <section>
      <h1>Dashboard</h1>
      <RevenueCard revenue={revenue} />        {/* Server Component, gets data as props */}
      <RefreshButton />                        {/* tiny client island */}
    </section>
  );
}
```
```ts
// src/features/invoices/queries.ts
import "server-only";                          // build error if this is ever imported client-side
import { db } from "@/lib/db";

export async function getRevenue() {
  return db.invoice.aggregate({ _sum: { amountCents: true } });
}
```
- The component that displays data **fetches** the data. No prop-drilling a fetch from a client parent.
- `import "server-only"` is a tripwire: it fails the build if query code leaks into a client bundle.

## Client Island (`"use client"` at the leaf)
```tsx
// src/app/dashboard/_components/refresh-button.tsx
"use client";                                   // smallest possible interactive unit

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function RefreshButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => router.refresh())}
    >
      {pending ? "Refreshing…" : "Refresh"}
    </button>
  );
}
```
- `"use client"` marks a **boundary**: this file and everything it imports ship to the browser. Keep that surface tiny.
- A client component may receive Server Components as `children`/props — compose, don't convert the whole subtree.

## Server Action (mutations + revalidation)
```ts
// src/features/invoices/actions.ts
"use server";

import { revalidateTag, revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { invoiceSchema } from "./schema";

export async function createInvoice(formData: FormData) {
  const parsed = invoiceSchema.parse({
    customerId: formData.get("customerId"),
    amountCents: Number(formData.get("amountCents")),
  });

  await db.invoice.create({ data: parsed });    // secret DB creds never leave the server

  revalidateTag("invoices");                     // bust cached reads tagged "invoices"
  revalidatePath("/dashboard");                  // …and re-render this route
  redirect("/dashboard");
}
```
```tsx
// usage — a plain <form>, progressively enhanced, works without JS
import { createInvoice } from "@/features/invoices/actions";

export function NewInvoiceForm() {
  return (
    <form action={createInvoice}>
      <input name="customerId" required />
      <input name="amountCents" type="number" required />
      <button type="submit">Create</button>
    </form>
  );
}
```
- Every mutation is a Server Action. **Validate input** (Zod) at the boundary — a Server Action is a public endpoint.
- The Action owns invalidation: `revalidateTag` for tagged data, `revalidatePath` for a route. Pair tags with fetches (see caching).

## Route Handler (`route.ts`) — for third-party callers only
```ts
// src/app/api/webhooks/stripe/route.ts
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";

export async function POST(req: Request) {
  const sig = (await headers()).get("stripe-signature")!;
  const event = stripe.webhooks.constructEvent(
    await req.text(),
    sig,
    process.env.STRIPE_WEBHOOK_SECRET!,          // server-only secret
  );
  // …handle event
  return Response.json({ received: true });
}
```
- Route Handlers exist for callers **outside** your app: webhooks, OAuth callbacks, public REST/JSON APIs, cron.
- Do **not** build a Route Handler just so your own RSC can `fetch` it — call the query function directly (see Anti-Patterns).

## Suspense Streaming
```tsx
// src/app/dashboard/page.tsx
import { Suspense } from "react";
import { RevenueCard } from "./_components/revenue-card";
import { RevenueSkeleton } from "./_components/revenue-skeleton";

export default function DashboardPage() {
  return (
    <section>
      <h1>Dashboard</h1>
      {/* shell renders instantly; RevenueCard streams in when its await resolves */}
      <Suspense fallback={<RevenueSkeleton />}>
        <RevenueCard />                          {/* async Server Component fetching internally */}
      </Suspense>
    </section>
  );
}
```
- `loading.tsx` is a Suspense boundary for the whole route; explicit `<Suspense>` streams **parts** of a page independently.
- Slow data goes behind its own boundary so the rest of the page is not blocked.

## The Caching Model (know it, don't fight it)
```ts
// tag a fetch so a Server Action can revalidate it precisely
const res = await fetch("https://api.example.com/rates", {
  next: { tags: ["rates"], revalidate: 3600 },   // ISR: revalidate hourly, or on revalidateTag("rates")
});

// opt a fetch out of caching when you need per-request freshness
await fetch(url, { cache: "no-store" });
```
- **Request memoization** dedupes identical `fetch`es within one render pass — fetch freely where you need data.
- **Data Cache**: `fetch` results persist across requests; control with `revalidate` (time) + `tags` (on-demand).
- **Full Route Cache**: static routes are cached at build; a dynamic API (`cookies()`, `headers()`, `no-store`) opts a route into dynamic rendering.
- Choose a strategy per fetch **deliberately**. "Everything `no-store`" and "never invalidate" are both defects.

## Testing
- **Client components** (islands, hooks): **Vitest** (or Jest) + **React Testing Library** — render the island, assert on interaction.
```tsx
// refresh-button.test.tsx
import { render, screen } from "@testing-library/react";
import { RefreshButton } from "./refresh-button";

test("renders refresh button", () => {
  render(<RefreshButton />);
  expect(screen.getByRole("button", { name: /refresh/i })).toBeInTheDocument();
});
```
- **Server Components & Server Actions**: exercise them through **Playwright E2E**. Async RSCs and Actions run against the real server pipeline (streaming, caching, redirects) that a unit renderer cannot reproduce — drive the actual page.
```ts
// e2e/dashboard.spec.ts
import { test, expect } from "@playwright/test";

test("dashboard shows revenue", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
});
```
- Pure domain logic in `features/*/queries.ts` (the DB call aside) is unit-testable directly.

## Tooling
- **Framework**: Next.js (App Router) — the only supported router for new apps.
- **Language**: TypeScript in **strict** mode (`"strict": true` in `tsconfig.json`).
- **Linting/Formatting**: `eslint-config-next` + Prettier (per base Next.js standard).
- **Env**: typed and validated at startup (`src/lib/env.ts`); only `NEXT_PUBLIC_*` is exposed to the client.
- **Testing**: Vitest/Jest + React Testing Library (client units) and Playwright (E2E, incl. Server Components/Actions).

## Anti-Patterns (Rejected by This Standard)
- ❌ `"use client"` at the root of a route/layout, turning an entire subtree into a client bundle.
- ❌ Fetching data in a client `useEffect` + `useState` instead of `await`ing it in a Server Component.
- ❌ Reading secrets (API keys, DB URLs) in a client component, or exposing them via anything other than `NEXT_PUBLIC_*`.
- ❌ Mutating via client `fetch` to a hand-rolled endpoint instead of a Server Action with `revalidateTag`/`revalidatePath`.
- ❌ Over-fetching with no caching strategy — every `fetch` on `no-store`, or no `tags`/`revalidate` and no way to invalidate.
- ❌ Calling your own internal Route Handler from an RSC (`fetch("/api/…")`) instead of importing and calling the query function directly.
