# Ember.js Application Architecture

> Deep-dive standard for Ember.js **Octane** apps (Ember 5.x, TypeScript + Glint) in the Ummard/Simon ecosystem.
> **Mandate:** every non-trivial Ember app is built on **Octane idioms only** — Glimmer components with `@tracked` state, shared state in `@service`, data loaded in route `model` hooks, and DOM side effects in **modifiers**.
> Classic-era patterns are **not** an acceptable baseline: no observers, no `Ember.computed`/`Ember.Object` sprawl, no jQuery or direct DOM manipulation, and **no business logic in controllers**. These are untestable, hide data flow behind implicit invalidation, and fight the reactivity model.

See [`../README.md`](../README.md) for base Ember conventions (naming, tooling). This document layers the Octane application architecture on top.

## The Non-Negotiable Rules
1. **Components are Glimmer components** (`@glimmer/component`) with state as `@tracked` fields and event handlers as `@action`. No `Ember.Component`, no observers, no lifecycle-hook data massaging.
2. **Shared/cross-component state lives in a service**, instantiated as a singleton and consumed via `@service`. Components never reach into each other.
3. **Route `model` hooks load data** (via Ember Data or `fetch`); templates render what the route resolved. Data fetching does not happen in components.
4. **DOM side effects go in modifiers** (`ember-modifier`), never observers, `didInsertElement` massaging, or jQuery.
5. **Controllers hold only query params and derived display state** — never business logic, never data mutation orchestration. Prefer route + service; reach for a controller only when you need query params.

Everything below follows from these rules.

## Prescribed Structure
```text
project_root/
├── app/
│   ├── app.ts
│   ├── router.ts                       # Router.map — URL → route
│   ├── components/                      # Glimmer components (.ts) + templates (.hbs)
│   │   ├── user-card.ts
│   │   ├── user-card.hbs
│   │   └── user-avatar.hbs             # template-only presentational component
│   ├── routes/                          # route classes — model() hooks live here
│   │   └── users.ts
│   ├── controllers/                     # query params + display state ONLY
│   │   └── users.ts
│   ├── templates/                       # route-level templates
│   │   ├── application.hbs
│   │   └── users.hbs
│   ├── services/                        # singleton shared state / cross-cutting logic
│   │   └── session.ts
│   ├── models/                          # Ember Data models
│   │   └── user.ts
│   ├── adapters/                        # Ember Data adapters (host/headers/URL shape)
│   │   └── application.ts
│   ├── serializers/                     # Ember Data serializers (payload normalization)
│   │   └── application.ts
│   ├── modifiers/                       # DOM side-effect modifiers
│   │   └── autofocus.ts
│   ├── helpers/                         # pure template helpers
│   └── styles/
├── tests/
│   ├── integration/components/          # rendering tests (setupRenderingTest)
│   ├── unit/                            # services/models (setupTest)
│   ├── acceptance/                      # application tests (setupApplicationTest)
│   └── test-helper.ts
├── types/                               # Glint/ambient types (glint env, registries)
├── ember-cli-build.js
├── tsconfig.json
├── .template-lintrc.js
├── .eslintrc.js
├── package.json
└── .gitignore
```

## Glimmer Component (`@tracked` + `@action`)
```typescript
// app/components/user-card.ts
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { service } from '@ember/service';
import type SessionService from 'my-app/services/session';
import type UserModel from 'my-app/models/user';

interface UserCardSignature {
  Args: {
    user: UserModel;
    onSelect?: (user: UserModel) => void;
  };
}

export default class UserCard extends Component<UserCardSignature> {
  @service declare session: SessionService;

  @tracked expanded = false;               // local UI state — tracked, not a controller

  // Derived state is a plain getter — it recomputes from tracked deps. NO @computed.
  get isCurrentUser(): boolean {
    return this.session.currentUserId === this.args.user.id;
  }

  @action
  toggle(): void {
    this.expanded = !this.expanded;        // reassign tracked field to invalidate
  }

  @action
  select(): void {
    this.args.onSelect?.(this.args.user);  // callback up, not mutate down
  }
}
```
```handlebars
{{! app/components/user-card.hbs }}
<article class="user-card" {{on "click" this.select}}>
  <UserAvatar @user={{@user}} />
  <h3>{{@user.name}}{{#if this.isCurrentUser}} (you){{/if}}</h3>

  <button type="button" {{on "click" this.toggle}}>
    {{if this.expanded "Hide" "Details"}}
  </button>

  {{#if this.expanded}}
    <p>{{@user.email}}</p>
  {{/if}}
</article>
```
- Args are read-only inbound (`this.args.*`); never mutate them. Communicate changes **up** via callback actions ("data down, actions up").
- Derived values are **getters** — they track their reads automatically. `@computed` and observers are forbidden.

## Service (Shared State)
```typescript
// app/services/session.ts
import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { service } from '@ember/service';
import type StoreService from '@ember-data/store';
import type UserModel from 'my-app/models/user';

export default class SessionService extends Service {
  @service declare store: StoreService;

  @tracked currentUserId: string | null = null;
  @tracked currentUser: UserModel | null = null;

  get isAuthenticated(): boolean {
    return this.currentUserId !== null;
  }

  async load(userId: string): Promise<void> {
    this.currentUser = await this.store.findRecord('user', userId);
    this.currentUserId = userId;
  }

  logout(): void {
    this.currentUserId = null;
    this.currentUser = null;
  }
}

// Glint registry so `@service session` is typed at injection sites
declare module '@ember/service' {
  interface Registry {
    session: SessionService;
  }
}
```
Services are **singletons per app instance**. This is the *only* sanctioned home for state shared across components/routes — never module-level globals, never one component reaching into another.

## Route `model()` Hook + Ember Data
```typescript
// app/routes/users.ts
import Route from '@ember/routing/route';
import { service } from '@ember/service';
import type StoreService from '@ember-data/store';

export default class UsersRoute extends Route {
  @service declare store: StoreService;

  async model(): Promise<unknown> {
    // Data loads HERE — the template renders what the route resolved.
    return this.store.findAll('user');
  }
}
```
```typescript
// app/models/user.ts
import Model, { attr, hasMany } from '@ember-data/model';
import type PostModel from 'my-app/models/post';
import type { AsyncHasMany } from '@ember-data/model';

export default class UserModel extends Model {
  @attr('string') declare name: string;
  @attr('string') declare email: string;
  @hasMany('post', { async: true, inverse: 'author' })
  declare posts: AsyncHasMany<PostModel>;
}

declare module 'ember-data/types/registries/model' {
  export default interface ModelRegistry {
    user: UserModel;
  }
}
```
```typescript
// app/adapters/application.ts — where the API lives (URL shape, headers)
import JSONAPIAdapter from '@ember-data/adapter/json-api';

export default class ApplicationAdapter extends JSONAPIAdapter {
  host = 'https://api.example.com';
  namespace = 'v1';
}
```
```typescript
// app/serializers/application.ts — how payloads normalize into records
import JSONAPISerializer from '@ember-data/serializer/json-api';

export default class ApplicationSerializer extends JSONAPISerializer {}
```
```handlebars
{{! app/templates/users.hbs — @model is the route's resolved value }}
<ul>
  {{#each @model as |user|}}
    <li><UserCard @user={{user}} @onSelect={{this.select}} /></li>
  {{/each}}
</ul>
```
- Adapters own **how/where** data is fetched; serializers own **payload shape**. Components stay ignorant of the network.

## Template-Only Presentational Component
```handlebars
{{! app/components/user-avatar.hbs — NO backing class; pure render of args }}
<img
  class="avatar"
  src={{@user.avatarUrl}}
  alt={{@user.name}}
  width="48"
  height="48"
/>
```
```typescript
// app/components/user-avatar.ts — optional signature-only file for Glint typing
import templateOnly from '@ember/component/template-only';
import type UserModel from 'my-app/models/user';

interface UserAvatarSignature {
  Args: { user: UserModel };
  Element: HTMLImageElement;
}

export default templateOnly<UserAvatarSignature>();
```
Stateless UI needs **no class**. A template-only component is the default; add a backing Glimmer class only when you have state or actions.

## Modifier (DOM Behavior)
```typescript
// app/modifiers/autofocus.ts — DOM side effects live here, NOT in observers/jQuery
import { modifier } from 'ember-modifier';

export default modifier((element: HTMLElement) => {
  element.focus();
  // Optional teardown runs on cleanup:
  return () => element.blur();
});
```
```handlebars
{{! usage — element modifier attaches behavior to the real DOM node }}
<input type="text" {{autofocus}} />
```
Anything that touches the raw DOM (focus, measuring, third-party libs, event wiring beyond `{{on}}`) is a **modifier** with an explicit teardown. Never `didInsertElement`, never `Ember.$`.

## Testing
```typescript
// tests/integration/components/user-card-test.ts — rendering test
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, click } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | user-card', function (hooks) {
  setupRenderingTest(hooks);

  test('toggles details on click', async function (assert) {
    this.set('user', { id: '1', name: 'Ada', email: 'ada@example.com' });

    await render(hbs`<UserCard @user={{this.user}} />`);
    assert.dom('p').doesNotExist('details hidden initially');

    await click('button');
    assert.dom('p').hasText('ada@example.com', 'details shown after click');
  });
});
```
```typescript
// tests/acceptance/users-test.ts — application test (full route + render)
import { module, test } from 'qunit';
import { setupApplicationTest } from 'ember-qunit';
import { visit, currentURL, click } from '@ember/test-helpers';

module('Acceptance | users', function (hooks) {
  setupApplicationTest(hooks);

  test('lists users from the model hook', async function (assert) {
    await visit('/users');
    assert.strictEqual(currentURL(), '/users');
    assert.dom('.user-card').exists({ count: 2 });

    await click('.user-card:first-child button');
    assert.dom('.user-card:first-child p').exists('details expand');
  });
});
```
- **Rendering/integration tests** (`setupRenderingTest`) exercise a component in isolation via `render`.
- **Application/acceptance tests** (`setupApplicationTest`) drive real routes end-to-end via `visit`.
- Unit tests (`setupTest`) cover services and models. All use QUnit + `@ember/test-helpers` async helpers — never `setTimeout`/manual runloop poking.

## Tooling
- **CLI**: Ember CLI for all scaffolding, builds, and the dev server (`ember serve`).
- **Language**: TypeScript with **Glint** (`@glint/environment-ember-loose` / template-aware type checking); `glint` runs in CI.
- **Data**: Ember Data (store + adapters + serializers); commit the model layer.
- **DOM behavior**: `ember-modifier` for element modifiers.
- **Linting/Formatting**: ESLint (`eslint-plugin-ember`) + Prettier + `ember-template-lint` (`.template-lintrc.js`).
- **Testing**: QUnit via `ember-qunit` with `@ember/test-helpers`; run headless with `ember test`.

## Anti-Patterns (Rejected by This Standard)
- ❌ **Observers** (`@observes`, `addObserver`) — invisible, order-dependent invalidation. Use `@tracked` + getters.
- ❌ Legacy **`@computed`** properties and `Ember.Object.extend({...})` / `.create()` for app code — use native classes with `@tracked` and plain getters.
- ❌ **jQuery / direct DOM manipulation** (`Ember.$`, `this.element.querySelector` massaging, `didInsertElement`) — use `{{on}}` and modifiers.
- ❌ **Business logic in controllers** — controllers are for query params + display state; logic belongs in services/routes.
- ❌ **Two-way binding mutation** (`{{mut}}` to write back into args, mutating `this.args.*`) — follow "data down, actions up" with callback actions.
- ❌ **Fat components** that fetch their own data or hold shared state — load in `model()`, share via a `@service`, keep components rendering.
