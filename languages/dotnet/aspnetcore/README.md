# ASP.NET Core Standards — Application Architecture

> Deep-dive standard for ASP.NET Core (.NET 8+) Web APIs in the Ummard/Simon ecosystem.
> **Mandate:** every non-trivial API uses **constructor dependency injection through the built-in container** with **thin controllers/endpoints delegating to a Service → Repository layering**.
> A fat controller that carries business logic, opens a `DbContext` directly, or manually `new`s its dependencies is **not** an acceptable baseline — it is untestable, couples HTTP to persistence, and defeats the container that the framework hands you for free.

See [`../README.md`](../README.md) for base .NET conventions (naming, tooling). This document layers the ASP.NET Core-specific architecture on top.

## The Non-Negotiable Rules
1. **Every dependency arrives via constructor injection** resolved by the built-in DI container — never `new SomeService()`, never a static/service-locator lookup.
2. **Controllers and Minimal API endpoints stay thin** — they bind input, call one application service, and map the result to an HTTP response. No business logic, no data access.
3. **Configuration is bound to typed options** (`IOptions<T>`) from `appsettings.json`/environment — never `IConfiguration["key"]` string-indexing scattered through the code, never literals.

Everything below follows from these three rules.

## Prescribed Structure
```text
project_root/
├── src/
│   ├── MyApi.Api/                        # HTTP surface — the ONLY project that references ASP.NET Core
│   │   ├── Program.cs                    # composition root: builder, DI, middleware pipeline
│   │   ├── Controllers/
│   │   │   └── OrdersController.cs       # thin: bind → call service → map result
│   │   ├── Contracts/                    # request/response DTOs (the API's public shape)
│   │   │   ├── CreateOrderRequest.cs
│   │   │   └── OrderResponse.cs
│   │   ├── Middleware/
│   │   │   └── ExceptionHandlingMiddleware.cs
│   │   ├── appsettings.json
│   │   └── appsettings.Development.json
│   ├── MyApi.Application/                # use-cases: services, interfaces, options, no HTTP/EF types leaking out
│   │   ├── Orders/
│   │   │   ├── IOrderService.cs
│   │   │   └── OrderService.cs
│   │   └── Abstractions/
│   │       └── IOrderRepository.cs       # repository contract lives with the app layer that needs it
│   ├── MyApi.Domain/                     # entities + domain rules — zero framework dependencies
│   │   └── Order.cs
│   └── MyApi.Infrastructure/             # EF Core, external services — implements Application abstractions
│       ├── Persistence/
│       │   ├── AppDbContext.cs
│       │   └── OrderRepository.cs
│       └── Options/
│           └── OrderProcessingOptions.cs
├── tests/
│   ├── MyApi.IntegrationTests/           # WebApplicationFactory<Program>
│   └── MyApi.UnitTests/                  # services in isolation with mocked repos
├── MyApi.sln
├── .editorconfig
└── .gitignore
```
Dependencies point inward: `Api → Application → Domain`, and `Infrastructure → Application/Domain`. The Domain project references nothing framework-shaped; the Api project is the only one that knows about HTTP.

## Composition Root — `Program.cs`
The minimal hosting model. One file wires the container and the middleware pipeline — this is the single place the object graph is assembled.
```csharp
// src/MyApi.Api/Program.cs
using MyApi.Api.Middleware;
using MyApi.Application.Abstractions;
using MyApi.Application.Orders;
using MyApi.Infrastructure.Options;
using MyApi.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// --- Logging ---
builder.Host.UseSerilog((ctx, cfg) => cfg.ReadFrom.Configuration(ctx.Configuration));

// --- Framework services ---
builder.Services.AddControllers();
builder.Services.AddProblemDetails();            // RFC 7807 responses out of the box
builder.Services.AddEndpointsApiExplorer();

// --- Options pattern: bind + validate a config section, fail fast on startup ---
builder.Services.AddOptions<OrderProcessingOptions>()
    .Bind(builder.Configuration.GetSection(OrderProcessingOptions.SectionName))
    .ValidateDataAnnotations()
    .ValidateOnStart();

// --- Persistence: DbContext registered in DI (Scoped by default) ---
builder.Services.AddDbContext<AppDbContext>(opts =>
    opts.UseNpgsql(builder.Configuration.GetConnectionString("Default")));

// --- Application + Infrastructure services (constructor DI everywhere) ---
builder.Services.AddScoped<IOrderRepository, OrderRepository>();
builder.Services.AddScoped<IOrderService, OrderService>();

var app = builder.Build();

// --- Middleware pipeline: ORDER MATTERS, outermost first ---
app.UseMiddleware<ExceptionHandlingMiddleware>();   // catch everything below it
app.UseSerilogRequestLogging();
app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();

// Exposed so WebApplicationFactory<Program> can boot the real app in tests.
public partial class Program;
```
- Service lifetimes are explicit: `AddScoped` for per-request work (services, repositories, `DbContext`), `AddSingleton` for stateless/shared, `AddTransient` for lightweight throwaways. Never inject a Scoped service into a Singleton.
- Pipeline order is load-bearing: exception handling wraps everything, auth precedes authorization, endpoints map last.

## Thin Controller — bind, delegate, map
```csharp
// src/MyApi.Api/Controllers/OrdersController.cs
using MyApi.Api.Contracts;
using MyApi.Application.Orders;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/orders")]
public sealed class OrdersController : ControllerBase
{
    private readonly IOrderService _orders;

    // Dependencies injected by the container — never constructed here.
    public OrdersController(IOrderService orders) => _orders = orders;

    [HttpPost]
    public async Task<ActionResult<OrderResponse>> Create(
        CreateOrderRequest request, CancellationToken ct)
    {
        var order = await _orders.PlaceOrderAsync(request.CustomerId, request.Sku, request.Quantity, ct);
        var response = OrderResponse.From(order);
        return CreatedAtAction(nameof(GetById), new { id = response.Id }, response);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<OrderResponse>> GetById(Guid id, CancellationToken ct)
    {
        var order = await _orders.GetAsync(id, ct);
        return order is null ? NotFound() : Ok(OrderResponse.From(order));
    }
}
```
The controller knows nothing about EF, pricing, or inventory — it translates HTTP to a service call and back. Model binding + `[ApiController]` gives automatic 400s for invalid input.

> **Minimal APIs** are an equally acceptable HTTP surface and follow the same rule — the lambda binds and delegates, it does not contain logic:
> ```csharp
> app.MapPost("/api/orders", async (CreateOrderRequest req, IOrderService orders, CancellationToken ct) =>
> {
>     var order = await orders.PlaceOrderAsync(req.CustomerId, req.Sku, req.Quantity, ct);
>     return Results.Created($"/api/orders/{order.Id}", OrderResponse.From(order));
> });
> ```

## Application Service — where business logic lives
```csharp
// src/MyApi.Application/Orders/IOrderService.cs
using MyApi.Domain;

public interface IOrderService
{
    Task<Order> PlaceOrderAsync(Guid customerId, string sku, int quantity, CancellationToken ct);
    Task<Order?> GetAsync(Guid id, CancellationToken ct);
}
```
```csharp
// src/MyApi.Application/Orders/OrderService.cs
using MyApi.Application.Abstractions;
using MyApi.Domain;
using Microsoft.Extensions.Options;

public sealed class OrderService : IOrderService
{
    private readonly IOrderRepository _repository;
    private readonly OrderProcessingOptions _options;

    // Repository + typed options both injected. IOptions<T> is unwrapped in the ctor.
    public OrderService(IOrderRepository repository, IOptions<OrderProcessingOptions> options)
    {
        _repository = repository;
        _options = options.Value;
    }

    public async Task<Order> PlaceOrderAsync(Guid customerId, string sku, int quantity, CancellationToken ct)
    {
        if (quantity > _options.MaxItemsPerOrder)
            throw new DomainException($"Cannot order more than {_options.MaxItemsPerOrder} items.");

        var order = Order.Create(customerId, sku, quantity);   // domain rules live on the entity
        await _repository.AddAsync(order, ct);
        return order;
    }

    public Task<Order?> GetAsync(Guid id, CancellationToken ct) => _repository.GetAsync(id, ct);
}
```
- The service depends on the `IOrderRepository` **abstraction**, not on EF Core. It is unit-testable with a mocked repository and no database.
- Business invariants live in the Domain entity (`Order.Create`) and the service — never in the controller.

## Repository over `DbContext`
```csharp
// src/MyApi.Application/Abstractions/IOrderRepository.cs
using MyApi.Domain;

public interface IOrderRepository
{
    Task AddAsync(Order order, CancellationToken ct);
    Task<Order?> GetAsync(Guid id, CancellationToken ct);
}
```
```csharp
// src/MyApi.Infrastructure/Persistence/OrderRepository.cs
using MyApi.Application.Abstractions;
using MyApi.Domain;
using Microsoft.EntityFrameworkCore;

public sealed class OrderRepository : IOrderRepository
{
    private readonly AppDbContext _db;

    public OrderRepository(AppDbContext db) => _db = db;   // DbContext injected, not new-ed

    public async Task AddAsync(Order order, CancellationToken ct)
    {
        _db.Orders.Add(order);
        await _db.SaveChangesAsync(ct);
    }

    public Task<Order?> GetAsync(Guid id, CancellationToken ct) =>
        _db.Orders.FirstOrDefaultAsync(o => o.Id == id, ct);
}
```
```csharp
// src/MyApi.Infrastructure/Persistence/AppDbContext.cs
using MyApi.Domain;
using Microsoft.EntityFrameworkCore;

public sealed class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Order> Orders => Set<Order>();
}
```
The `DbContext` is registered in DI and injected into repositories only. Controllers and services never touch it directly, which keeps EF Core an infrastructure detail behind the `IOrderRepository` seam.

## Options Pattern — typed config, no string keys
```csharp
// src/MyApi.Infrastructure/Options/OrderProcessingOptions.cs
using System.ComponentModel.DataAnnotations;

public sealed class OrderProcessingOptions
{
    public const string SectionName = "OrderProcessing";

    [Range(1, 1000)]
    public int MaxItemsPerOrder { get; init; }

    [Required]
    public string FulfillmentQueue { get; init; } = default!;
}
```
```json
// appsettings.json
{
  "OrderProcessing": {
    "MaxItemsPerOrder": 50,
    "FulfillmentQueue": "orders.inbound"
  }
}
```
- Bound once in `Program.cs` with `.ValidateDataAnnotations().ValidateOnStart()` — a misconfigured app fails at boot, not at first request.
- Consumers inject `IOptions<OrderProcessingOptions>` (or `IOptionsSnapshot<T>` when reload-on-change is required). **Never** read `IConfiguration["OrderProcessing:MaxItemsPerOrder"]` inline.
- Secrets (connection strings, keys) come from environment variables / user-secrets / a vault — never committed literals.

## DTOs vs Entities
```csharp
// src/MyApi.Api/Contracts/CreateOrderRequest.cs
public sealed record CreateOrderRequest(Guid CustomerId, string Sku, int Quantity);

// src/MyApi.Api/Contracts/OrderResponse.cs
using MyApi.Domain;

public sealed record OrderResponse(Guid Id, string Sku, int Quantity, string Status)
{
    public static OrderResponse From(Order o) => new(o.Id, o.Sku, o.Quantity, o.Status.ToString());
}
```
- The API's request/response types are **DTOs**, decoupled from domain entities. Domain entities are **never** serialized to or bound from the wire.
- This stops persistence concerns (navigation properties, EF-tracked state, internal invariants) from leaking into the public contract, and lets the two shapes evolve independently.

## Centralized Error Handling
One place turns exceptions into RFC 7807 `ProblemDetails`. No `try/catch` scattered through controllers.
```csharp
// src/MyApi.Api/Middleware/ExceptionHandlingMiddleware.cs
using Microsoft.AspNetCore.Mvc;

public sealed class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (DomainException ex)                          // expected, client-caused
        {
            _logger.LogWarning(ex, "Domain rule violated");
            await WriteProblem(context, StatusCodes.Status400BadRequest, ex.Message);
        }
        catch (Exception ex)                                // unexpected — log, never swallow silently
        {
            _logger.LogError(ex, "Unhandled exception");
            await WriteProblem(context, StatusCodes.Status500InternalServerError, "An unexpected error occurred.");
        }
    }

    private static Task WriteProblem(HttpContext context, int status, string detail)
    {
        var problem = new ProblemDetails { Status = status, Title = detail };
        context.Response.StatusCode = status;
        return context.Response.WriteAsJsonAsync(problem);
    }
}
```
Registered first in the pipeline (see `Program.cs`) so it wraps every downstream handler. Exceptions are logged with context, then mapped to a stable status code — never caught and discarded.

## Testing (Built From the App)
Integration tests boot the **real** `Program.cs` in memory via `WebApplicationFactory<Program>`, then override only what a test needs.
```csharp
// tests/MyApi.IntegrationTests/OrdersApiTests.cs
using System.Net;
using System.Net.Http.Json;
using MyApi.Api.Contracts;
using MyApi.Application.Abstractions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

public sealed class OrdersApiTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public OrdersApiTests(WebApplicationFactory<Program> factory) =>
        // Swap the real repository for a fake — same DI container, one registration replaced.
        _factory = factory.WithWebHostBuilder(builder =>
            builder.ConfigureServices(services =>
            {
                services.RemoveAll<IOrderRepository>();
                services.AddScoped<IOrderRepository, InMemoryOrderRepository>();
            }));

    [Fact]
    public async Task Post_creates_order_and_returns_201()
    {
        var client = _factory.CreateClient();

        var resp = await client.PostAsJsonAsync("/api/orders",
            new CreateOrderRequest(Guid.NewGuid(), "SKU-1", 2));

        Assert.Equal(HttpStatusCode.Created, resp.StatusCode);
        var body = await resp.Content.ReadFromJsonAsync<OrderResponse>();
        Assert.Equal("SKU-1", body!.Sku);
    }
}
```
The factory is *why* this is testable: the app is assembled exactly as in production, and DI lets a test replace a single seam (`IOrderRepository`) without touching the code under test. Application services get plain xUnit unit tests with a mocked `IOrderRepository` — no host required.

## Tooling
- **Host**: Kestrel behind a reverse proxy (Nginx/YARP) in production.
- **ORM/Migrations**: EF Core; commit the `Migrations/` folder, apply via `dotnet ef database update` in the release pipeline.
- **Config/Options**: `Microsoft.Extensions.Options` with validation on start.
- **Logging**: Serilog (structured) via `UseSerilog`, sinks configured from `appsettings`.
- **Analyzers/Formatting**: `dotnet format` + `.editorconfig`; enable `<TreatWarningsAsErrors>` and .NET analyzers (`<AnalysisLevel>latest-recommended</AnalysisLevel>`) — per base .NET standard.
- **Testing**: xUnit with `WebApplicationFactory<Program>` for integration, mocked abstractions for unit tests.

## Anti-Patterns (Rejected by This Standard)
- ❌ Fat controllers containing business rules, validation logic, or `await _db.SaveChangesAsync()` instead of delegating to a service.
- ❌ `new OrderService(...)` / static service locators / `HttpContext.RequestServices.GetService<T>()` inside handlers instead of constructor injection.
- ❌ Serializing or model-binding EF Core entities directly as API request/response types instead of dedicated DTOs.
- ❌ `IConfiguration["Section:Key"]` string-indexing or hardcoded config literals instead of validated `IOptions<T>`.
- ❌ Injecting `AppDbContext` into controllers/services, bypassing the repository seam.
- ❌ Per-controller `try/catch` that swallows exceptions or returns 200 on failure instead of centralized exception-handling middleware + `ProblemDetails`.
