# Axum Standards — Application Architecture

> Deep-dive standard for Axum web services in the Ummard/Simon ecosystem.
> **Mandate:** every non-trivial Axum service uses the **app-factory + `State` extractor + `IntoResponse` error type** pattern, running on a Tokio runtime.
> `.unwrap()`/`.expect()` in handlers and global mutable state (`static mut`, `lazy_static`/`once_cell` singletons holding a pool or config) are **rejected** — they panic on the request path and defeat isolated testing.

See [`../README.md`](../README.md) for base Rust conventions (naming, tooling, ownership). This document layers the Axum-specific architecture on top.

## The Non-Negotiable Rules
1. **Shared state flows through the `State` extractor** — a single cloneable `AppState` passed to `Router::with_state`. No `static`/`lazy_static`/`OnceCell` globals for pools, clients, or config.
2. **Errors are one custom `AppError` type that implements `IntoResponse`** — handlers return `Result<T, AppError>` and use `?`. No `.unwrap()`/`.expect()`/`panic!` on the request path.
3. **Handlers stay thin** — they extract, delegate to a service, and map the result to a response. Business logic lives in `service/`, data access in `repository/`.

Everything below follows from these three rules.

## Prescribed Structure
```text
project_root/
├── src/
│   ├── main.rs                 # runtime + serve only; builds state, calls build_app, graceful shutdown
│   ├── app.rs                  # build_app(state) -> Router  — the ONLY place the app is assembled
│   ├── state.rs                # AppState (Clone) holding pool/config/clients
│   ├── config.rs               # Config loaded from env, fail-fast
│   ├── error.rs                # AppError enum + IntoResponse — uniform JSON errors
│   ├── routes/
│   │   ├── mod.rs              # merges feature routers into one Router
│   │   └── users.rs            # Router<AppState> for the users feature
│   ├── handlers/
│   │   ├── mod.rs
│   │   └── users.rs            # thin async fns: extract → service → response
│   ├── service/
│   │   ├── mod.rs
│   │   └── users.rs            # business logic; returns Result<_, AppError>
│   └── repository/
│       ├── mod.rs
│       └── users.rs            # sqlx queries; the only place SQL lives
├── migrations/                 # sqlx migrations — committed
├── tests/
│   └── users.rs                # build_app + ServiceExt::oneshot, no live socket
├── Cargo.toml
├── Cargo.lock                  # committed (binary)
├── .env.example                # documented env vars, NO secrets
└── .gitignore
```

## The App Factory
App construction is separate from `main` so tests build the identical `Router`.
```rust
// src/app.rs
use std::time::Duration;

use axum::Router;
use tower_http::{timeout::TimeoutLayer, trace::TraceLayer};

use crate::{routes, state::AppState};

/// Assemble the full application. The ONLY place routes + middleware are wired.
pub fn build_app(state: AppState) -> Router {
    Router::new()
        .merge(routes::router())
        .layer(TraceLayer::new_for_http())        // tower-http request tracing
        .layer(TimeoutLayer::new(Duration::from_secs(10)))
        .with_state(state)                          // inject shared state
}
```

## Entrypoint (Runtime + Graceful Shutdown)
```rust
// src/main.rs
use tokio::net::TcpListener;
use tokio::signal;

mod app;
mod config;
mod error;
mod handlers;
mod repository;
mod routes;
mod service;
mod state;

use crate::{app::build_app, config::Config, state::AppState};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt::init();

    let config = Config::from_env()?;                 // fail fast on bad config
    let state = AppState::new(config).await?;         // build pool etc. once
    let app = build_app(state);

    let listener = TcpListener::bind("0.0.0.0:8080").await?;
    tracing::info!("listening on {}", listener.local_addr()?);

    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;

    Ok(())
}

async fn shutdown_signal() {
    let ctrl_c = async {
        signal::ctrl_c().await.expect("install Ctrl+C handler");
    };
    #[cfg(unix)]
    let terminate = async {
        signal::unix::signal(signal::unix::SignalKind::terminate())
            .expect("install SIGTERM handler")
            .recv()
            .await;
    };
    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }
    tracing::info!("shutdown signal received");
}
```
`.expect()` is acceptable **here** — installing signal handlers is a startup invariant, not the request path.

## Shared State
```rust
// src/state.rs
use sqlx::postgres::{PgPool, PgPoolOptions};

use crate::config::Config;

/// Cloneable handle to shared resources. `Clone` is cheap: PgPool is an Arc,
/// Config is wrapped so clones share one allocation.
#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
    pub config: std::sync::Arc<Config>,
}

impl AppState {
    pub async fn new(config: Config) -> anyhow::Result<Self> {
        let pool = PgPoolOptions::new()
            .max_connections(config.db_max_connections)
            .connect(&config.database_url)
            .await?;
        Ok(Self { pool, config: std::sync::Arc::new(config) })
    }
}
```
- State is created **once** in `main` and injected via `.with_state()` — never a global.
- Everything shared (pool, HTTP clients, config) lives on `AppState`. `Clone` must stay cheap: hold `Arc`/pools, not owned heavyweight data.

## Configuration
```rust
// src/config.rs
pub struct Config {
    pub database_url: String,
    pub db_max_connections: u32,
}

impl Config {
    pub fn from_env() -> anyhow::Result<Self> {
        Ok(Self {
            database_url: std::env::var("DATABASE_URL")?,          // fail fast if missing
            db_max_connections: std::env::var("DB_MAX_CONNECTIONS")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(5),
        })
    }
}
```
- Read config from env; **never** hardcode secrets or connection strings.
- Commit `.env.example` documenting every variable; never commit `.env`.

## The Error Type (`IntoResponse`)
One enum, built with `thiserror`, converts every failure into a uniform JSON body. `?` in handlers works because `sqlx::Error` etc. convert into `AppError`.
```rust
// src/error.rs
use axum::{
    Json,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use serde_json::json;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("resource not found")]
    NotFound,

    #[error("invalid request: {0}")]
    Validation(String),

    #[error(transparent)]
    Database(#[from] sqlx::Error),           // `?` on sqlx calls converts automatically
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message) = match self {
            AppError::NotFound => (StatusCode::NOT_FOUND, self.to_string()),
            AppError::Validation(_) => (StatusCode::BAD_REQUEST, self.to_string()),
            AppError::Database(ref e) => {
                tracing::error!(error = %e, "database error");   // log detail, hide from client
                (StatusCode::INTERNAL_SERVER_ERROR, "internal server error".to_owned())
            }
        };
        (status, Json(json!({ "error": message }))).into_response()
    }
}
```
- Handlers return `Result<T, AppError>`; the `?` operator replaces every `unwrap`.
- Internal detail (SQL errors) is logged server-side and never leaked to clients.

## Routes (per feature, generic over `AppState`)
```rust
// src/routes/mod.rs
use axum::Router;

use crate::state::AppState;

mod users;

pub fn router() -> Router<AppState> {
    Router::new().merge(users::router())
}
```
```rust
// src/routes/users.rs
use axum::{Router, routing::get};

use crate::{handlers, state::AppState};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/users", get(handlers::users::list).post(handlers::users::create))
        .route("/users/:id", get(handlers::users::get_one))
}
```
- **One router module per feature/domain**, merged in `routes/mod.rs`.
- Routers are `Router<AppState>` until `with_state` is applied in `build_app`, keeping them relocatable and independently testable.

## Handlers (thin: extract → service → response)
```rust
// src/handlers/users.rs
use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};

use crate::{error::AppError, service, state::AppState};

#[derive(serde::Deserialize)]
pub struct CreateUser {
    pub email: String,
}

#[derive(serde::Serialize)]
pub struct User {
    pub id: i64,
    pub email: String,
}

pub async fn get_one(
    State(state): State<AppState>,      // shared state
    Path(id): Path<i64>,                 // path param
) -> Result<Json<User>, AppError> {
    let user = service::users::fetch(&state, id).await?;   // ? not unwrap
    Ok(Json(user))
}

pub async fn create(
    State(state): State<AppState>,
    Json(input): Json<CreateUser>,       // JSON body
) -> Result<(StatusCode, Json<User>), AppError> {
    let user = service::users::create(&state, input).await?;
    Ok((StatusCode::CREATED, Json(user)))
}

pub async fn list(State(state): State<AppState>) -> Result<Json<Vec<User>>, AppError> {
    Ok(Json(service::users::list(&state).await?))
}
```
- Handlers extract (`State`, `Path`, `Json`), call a service, and map to a response — nothing more.
- No SQL, no business rules, no `unwrap` here.

## Service (business logic)
```rust
// src/service/users.rs
use crate::{
    error::AppError,
    handlers::users::{CreateUser, User},
    repository, state::AppState,
};

pub async fn fetch(state: &AppState, id: i64) -> Result<User, AppError> {
    repository::users::find(&state.pool, id)
        .await?
        .ok_or(AppError::NotFound)
}

pub async fn create(state: &AppState, input: CreateUser) -> Result<User, AppError> {
    if !input.email.contains('@') {
        return Err(AppError::Validation("email is invalid".into()));
    }
    repository::users::insert(&state.pool, &input.email).await
}

pub async fn list(state: &AppState) -> Result<Vec<User>, AppError> {
    repository::users::all(&state.pool).await
}
```
- Services own validation and orchestration; they take `&AppState` (or just the pool) and return `Result<_, AppError>`.

## Repository (`sqlx` — the only place SQL lives)
```rust
// src/repository/users.rs
use sqlx::PgPool;

use crate::handlers::users::User;

pub async fn find(pool: &PgPool, id: i64) -> Result<Option<User>, sqlx::Error> {
    sqlx::query_as!(User, "SELECT id, email FROM users WHERE id = $1", id)
        .fetch_optional(pool)
        .await
}

pub async fn insert(pool: &PgPool, email: &str) -> Result<User, sqlx::Error> {
    sqlx::query_as!(
        User,
        "INSERT INTO users (email) VALUES ($1) RETURNING id, email",
        email
    )
    .fetch_one(pool)
    .await
}

pub async fn all(pool: &PgPool) -> Result<Vec<User>, sqlx::Error> {
    sqlx::query_as!(User, "SELECT id, email FROM users ORDER BY id")
        .fetch_all(pool)
        .await
}
```
- All queries are async and use the pool from `AppState` — never a blocking driver, never a global connection.
- `sqlx::Error` converts into `AppError` via `#[from]`, so services can `?` these calls.

## Testing (Built From the App)
The factory is *why* this is testable: build the exact same `Router` and drive it in-process with `tower::ServiceExt::oneshot` — no bound socket, no running server.
```rust
// tests/users.rs
use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use tower::ServiceExt;   // for `oneshot`

use myapp::{app::build_app, state::AppState, config::Config};

async fn test_state() -> AppState {
    let config = Config::from_env().expect("test config");   // point at a test DB
    AppState::new(config).await.expect("state")
}

#[tokio::test]
async fn get_missing_user_is_404() {
    let app = build_app(test_state().await);

    let response = app
        .oneshot(
            Request::builder()
                .uri("/users/999999")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}
```
- Tests build the app via `build_app` and send requests with `oneshot` — every test gets an isolated `Router` with no global state.
- `.unwrap()` is fine **in tests** (per the base Rust standard) — never in handlers.

## Tooling
- **Runtime**: Tokio (`#[tokio::main]`); serve with `axum::serve` + graceful shutdown.
- **Middleware**: `tower` / `tower-http` layers (`TraceLayer`, `TimeoutLayer`, compression, CORS) applied in `build_app`.
- **DB/Migrations**: `sqlx` with a `PgPool`; commit the `migrations/` folder. Use `query_as!` for compile-time-checked queries.
- **Observability**: `tracing` + `tracing-subscriber`; structured logs, no `println!`.
- **Formatting**: `cargo fmt` — enforced in CI (per base Rust standard).
- **Linting**: `cargo clippy -- -D warnings` — warnings are errors.
- **Testing**: `cargo test` with `oneshot`-driven app tests.

## Anti-Patterns (Rejected by This Standard)
- ❌ `.unwrap()` / `.expect()` / `panic!` on the request path (handlers, services) instead of returning `AppError` via `?`.
- ❌ Global mutable state: `static mut`, `lazy_static!`/`once_cell` singletons holding a pool, client, or config instead of `AppState` + `State`.
- ❌ Business logic or SQL inside handlers instead of `service/` and `repository/`.
- ❌ Blocking calls inside async (`std::fs`, `std::thread::sleep`, blocking DB/HTTP clients) — starves the Tokio runtime; use async equivalents or `spawn_blocking`.
- ❌ Panics as error handling — a panicking handler aborts the task and returns an opaque 500 with no uniform JSON body.
- ❌ Assembling routes/middleware in `main` instead of `build_app`, making the running config untestable.
- ❌ Secrets or connection strings hardcoded in source instead of read from the environment.
