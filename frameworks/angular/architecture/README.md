# Angular Standards — Application Architecture

> Deep-dive standard for Angular apps (v17+) in the Ummard/Simon ecosystem.
> **Mandate:** every new Angular app is **standalone-first, Signals-driven, and OnPush everywhere**.
> `NgModule`s for new feature code, default (`CheckAlways`) change detection, and manual `subscribe()` without teardown are **not** acceptable baselines — they scale poorly, hide performance cliffs, and leak subscriptions.

See [`../README.md`](../README.md) for base Angular conventions (naming, tooling). This document layers the application architecture on top.

## The Non-Negotiable Rules
1. **Standalone only** — every component, directive, and pipe is `standalone: true`. No `NgModule`s for new code; the app boots from `bootstrapApplication`.
2. **Lazy routes only** — every feature is reached via `loadComponent` / `loadChildren` route lazy-loading. Nothing feature-level is in the initial bundle.
3. **Signals for state, OnPush everywhere** — component and cross-component state lives in `signal`/`computed`; every component declares `ChangeDetectionStrategy.OnPush`.
4. **Smart vs presentational split** — container components inject services and own state; presentational components are pure `input()`/`output()` and hold no dependencies.
5. **No manual `subscribe` without teardown** — render streams with the `async` pipe or bridge them with `toSignal`; where you must subscribe imperatively, use `takeUntilDestroyed()`.

Everything below follows from these five rules.

## Prescribed Structure
```text
project_root/
├── src/
│   ├── app/
│   │   ├── app.config.ts             # ApplicationConfig — providers, router, http
│   │   ├── app.routes.ts             # top-level ROUTES, all lazy
│   │   ├── app.component.ts          # standalone root shell (router-outlet)
│   │   ├── core/                     # app-wide singletons — imported ONCE
│   │   │   ├── guards/
│   │   │   │   └── auth.guard.ts      # functional CanActivateFn
│   │   │   ├── interceptors/
│   │   │   │   └── auth.interceptor.ts   # functional HttpInterceptorFn
│   │   │   └── services/
│   │   │       └── session.service.ts    # Signals-based root state
│   │   ├── shared/                   # reusable, dependency-free building blocks
│   │   │   ├── ui/                    # presentational components (OnPush, input/output)
│   │   │   └── pipes/
│   │   └── features/
│   │       └── users/                # one folder per feature/domain
│   │           ├── users.routes.ts   # feature ROUTES (loadChildren target)
│   │           ├── data/
│   │           │   ├── user.model.ts
│   │           │   └── users.service.ts   # HTTP + Signals state for this feature
│   │           ├── containers/
│   │           │   └── user-list.component.ts    # smart: injects service
│   │           └── ui/
│   │               └── user-card.component.ts     # presentational: input/output only
│   ├── main.ts                       # bootstrapApplication(AppComponent, appConfig)
│   └── styles.scss
├── angular.json
├── package.json
├── tsconfig.json                     # "strict": true
└── .gitignore
```

## Bootstrap & Application Config
No root `NgModule`. The app boots directly from the root standalone component with a flat provider list.

```typescript
// src/main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

bootstrapApplication(AppComponent, appConfig).catch((err) => console.error(err));
```
```typescript
// src/app/app.config.ts
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),   // route params → component inputs
    provideHttpClient(withInterceptors([authInterceptor])),
  ],
};
```

## Routing (Lazy Everywhere)
Top-level routes lazy-load feature route files; feature routes lazy-load their entry component. Nothing feature-level is eagerly imported.

```typescript
// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'users' },
  {
    path: 'users',
    canMatch: [authGuard],
    loadChildren: () => import('./features/users/users.routes').then((m) => m.USERS_ROUTES),
  },
  { path: '**', loadComponent: () => import('./shared/ui/not-found.component').then((m) => m.NotFoundComponent) },
];
```
```typescript
// src/app/features/users/users.routes.ts
import { Routes } from '@angular/router';

export const USERS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./containers/user-list.component').then((m) => m.UserListComponent),
  },
  {
    path: ':id',
    // withComponentInputBinding() binds `:id` to an `id` input on the component
    loadComponent: () =>
      import('./containers/user-detail.component').then((m) => m.UserDetailComponent),
  },
];
```

## Functional Route Guard
Guards are functions using `inject()` — no class, no `NgModule` provider.

```typescript
// src/app/core/guards/auth.guard.ts
import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { SessionService } from '../services/session.service';

export const authGuard: CanMatchFn = () => {
  const session = inject(SessionService);
  const router = inject(Router);

  return session.isAuthenticated() ? true : router.createUrlTree(['/login']);
};
```

## Signals-Based State Service
Feature state is a service exposing **read-only** signals plus intent methods. Consumers never write state directly; they call methods. `computed` derives; `signal.update` mutates immutably.

```typescript
// src/app/features/users/data/users.service.ts
import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { User } from './user.model';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);

  // private writable signals — the single source of truth
  private readonly _users = signal<User[]>([]);
  private readonly _loading = signal(false);
  private readonly _query = signal('');

  // public read-only projections
  readonly users = this._users.asReadonly();
  readonly loading = this._loading.asReadonly();

  // derived state — recomputed only when dependencies change
  readonly filtered = computed(() => {
    const q = this._query().toLowerCase();
    return this._users().filter((u) => u.name.toLowerCase().includes(q));
  });
  readonly count = computed(() => this.filtered().length);

  setQuery(query: string): void {
    this._query.set(query);
  }

  load(): void {
    this._loading.set(true);
    this.http
      .get<User[]>('/api/users')
      .pipe(takeUntilDestroyed())          // auto-unsubscribe on injection-context teardown
      .subscribe((users) => {
        this._users.set(users);
        this._loading.set(false);
      });
  }

  addLocal(user: User): void {
    this._users.update((current) => [...current, user]);   // immutable update
  }
}
```

## Smart (Container) Component
Injects the service, owns nothing but wiring, renders with the `async` pipe / signals, and delegates rendering to presentational children.

```typescript
// src/app/features/users/containers/user-list.component.ts
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { UsersService } from '../data/users.service';
import { UserCardComponent } from '../ui/user-card.component';

@Component({
  selector: 'app-user-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UserCardComponent],
  template: `
    <input
      type="search"
      placeholder="Filter…"
      (input)="users.setQuery($any($event.target).value)"
    />

    @if (users.loading()) {
      <p>Loading…</p>
    } @else {
      <p>{{ users.count() }} users</p>
      @for (user of users.filtered(); track user.id) {
        <app-user-card [user]="user" (selected)="onSelect($event)" />
      } @empty {
        <p>No users match.</p>
      }
    }
  `,
})
export class UserListComponent implements OnInit {
  protected readonly users = inject(UsersService);

  ngOnInit(): void {
    this.users.load();
  }

  onSelect(user: { id: string }): void {
    // navigate / open detail — business logic stays in services, not the template
  }
}
```

## Presentational Component
Pure inputs/outputs, no injected dependencies, `OnPush`. Uses the signal-based `input()`/`output()` API and **never mutates its inputs**.

```typescript
// src/app/features/users/ui/user-card.component.ts
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { User } from '../data/user.model';

@Component({
  selector: 'app-user-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article (click)="selected.emit(user())">
      <h3>{{ user().name }}</h3>
      <p>{{ user().email }}</p>
    </article>
  `,
})
export class UserCardComponent {
  readonly user = input.required<User>();   // signal input — read as user()
  readonly selected = output<User>();        // typed event out
}
```

## RxJS at the Edges (`toSignal` / `async`)
Keep RxJS for the async plumbing (HTTP, event streams, debounced input), then convert to a signal at the component boundary so templates read synchronous values.

```typescript
// bridging a debounced search stream into a signal
import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, switchMap } from 'rxjs';
import { FormControl } from '@angular/forms';
import { UsersService } from '../data/users.service';

@Component({ /* … OnPush, standalone … */ })
export class UserSearchComponent {
  private readonly users = inject(UsersService);
  readonly search = new FormControl('', { nonNullable: true });

  // one stream, flattened with switchMap — NOT a nested subscribe
  readonly results = toSignal(
    this.search.valueChanges.pipe(
      debounceTime(250),
      switchMap((q) => this.users.searchRemote(q)),
    ),
    { initialValue: [] },
  );
}
```

## Typed Reactive Forms
Strictly typed, non-nullable form controls with a typed model — no `FormGroup<any>`, no template-driven forms for non-trivial input.

```typescript
// src/app/features/users/containers/user-edit.component.ts
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-user-edit',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()">
      <input formControlName="name" />
      <input formControlName="email" type="email" />
      <button [disabled]="form.invalid">Save</button>
    </form>
  `,
})
export class UserEditComponent {
  private readonly fb = inject(FormBuilder);

  // inferred as FormGroup<{ name: FormControl<string>; email: FormControl<string> }>
  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
  });

  submit(): void {
    if (this.form.invalid) return;
    const value = this.form.getRawValue();   // fully typed { name: string; email: string }
    // hand off to a service — no persistence logic in the component
  }
}
```

## Testing
Use `TestBed` with the standalone component under test, CDK component harnesses for DOM interaction, and `HttpTestingController` for HTTP.

```typescript
// user-card.component.spec.ts
import { TestBed } from '@angular/core/testing';
import { UserCardComponent } from './user-card.component';

it('renders the user name', async () => {
  const fixture = TestBed.createComponent(UserCardComponent);
  fixture.componentRef.setInput('user', { id: '1', name: 'Ada', email: 'ada@x.io' });
  fixture.detectChanges();

  expect(fixture.nativeElement.textContent).toContain('Ada');
});
```
```typescript
// users.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(UsersService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());   // asserts no outstanding requests

  it('loads users into the signal', () => {
    service.load();
    httpMock.expectOne('/api/users').flush([{ id: '1', name: 'Ada', email: 'ada@x.io' }]);
    expect(service.users().length).toBe(1);
  });
});
```
```typescript
// harness-driven interaction (@angular/cdk/testing)
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatButtonHarness } from '@angular/material/button/testing';

const loader = TestbedHarnessEnvironment.loader(fixture);
const button = await loader.getHarness(MatButtonHarness);
await button.click();
```
- Prefer **harnesses** over raw `querySelector` — they survive DOM refactors and encode component semantics.
- `HttpTestingController.verify()` in `afterEach` catches leaked/unmatched requests.

## Tooling
- **CLI**: Angular CLI (`ng`) for all scaffolding and builds — `ng generate component --standalone`.
- **Language**: TypeScript with `strict: true` (plus `strictTemplates` via `angularCompilerOptions`).
- **Linting/Formatting**: `angular-eslint` + Prettier (per base Angular standard).
- **Testing**: Jasmine/Karma (default) or Jest, with `@angular/cdk/testing` harnesses.
- **State**: native Signals first; reach for a store (NgRx SignalStore) only when cross-feature shared state genuinely warrants it.

## Anti-Patterns (Rejected by This Standard)
- ❌ `NgModule`s (`@NgModule`, `declarations`, `SharedModule`) for new code instead of standalone components.
- ❌ Default (`CheckAlways`) change detection instead of `ChangeDetectionStrategy.OnPush` on every component.
- ❌ `.subscribe()` in a component without teardown, instead of the `async` pipe, `toSignal`, or `takeUntilDestroyed()`.
- ❌ Business logic, HTTP calls, or persistence inside components instead of in injectable services.
- ❌ Mutating `@Input()` / `input()` values in the child instead of emitting an `output()` up to the owner.
- ❌ Nested `subscribe()` inside another `subscribe()` instead of flattening with `switchMap` / `concatMap` / `mergeMap`.
- ❌ Eagerly importing feature components at the root instead of lazy `loadComponent` / `loadChildren`.
