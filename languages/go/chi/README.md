# chi + net/http Standards — Application Architecture

> Deep-dive standard for chi + net/http services in the Ummard/Simon ecosystem.
> **Mandate:** every non-trivial HTTP service wires its dependencies explicitly through **constructors and a composition root in `main.go`**.
> Package-level global state, business logic inside handlers, and ignored error returns are **not** acceptable — they are untestable, hide side effects, and swallow failures. They are rejected by this standard.

See [`../README.md`](../README.md) for base Go conventions (naming, tooling). This document layers the chi + net/http service architecture on top.

## The Non-Negotiable Rules
1. **Dependencies are injected explicitly** via struct fields and constructor functions — never package-level `var db *sql.DB` or shared singletons. `main.go` is the only place graph construction happens.
2. **Layout is `cmd/` + `internal/`** — `cmd/app/main.go` is the entrypoint; all wiring lives under `internal/`, unimportable by other repos.
3. **Every error is handled** — no `_ =` on a call that returns an `error`, no bare `return err` where context is lost. Wrap with `fmt.Errorf("...: %w", err)`.
4. **`context.Context` is propagated** from the request through service to repository as the first argument — never stored in a struct, never `context.Background()` mid-request.

Everything below follows from these four rules.

## Prescribed Structure
```text
project_root/
├── cmd/
│   └── app/
│       └── main.go                 # composition root — the ONLY place the graph is built
├── internal/
│   ├── config/
│   │   └── config.go               # env-driven Config, loaded once at startup
│   ├── http/
│   │   ├── router.go               # chi router: middleware + sub-router mounting
│   │   ├── server.go               # http.Server construction + graceful shutdown
│   │   ├── users.go                # UserHandler: thin struct holding a *service.UserService
│   │   ├── response.go             # writeJSON / writeError helpers
│   │   └── users_test.go
│   ├── service/
│   │   ├── user.go                 # UserService: business logic; depends on a repo INTERFACE
│   │   └── user_test.go
│   └── repository/
│       ├── user.go                 # UserRepo: concrete Postgres implementation
│       └── memory.go               # in-memory impl for tests / local dev
├── go.mod
├── go.sum
├── .env.example                    # documented env vars, NO secrets
└── .gitignore
```
- **One package per layer boundary** (`http`, `service`, `repository`), not one giant `app` package.
- Handlers live in `internal/http`; they never touch the database directly — they call the service.

## The Composition Root (`main.go`)
`main.go` constructs the graph top-down — config → repository → service → handlers → router — then runs the server with graceful shutdown. Nothing is global; every dependency is passed in.

```go
// cmd/app/main.go
package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/example/app/internal/config"
	apphttp "github.com/example/app/internal/http"
	"github.com/example/app/internal/repository"
	"github.com/example/app/internal/service"
)

func main() {
	if err := run(); err != nil {
		slog.Error("startup failed", "err", err)
		os.Exit(1)
	}
}

func run() error {
	// signal.NotifyContext cancels ctx on SIGINT/SIGTERM — the shutdown trigger.
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))

	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}

	// Build the graph bottom-up: repo → service → handler → router.
	userRepo := repository.NewUserRepo(cfg.DatabaseURL)
	userSvc := service.NewUserService(userRepo)
	router := apphttp.NewRouter(logger, apphttp.NewUserHandler(userSvc))

	srv := &http.Server{
		Addr:         cfg.Addr,
		Handler:      router,
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	// Run the server in a goroutine so main can wait on the shutdown signal.
	serverErr := make(chan error, 1)
	go func() {
		logger.Info("listening", "addr", cfg.Addr)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			serverErr <- err
		}
	}()

	select {
	case err := <-serverErr:
		return fmt.Errorf("server error: %w", err)
	case <-ctx.Done():
		logger.Info("shutdown signal received")
	}

	// Give in-flight requests up to 10s to finish before forcing close.
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		return fmt.Errorf("graceful shutdown: %w", err)
	}
	return nil
}
```
`run()` returning an `error` (rather than calling `log.Fatal` inline) keeps `main` a two-line shell and makes the startup path testable.

## The Router (chi sub-routers + middleware)
The router is constructed with its handler dependencies passed in — it holds no globals. Cross-cutting concerns are middleware; feature routes are mounted as sub-routers via `r.Route`.

```go
// internal/http/router.go
package http

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

func NewRouter(logger *slog.Logger, users *UserHandler) http.Handler {
	r := chi.NewRouter()

	// Global middleware — applied to every request, outermost first.
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(15 * time.Second))

	r.Get("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	// Versioned API mounted as a sub-router.
	r.Route("/api/v1", func(r chi.Router) {
		// r.Group applies middleware to a subtree without a path prefix.
		r.Group(func(r chi.Router) {
			r.Use(middleware.AllowContentType("application/json"))
			r.Mount("/users", users.Routes())
		})
	})

	return r
}
```
```go
// internal/http/users.go
package http

import (
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/example/app/internal/service"
)

// UserHandler is a THIN struct: it holds deps and translates HTTP ↔ service.
type UserHandler struct {
	svc *service.UserService
}

func NewUserHandler(svc *service.UserService) *UserHandler {
	return &UserHandler{svc: svc}
}

// Routes returns this feature's sub-router, mounted by the parent in router.go.
func (h *UserHandler) Routes() chi.Router {
	r := chi.NewRouter()
	r.Get("/{id}", h.getUser)
	r.Post("/", h.createUser)
	return r
}

func (h *UserHandler) getUser(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	// Propagate the request context into the service call.
	user, err := h.svc.GetUser(r.Context(), id)
	if err != nil {
		if errors.Is(err, service.ErrNotFound) {
			writeError(w, http.StatusNotFound, "user not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	writeJSON(w, http.StatusOK, user)
}
```
- Each feature owns a `Routes() chi.Router` method; the parent mounts it. Prefixes are set at the mount point (`/users`), keeping handlers relocatable.
- Handlers do **only** HTTP concerns: parse input, call the service, map errors to status codes, serialize output. No business rules, no SQL.

## The JSON Response Helper
A small, shared helper keeps every handler's error handling explicit and uniform — and note that `Encode`'s error is not ignored.

```go
// internal/http/response.go
package http

import (
	"encoding/json"
	"log/slog"
	"net/http"
)

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		// Header is already sent; we can only log, not change the status.
		slog.Error("encode response", "err", err)
	}
}

type errorBody struct {
	Error string `json:"error"`
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, errorBody{Error: msg})
}
```

## The Service Layer (business logic + interface-based DI)
The service holds the business rules. It depends on a **repository interface it declares itself** — "accept interfaces, return structs" — so it can be tested against a fake with no database.

```go
// internal/service/user.go
package service

import (
	"context"
	"errors"
	"fmt"
)

var ErrNotFound = errors.New("not found")

type User struct {
	ID    string `json:"id"`
	Email string `json:"email"`
}

// UserRepo is the dependency contract, defined by the CONSUMER (the service).
type UserRepo interface {
	FindByID(ctx context.Context, id string) (User, error)
	Insert(ctx context.Context, u User) error
}

type UserService struct {
	repo UserRepo
}

// NewUserService injects the repo — no global, no init().
func NewUserService(repo UserRepo) *UserService {
	return &UserService{repo: repo}
}

func (s *UserService) GetUser(ctx context.Context, id string) (User, error) {
	if id == "" {
		return User{}, fmt.Errorf("get user: %w", ErrNotFound)
	}
	u, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return User{}, fmt.Errorf("get user %q: %w", id, err)
	}
	return u, nil
}
```
- The service returns a **concrete `*UserService`** but accepts the **`UserRepo` interface** — the canonical Go DI shape.
- Sentinel errors (`ErrNotFound`) let the handler map failures to HTTP status via `errors.Is`, without the service knowing anything about HTTP.

## The Repository Layer
The repository is the concrete implementation of the interface the service declared. It is the only layer that talks to the database.

```go
// internal/repository/user.go
package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/example/app/internal/service"
)

type UserRepo struct {
	db *sql.DB
}

func NewUserRepo(db *sql.DB) *UserRepo {
	return &UserRepo{db: db}
}

func (r *UserRepo) FindByID(ctx context.Context, id string) (service.User, error) {
	var u service.User
	// QueryRowContext propagates the request context to the driver.
	err := r.db.QueryRowContext(ctx,
		`SELECT id, email FROM users WHERE id = $1`, id,
	).Scan(&u.ID, &u.Email)

	switch {
	case errors.Is(err, sql.ErrNoRows):
		return service.User{}, service.ErrNotFound
	case err != nil:
		return service.User{}, fmt.Errorf("query user %q: %w", id, err)
	}
	return u, nil
}

func (r *UserRepo) Insert(ctx context.Context, u service.User) error {
	if _, err := r.db.ExecContext(ctx,
		`INSERT INTO users (id, email) VALUES ($1, $2)`, u.ID, u.Email,
	); err != nil {
		return fmt.Errorf("insert user %q: %w", u.ID, err)
	}
	return nil
}
```

## Configuration (from env)
Config is loaded once at startup and passed into constructors — it is never read via `os.Getenv` deep inside a handler.

```go
// internal/config/config.go
package config

import (
	"fmt"
	"os"
)

type Config struct {
	Addr        string
	DatabaseURL string
}

func Load() (Config, error) {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		return Config{}, fmt.Errorf("DATABASE_URL is required") // fail fast
	}

	addr := os.Getenv("APP_ADDR")
	if addr == "" {
		addr = ":8080" // sensible default
	}

	return Config{Addr: addr, DatabaseURL: dbURL}, nil
}
```
- Required variables fail fast at startup; optional ones get documented defaults.
- Commit `.env.example` documenting every variable; never commit `.env` or hardcode secrets.

## Testing (table-driven + httptest against fakes)
Because every dependency is injected, handlers are tested with a fake repo and `net/http/httptest` — no server, no database.

```go
// internal/service/user_test.go
package service

import (
	"context"
	"errors"
	"testing"
)

// fakeRepo is an in-memory implementation of the UserRepo interface.
type fakeRepo struct {
	users map[string]User
}

func (f *fakeRepo) FindByID(_ context.Context, id string) (User, error) {
	u, ok := f.users[id]
	if !ok {
		return User{}, ErrNotFound
	}
	return u, nil
}
func (f *fakeRepo) Insert(_ context.Context, u User) error {
	f.users[u.ID] = u
	return nil
}

func TestGetUser(t *testing.T) {
	repo := &fakeRepo{users: map[string]User{"1": {ID: "1", Email: "a@b.com"}}}
	svc := NewUserService(repo)

	tests := []struct {
		name    string
		id      string
		want    string
		wantErr error
	}{
		{name: "found", id: "1", want: "a@b.com"},
		{name: "missing", id: "2", wantErr: ErrNotFound},
		{name: "empty id", id: "", wantErr: ErrNotFound},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := svc.GetUser(context.Background(), tt.id)
			if !errors.Is(err, tt.wantErr) {
				t.Fatalf("err = %v, want %v", err, tt.wantErr)
			}
			if tt.wantErr == nil && got.Email != tt.want {
				t.Errorf("email = %q, want %q", got.Email, tt.want)
			}
		})
	}
}
```
```go
// internal/http/users_test.go
package http

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/example/app/internal/service"
)

func TestGetUserHandler(t *testing.T) {
	repo := &fakeRepo{users: map[string]service.User{"1": {ID: "1", Email: "a@b.com"}}}
	h := NewUserHandler(service.NewUserService(repo))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/users/1", nil)
	rec := httptest.NewRecorder()

	// Exercise the real router so middleware + routing are covered.
	NewRouter(discardLogger(), h).ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d; body = %s", rec.Code, http.StatusOK, rec.Body)
	}
}
```
Injected dependencies are *why* this is testable: each test builds its own graph with an in-memory repo and zero global state.

## Tooling
- **Formatting**: `gofmt` / `goimports` — non-negotiable, enforced in CI (per base Go standard).
- **Linting**: `golangci-lint` with the project ruleset; enable `errcheck` so ignored errors fail the build.
- **Routing**: `github.com/go-chi/chi/v5` — stdlib-compatible `http.Handler`; no heavy framework.
- **Testing**: `go test ./...` with table-driven tests + `net/http/httptest`; no external test runner.
- **Server**: stdlib `http.Server` with explicit timeouts and graceful shutdown — never `http.ListenAndServe` with a nil-timeout default server in production.

## Anti-Patterns (Rejected by This Standard)
- ❌ Package-level global state — `var db *sql.DB` / `var router = chi.NewRouter()` shared across the package instead of injected via constructors.
- ❌ Business logic in handlers — SQL queries, validation rules, or domain decisions inside an `http.HandlerFunc` instead of in the service layer.
- ❌ Ignoring returned errors — `_ = json.NewEncoder(w).Encode(v)` or a bare call that drops an `error`, instead of handling or wrapping it.
- ❌ `init()` for wiring — building the dependency graph in `func init()` instead of explicitly in `main.go`'s composition root.
- ❌ Over-large packages — a single `app` or `handlers` package holding routing, business logic, and SQL instead of `http` / `service` / `repository` boundaries.
- ❌ Dropping `context.Context` — calling `context.Background()` mid-request or storing a context in a struct instead of passing `r.Context()` down the call chain.
