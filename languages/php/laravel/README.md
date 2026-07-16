# Laravel Standards — Application Architecture

> Deep-dive standard for Laravel 11 apps/APIs in the Ummard/Simon ecosystem.
> **Mandate:** controllers stay **thin** — validation lives in **Form Requests**, business logic lives in **Service/Action** classes, and configuration is read **only** through `config/*`.
> A fat controller that validates inline, contains business logic, and scatters `env()` calls at runtime is **not** an acceptable baseline — it is untestable, unmockable, and silently returns `null` once `php artisan config:cache` runs in production.

See [`../README.md`](../README.md) for base PHP conventions (naming, `declare(strict_types=1)`, tooling). This document layers the Laravel-specific architecture on top.

## The Non-Negotiable Rules
1. **Controllers are thin** — they receive a validated request, delegate to one service/action, and return a response (usually an API Resource). No business logic, no queries beyond trivial routing.
2. **Validation + authorization live in Form Requests** — never inline `$request->validate()` sprawl inside the controller.
3. **Business logic lives in Service or single-purpose Action classes** — resolved from the container, unit-testable in isolation.
4. **Configuration is read only via `config('...')`** — `env()` is called **only** inside `config/*.php` files. At runtime `config:cache` makes `env()` return `null`, so runtime `env()` is a production bug, not a style nit.

Everything below follows from these four rules.

## Prescribed Structure
```text
project_root/
├── app/
│   ├── Http/
│   │   ├── Controllers/
│   │   │   └── Api/PostController.php     # THIN — delegates, never contains logic
│   │   ├── Requests/
│   │   │   └── StorePostRequest.php       # validation + authorization
│   │   └── Resources/
│   │       └── PostResource.php           # output shaping (never leak raw models)
│   ├── Services/
│   │   └── PostService.php                # domain logic, container-injected
│   ├── Actions/
│   │   └── PublishPostAction.php          # single-purpose unit of work
│   ├── Models/
│   │   ├── Post.php
│   │   └── User.php
│   ├── Providers/
│   │   ├── AppServiceProvider.php         # bind interfaces → implementations
│   │   └── EventServiceProvider.php
│   └── Exceptions/                        # domain exceptions
├── bootstrap/
│   └── app.php                            # Laravel 11 app + exception handling wiring
├── config/                                # the ONLY place env() is called
│   └── services.php
├── database/
│   ├── factories/PostFactory.php
│   ├── migrations/
│   └── seeders/
├── routes/
│   ├── api.php
│   └── web.php
├── tests/
│   ├── Feature/PostApiTest.php            # hits real routes
│   └── Unit/PostServiceTest.php
├── composer.json
├── composer.lock
├── pint.json
├── phpstan.neon                           # Larastan
└── .env.example                           # documented vars, NO secrets
```

## Core Wiring — Thin Controller → Service → Resource

### The Controller (thin — delegates only)
```php
<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePostRequest;
use App\Http\Resources\PostResource;
use App\Services\PostService;

final class PostController extends Controller
{
    // PostService is resolved & injected by the container — no `new PostService()`.
    public function __construct(private readonly PostService $posts)
    {
    }

    public function store(StorePostRequest $request): PostResource
    {
        // Validation already happened in the Form Request. Just delegate.
        $post = $this->posts->create(
            $request->user(),
            $request->validated(),
        );

        return new PostResource($post);
    }
}
```
- Type-hinting `StorePostRequest` triggers validation **before** the method body runs; a 422 is returned automatically on failure.
- The controller knows *nothing* about how a post is created — that is the service's job.

### The Form Request (validation + authorization)
```php
<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class StorePostRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Authorization co-located with validation — runs before rules.
        return $this->user()?->can('create', \App\Models\Post::class) ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'body'  => ['required', 'string'],
            'tags'  => ['array'],
            'tags.*' => ['string', 'max:50'],
        ];
    }
}
```

### The Service (domain logic, injected)
```php
<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Post;
use App\Models\User;

final class PostService
{
    /**
     * @param array<string, mixed> $data
     */
    public function create(User $author, array $data): Post
    {
        // Business logic lives HERE — not in the controller.
        return $author->posts()->create([
            'title' => $data['title'],
            'body'  => $data['body'],
            'slug'  => str($data['title'])->slug()->toString(),
        ]);
    }
}
```

### A Single-Purpose Action (one unit of work)
```php
<?php

declare(strict_types=1);

namespace App\Actions;

use App\Models\Post;

final class PublishPostAction
{
    // One verb, one responsibility. Trivially unit-testable & queueable.
    public function execute(Post $post): Post
    {
        $post->forceFill(['published_at' => now()])->save();

        return $post;
    }
}
```
Prefer a **Service** to group related operations for one domain (`PostService::create/update/delete`); prefer an **Action** when a single business verb is complex enough to own its class (`PublishPostAction`). Both are resolved from the container and injected — never `new`ed inside a controller.

### The API Resource (output shaping)
```php
<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Post */
final class PostResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id'        => $this->id,
            'title'     => $this->title,
            'body'      => $this->body,
            'published' => $this->published_at !== null,
            // whenLoaded avoids triggering an N+1 when the relation isn't eager-loaded.
            'author'    => new UserResource($this->whenLoaded('author')),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
```
Resources are the **only** thing a controller returns for API responses. Never `return response()->json($model)` — that leaks column names, timestamps, and hidden attributes.

## Configuration — `config/*` Only
```php
<?php

// config/services.php — the ONLY layer allowed to call env().

return [
    'stripe' => [
        'key'    => env('STRIPE_KEY'),
        'secret' => env('STRIPE_SECRET'),
    ],
];
```
```php
// Anywhere in app code — read via config(), NEVER env():
$secret = config('services.stripe.secret');   // ✅ survives config:cache
$secret = env('STRIPE_SECRET');                // ❌ returns null after config:cache
```
- Commit `.env.example` documenting every variable; never commit `.env`.
- Run `php artisan config:cache` in production — this is exactly why runtime `env()` is forbidden.

## Service Providers & the Container
```php
<?php

declare(strict_types=1);

namespace App\Providers;

use App\Services\Payments\PaymentGateway;
use App\Services\Payments\StripeGateway;
use Illuminate\Support\ServiceProvider;

final class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Bind interface → implementation so consumers depend on the abstraction.
        $this->app->bind(PaymentGateway::class, StripeGateway::class);
    }
}
```
- Type-hint the **interface** in a controller/service constructor; the container injects the bound implementation.
- Swap implementations (e.g. a fake gateway in tests) by rebinding in one place — no consumer changes.

## Eloquent Models & Mass-Assignment
```php
<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

final class Post extends Model
{
    use HasFactory;

    // Explicit allow-list — mass assignment is opt-IN, never wide open.
    protected $fillable = ['title', 'body', 'slug'];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'published_at' => 'datetime',
        ];
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function comments(): HasMany
    {
        return $this->hasMany(Comment::class);
    }
}
```
- Every model declares **`$fillable`** (allow-list) or **`$guarded`** (deny-list). Never leave both at their defaults for a model that accepts user input — that is a mass-assignment vulnerability.
- Prefer `$fillable`: an explicit allow-list fails safe when a new column is added.

## Avoiding N+1 with Eager Loading
```php
// ❌ N+1: one query for posts, then one per post for its author.
$posts = Post::all();
foreach ($posts as $post) {
    echo $post->author->name;
}

// ✅ Two queries total, regardless of row count.
$posts = Post::with('author')->get();

// ✅ Eager-load for a resource collection:
return PostResource::collection(Post::with(['author', 'comments'])->paginate());
```
- Eager-load every relation a Resource touches (`with([...])`) — pair this with `whenLoaded()` in the Resource.
- Enable `Model::preventLazyLoading()` in `AppServiceProvider::boot()` for non-production environments so N+1s throw during development instead of shipping.

## Centralized Exception Handling (Laravel 11)
```php
<?php

// bootstrap/app.php — exception handling is wired here in Laravel 11 (no app/Exceptions/Handler.php).

use App\Exceptions\PostNotPublishableException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        api: __DIR__ . '/../routes/api.php',
    )
    ->withExceptions(function (Exceptions $exceptions): void {
        // One place maps a domain exception → an HTTP response.
        $exceptions->render(function (PostNotPublishableException $e, Request $request) {
            return response()->json(['message' => $e->getMessage()], 409);
        });
    })
    ->create();
```
- Throw **domain exceptions** from services/actions; map them to HTTP responses centrally in `bootstrap/app.php`. Controllers never `try/catch` for shaping error responses.

## Testing
Feature tests hit real routes through the full HTTP stack; unit tests exercise services/actions in isolation. Use factories and `RefreshDatabase` for a clean schema per test.

```php
<?php

declare(strict_types=1);

use App\Models\User;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\postJson;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

it('creates a post via the API', function (): void {
    $user = User::factory()->create();

    $response = actingAs($user)->postJson('/api/posts', [
        'title' => 'Hello',
        'body'  => 'World',
    ]);

    $response
        ->assertCreated()
        ->assertJsonPath('data.title', 'Hello');

    $this->assertDatabaseHas('posts', ['title' => 'Hello', 'user_id' => $user->id]);
});

it('rejects an unauthenticated request', function (): void {
    postJson('/api/posts', ['title' => 'x', 'body' => 'y'])->assertUnauthorized();
});
```
```php
<?php
// A factory — deterministic, composable test data.

declare(strict_types=1);

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

final class PostFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'title' => $this->faker->sentence(),
            'body'  => $this->faker->paragraph(),
            'slug'  => $this->faker->unique()->slug(),
        ];
    }
}
```
- **Feature tests** (`tests/Feature`) assert HTTP status, JSON shape, and DB state — they prove the controller → request → service → resource wiring end to end.
- **Unit tests** (`tests/Unit`) call a service/action directly with a mocked collaborator.
- `RefreshDatabase` migrates a fresh schema per test; factories build data — never seed hand-rolled arrays.

## Tooling
- **Dependencies**: Composer; commit `composer.lock`.
- **Formatting**: Laravel **Pint** (PSR-12 preset) — `vendor/bin/pint`. Enforced in CI.
- **Static Analysis**: **PHPStan + Larastan** at the max level the codebase sustains — `vendor/bin/phpstan analyse`.
- **Testing**: **Pest** (PHPUnit-compatible) with `RefreshDatabase` + factories — `php artisan test` / `vendor/bin/pest`.
- **Runtime**: PHP 8.2+, `declare(strict_types=1)` in every file (per base PHP standard).

## Anti-Patterns (Rejected by This Standard)
- ❌ **Fat controllers** — queries, business rules, and response assembly crammed into the controller method.
- ❌ **Business logic in controllers** instead of a Service/Action class resolved from the container.
- ❌ **`env()` called at runtime** outside `config/*.php` — returns `null` after `config:cache`.
- ❌ **Inline `$request->validate([...])`** in the controller instead of a dedicated Form Request.
- ❌ **Unguarded mass assignment** — models without `$fillable`/`$guarded` accepting user input.
- ❌ **N+1 queries** — iterating a collection and touching an unloaded relation instead of eager-loading with `with()`.
- ❌ **Returning raw models** (`response()->json($model)`) instead of an API Resource, leaking internal columns.
- ❌ **`new PostService()` inside a controller** instead of constructor injection via the container.
