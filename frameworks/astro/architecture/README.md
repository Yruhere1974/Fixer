# Astro Application Architecture

> Deep-dive standard for Astro (TypeScript) apps in the Ummard/Simon ecosystem.
> **Mandate:** every Astro app is **server-first and ships zero JS by default**. Interactivity is added surgically via **islands** with the *minimal* client directive.
> Sprinkling `client:load` on every component — hydrating static markup and treating Astro like a React SPA — is **not** an acceptable baseline. It throws away Astro's entire value proposition (HTML-first, near-zero client bundle) and produces a slower, heavier site than the framework you were escaping.

See [`../README.md`](../README.md) for base Astro conventions (naming, tooling, project layout). This document layers the application architecture on top.

## The Non-Negotiable Rules
1. **Server-first, zero JS by default.** A `.astro` component renders to static HTML on the server and ships **no** client JavaScript. This is the default and the goal — reach for a client island only when a UI genuinely needs browser interactivity.
2. **Islands use the minimal client directive.** Prefer `client:visible` or `client:idle` over `client:load`. Hydrate on interaction, on idle, or on scroll — not eagerly — and never hydrate content that does not need it.
3. **Structured content is type-safe.** All Markdown/MDX/data lives in **Content Collections** with a `zod` schema. Loose `Astro.glob()` over untyped frontmatter is forbidden.
4. **`output` is chosen deliberately.** Default to `output: 'static'` (SSG). Opt into `'server'` (SSR) only where a route needs per-request rendering (auth, personalization, form handling), and add the matching adapter.

Everything below follows from these four rules.

## Prescribed Structure
```text
project_root/
├── src/
│   ├── pages/                     # file-based routing — one route per file
│   │   ├── index.astro
│   │   ├── blog/
│   │   │   ├── index.astro        # collection listing
│   │   │   └── [slug].astro       # dynamic route → getStaticPaths()
│   │   └── api/
│   │       └── subscribe.ts       # endpoint (SSR/hybrid) — GET/POST handlers
│   ├── components/                # PascalCase.astro + framework islands (.tsx/.vue/.svelte)
│   │   ├── Card.astro             # static, zero-JS component
│   │   └── Counter.tsx            # interactive island (hydrated on demand)
│   ├── layouts/
│   │   └── BaseLayout.astro       # shared <html> shell, slots, View Transitions
│   ├── content/
│   │   ├── config.ts              # defineCollection() + zod schemas — the source of truth
│   │   └── blog/                  # a collection: kebab-case.md / .mdx entries
│   │       └── first-post.md
│   ├── lib/                       # framework-agnostic .ts helpers
│   └── styles/
├── public/                        # copied verbatim; never processed
├── astro.config.mjs               # integrations, output mode, adapter
├── tsconfig.json                  # extends astro/tsconfigs/strict
└── package.json
```

## Layouts and Pages
A layout owns the `<html>` shell and exposes a `<slot />`; pages fill it. Frontmatter (the `---` fence) runs **only on the server** at build/request time.

```astro
---
// src/layouts/BaseLayout.astro
import { ClientRouter } from 'astro:transitions';

interface Props {
  title: string;
  description?: string;
}

const { title, description } = Astro.props;
---
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    {description && <meta name="description" content={description} />}
    <ClientRouter />               {/* View Transitions — SPA-like nav, still zero-JS pages */}
  </head>
  <body>
    <slot />                       {/* page content is injected here */}
  </body>
</html>
```

```astro
---
// src/pages/index.astro
import BaseLayout from '../layouts/BaseLayout.astro';
import Card from '../components/Card.astro';
---
<BaseLayout title="Home">
  <h1>Welcome</h1>
  <Card title="Static by default" />   {/* renders to pure HTML, ships no JS */}
</BaseLayout>
```
- Server-only frontmatter can `await` directly — hit the DB, read the filesystem, call `getCollection()`. None of it reaches the client.
- Pass data down via typed `Props`; keep components dumb and presentational.

## Content Collections (Type-Safe)
Content is **defined once** in `src/content/config.ts` with a `zod` schema. The schema is enforced at build time and flows into full TypeScript autocompletion at every query site.

```ts
// src/content/config.ts
import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',                 // Markdown/MDX bodies; use 'data' for pure JSON/YAML
  schema: z.object({
    title: z.string(),
    description: z.string().max(160),
    pubDate: z.coerce.date(),       // frontmatter string → Date
    draft: z.boolean().default(false),
    tags: z.array(z.string()).default([]),
  }),
});

export const collections = { blog };
```

Query collections with `getCollection` — the entries and their `data` are fully typed from the schema:

```astro
---
// src/pages/blog/index.astro
import { getCollection } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';

const posts = (await getCollection('blog', ({ data }) => !data.draft))
  .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
---
<BaseLayout title="Blog">
  <ul>
    {posts.map((post) => (
      <li>
        <a href={`/blog/${post.slug}`}>{post.data.title}</a>
        <time datetime={post.data.pubDate.toISOString()}>
          {post.data.pubDate.toLocaleDateString()}
        </time>
      </li>
    ))}
  </ul>
</BaseLayout>
```

Render a single entry via a dynamic route. `getStaticPaths()` pre-builds one static page per entry (SSG):

```astro
---
// src/pages/blog/[slug].astro
import { getCollection, type CollectionEntry } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';

export async function getStaticPaths() {
  const posts = await getCollection('blog');
  return posts.map((post) => ({
    params: { slug: post.slug },
    props: { post },
  }));
}

type Props = { post: CollectionEntry<'blog'> };
const { post } = Astro.props;
const { Content } = await post.render();
---
<BaseLayout title={post.data.title} description={post.data.description}>
  <article>
    <h1>{post.data.title}</h1>
    <Content />                    {/* compiled Markdown/MDX — still zero client JS */}
  </article>
</BaseLayout>
```

## Interactive Islands
Reach for a framework component **only** where the browser must react to the user. Add the integration (`@astrojs/react`, `@astrojs/svelte`, …) and hydrate with the *least eager* directive that works.

```tsx
// src/components/Counter.tsx  (a React island)
import { useState } from 'react';

export default function Counter({ start = 0 }: { start?: number }) {
  const [count, setCount] = useState(start);
  return <button onClick={() => setCount((c) => c + 1)}>Count: {count}</button>;
}
```

```astro
---
// usage inside any .astro page/component
import Counter from '../components/Counter.tsx';
---
<Counter start={0} client:visible />   {/* hydrates when scrolled into view */}
```

Directive selection — from cheapest to most expensive:

| Directive        | Hydrates when…                    | Use for                                  |
|------------------|-----------------------------------|------------------------------------------|
| *(none)*         | never — static HTML               | the default; anything non-interactive    |
| `client:visible` | element scrolls into viewport     | below-the-fold widgets (preferred)       |
| `client:idle`    | browser is idle                   | low-priority above-the-fold interactivity|
| `client:load`    | immediately on page load          | **only** critical above-the-fold UI      |
| `client:media`   | a media query matches             | interactivity gated on viewport/features |

Props passed to an island must be JSON-serializable — they cross the server→client boundary. Keep islands small: hydrating a whole page tree defeats the architecture.

## SSR Adapter and Endpoints
Switch to server rendering only for routes that need per-request logic. Set `output` and install the matching adapter; leave the rest of the site static with `output: 'hybrid'` (static by default, `export const prerender = false` opts a route into SSR).

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';       // or @astrojs/vercel, @astrojs/cloudflare
import react from '@astrojs/react';

export default defineConfig({
  output: 'hybrid',                       // static by default; opt routes into SSR
  adapter: node({ mode: 'standalone' }),
  integrations: [react()],
});
```

Endpoints live under `src/pages/api/` as `.ts` files exporting per-method handlers typed with `APIRoute`:

```ts
// src/pages/api/subscribe.ts
import type { APIRoute } from 'astro';
import { z } from 'astro:content';

export const prerender = false;           // this route needs the server at request time

const Body = z.object({ email: z.string().email() });

export const POST: APIRoute = async ({ request }) => {
  const parsed = Body.safeParse(await request.json());
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'invalid email' }), { status: 400 });
  }
  // …persist parsed.data.email…
  return new Response(JSON.stringify({ ok: true }), {
    status: 201,
    headers: { 'content-type': 'application/json' },
  });
};
```
- Validate every request body/param with `zod` — never trust client input.
- Keep secrets in `import.meta.env` (server-side); never expose non-`PUBLIC_` env vars to the client.

## View Transitions
Animated, SPA-like navigation without shipping a router bundle: add `<ClientRouter />` (see `BaseLayout` above) once, and Astro cross-fades between pages while keeping each page zero-JS. Persist state across navigations with `transition:persist`, and name shared elements with `transition:name` for morph animations.

```astro
<video transition:persist />                          {/* survives page navigation */}
<img transition:name={`hero-${post.slug}`} src={hero} />  {/* morphs between routes */}
```

## Testing
Unit-test components in isolation with **Vitest** + the **Astro Container API**, which renders a component to a string without a running dev server:

```ts
// src/components/Card.test.ts
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import Card from './Card.astro';

test('Card renders its title', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Card, { props: { title: 'Hello' } });
  expect(html).toContain('Hello');
});
```

```ts
// vitest.config.ts — use Astro's Vite pipeline so .astro imports resolve
import { getViteConfig } from 'astro/config';

export default getViteConfig({ test: { globals: true } });
```

Cover real user flows — hydration, navigation, form submits — with **Playwright** E2E against a built site:

```ts
// e2e/counter.spec.ts
import { expect, test } from '@playwright/test';

test('island hydrates and increments', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /count/i }).click();
  await expect(page.getByRole('button')).toHaveText('Count: 1');
});
```

## Tooling
- **Framework**: Astro 4+ with `output` chosen per the rules above; adapter only when SSR is used.
- **Language**: TypeScript in **strict** mode — `tsconfig.json` extends `astro/tsconfigs/strict`.
- **Linting/Formatting**: ESLint (`eslint-plugin-astro`) + Prettier with `prettier-plugin-astro`.
- **Testing**: Vitest + Astro Container API for components; Playwright for E2E.
- **Content**: Content Collections with `zod` schemas — validated at build via `astro check`.

## Anti-Patterns (Rejected by This Standard)
- ❌ `client:load` as the default directive on every component (eager hydration you never needed).
- ❌ Hydrating static, non-interactive content — shipping JS to render markup the server already produced.
- ❌ Pulling a large framework + component tree into the client and calling it an island (bundle bloat).
- ❌ Using Astro as a full client-side SPA (global stores, client routing, everything `client:*`) instead of server-first pages with small islands.
- ❌ Untyped content via `Astro.glob()` / loose frontmatter instead of `defineCollection()` + `zod` Content Collections.
- ❌ `output: 'server'` for a wholly static site (per-request rendering with nothing to personalize), or SSR routes with unvalidated input.
