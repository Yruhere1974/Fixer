# Phoenix Standards — Application Architecture

> Deep-dive standard for Phoenix 1.7 apps and APIs in the Ummard/Simon ecosystem.
> **Mandate:** all business logic lives in **contexts** (`lib/my_app/`); the web layer (`lib/my_app_web/`) stays thin.
> Calling `Repo` directly from a controller, or putting business logic in the web layer, is **not** an acceptable baseline — it couples HTTP to persistence, defeats the context boundary Phoenix exists to give you, and makes the domain untestable without a connection.

See [`../README.md`](../README.md) for base Elixir conventions (naming, tooling, "let it crash"). This document layers the Phoenix-specific architecture on top.

## The Non-Negotiable Rules
1. **Contexts are the business-logic boundary** — every domain operation is a public function on a context module (`MyApp.Accounts`, `MyApp.Billing`). The web layer knows contexts; it never knows `Repo`, schemas, or queries.
2. **Controllers stay thin** — a controller action pattern-matches params, calls exactly one context function, and renders the result. No queries, no changesets, no `Repo`.
3. **All writes go through Ecto changesets** — inserts and updates are built with `cast/3` + validations. A bare `Repo.insert(%User{...})` that skips a changeset is rejected.

Everything below follows from these three rules.

## Prescribed Structure
```text
project_root/
├── lib/
│   ├── my_app/                        # THE DOMAIN — no web/HTTP knowledge here
│   │   ├── application.ex             # OTP supervision tree
│   │   ├── repo.ex                    # the ONLY module that talks to the DB
│   │   ├── accounts.ex                # Accounts context — public domain API
│   │   ├── accounts/
│   │   │   └── user.ex                # Ecto schema + changesets (owned by Accounts)
│   │   └── billing.ex                 # another bounded context
│   ├── my_app_web/                    # THE WEB LAYER — thin, calls contexts only
│   │   ├── endpoint.ex                # plug pipeline entrypoint
│   │   ├── router.ex                  # routes → controllers/live views
│   │   ├── telemetry.ex
│   │   ├── controllers/
│   │   │   ├── user_controller.ex
│   │   │   ├── user_json.ex           # render/2 clauses (JSON API)
│   │   │   ├── fallback_controller.ex # uniform error → response mapping
│   │   │   ├── error_json.ex
│   │   │   └── error_html.ex
│   │   ├── components/                # 1.7 function components + core_components.ex
│   │   │   ├── core_components.ex
│   │   │   └── layouts.ex
│   │   ├── live/                      # LiveViews (stateful UI)
│   │   └── plugs/                     # custom plugs (auth, etc.)
│   └── my_app.ex
├── priv/repo/migrations/              # Ecto migrations — committed
├── config/
│   ├── config.exs                     # compile-time, env-agnostic
│   ├── dev.exs
│   ├── test.exs
│   └── runtime.exs                    # RUNTIME config — reads System.get_env/1
├── test/
│   ├── support/
│   │   ├── data_case.ex               # context/schema test case
│   │   ├── conn_case.ex               # controller/request test case
│   │   └── fixtures/ (or factory.ex)
│   ├── my_app/accounts_test.exs       # DataCase — domain tests
│   └── my_app_web/controllers/user_controller_test.exs  # ConnCase
├── mix.exs
├── mix.lock
└── .gitignore
```
The `lib/my_app/` vs `lib/my_app_web/` split is the whole point: the domain compiles and is tested with **zero** web dependencies.

## The Context (Bounded Domain)
A context is the public API of a slice of your domain. It wraps `Repo`, owns its schemas, and returns tagged tuples or plain structs — never `Ecto.Query` or `Plug.Conn`.

```elixir
# lib/my_app/accounts.ex
defmodule MyApp.Accounts do
  @moduledoc "The Accounts bounded context: users and authentication."

  import Ecto.Query, warn: false

  alias MyApp.Repo
  alias MyApp.Accounts.User

  @spec list_users() :: [User.t()]
  def list_users do
    Repo.all(User)
  end

  @spec get_user!(integer()) :: User.t()
  def get_user!(id), do: Repo.get!(User, id)

  @spec get_user(integer()) :: User.t() | nil
  def get_user(id), do: Repo.get(User, id)

  @spec create_user(map()) :: {:ok, User.t()} | {:error, Ecto.Changeset.t()}
  def create_user(attrs) do
    %User{}
    |> User.changeset(attrs)          # writes ALWAYS go through a changeset
    |> Repo.insert()
  end

  @spec update_user(User.t(), map()) :: {:ok, User.t()} | {:error, Ecto.Changeset.t()}
  def update_user(%User{} = user, attrs) do
    user
    |> User.changeset(attrs)
    |> Repo.update()
  end

  @spec delete_user(User.t()) :: {:ok, User.t()} | {:error, Ecto.Changeset.t()}
  def delete_user(%User{} = user), do: Repo.delete(user)

  @doc "Returns a changeset for tracking form/UI changes (LiveView, `Phoenix.HTML.Form`)."
  def change_user(%User{} = user, attrs \\ %{}), do: User.changeset(user, attrs)
end
```
- **One context per bounded domain** (`Accounts`, `Billing`, `Catalog`) — not one per schema.
- The context is the **only** module that references `Repo` for its domain.
- Return values are domain-shaped (`{:ok, struct}` / `{:error, changeset}` / structs / `nil`), never `Repo`- or `Conn`-shaped.

## Ecto Schema + Changeset (Validation)
The schema owns its changesets. Validation lives here, next to the data — not in the controller.

```elixir
# lib/my_app/accounts/user.ex
defmodule MyApp.Accounts.User do
  use Ecto.Schema
  import Ecto.Changeset

  @type t :: %__MODULE__{}

  schema "users" do
    field :email, :string
    field :name, :string
    field :active, :boolean, default: true

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(user, attrs) do
    user
    |> cast(attrs, [:email, :name, :active])
    |> validate_required([:email, :name])
    |> validate_format(:email, ~r/@/)
    |> unique_constraint(:email)
  end
end
```
- Keep schemas **thin**: fields, `changeset/2` functions, and cast/validation. No `Repo` calls, no cross-context orchestration.
- Multiple changesets per schema are fine (`registration_changeset`, `password_changeset`) — validation, not persistence, is the schema's job.

## The Controller (Thin, Delegates to a Context)
```elixir
# lib/my_app_web/controllers/user_controller.ex
defmodule MyAppWeb.UserController do
  use MyAppWeb, :controller

  alias MyApp.Accounts
  alias MyApp.Accounts.User

  action_fallback MyAppWeb.FallbackController

  def index(conn, _params) do
    users = Accounts.list_users()
    render(conn, :index, users: users)
  end

  def create(conn, %{"user" => user_params}) do
    # `with` unwraps the happy path; anything else falls through to action_fallback
    with {:ok, %User{} = user} <- Accounts.create_user(user_params) do
      conn
      |> put_status(:created)
      |> put_resp_header("location", ~p"/api/users/#{user}")
      |> render(:show, user: user)
    end
  end

  def show(conn, %{"id" => id}) do
    user = Accounts.get_user!(id)
    render(conn, :show, user: user)
  end
end
```
- The controller **never** builds a query, a changeset, or calls `Repo`. It calls a context function and renders.
- `with` chains keep actions flat; every non-`{:ok, _}` result is delegated to the fallback controller.
- `~p"/api/users/#{user}"` is the 1.7 verified route sigil — compile-time-checked paths.

## The JSON View (1.7 Function Components)
Phoenix 1.7 replaces view modules with plain render functions.

```elixir
# lib/my_app_web/controllers/user_json.ex
defmodule MyAppWeb.UserJSON do
  alias MyApp.Accounts.User

  def index(%{users: users}), do: %{data: for(u <- users, do: data(u))}
  def show(%{user: user}), do: %{data: data(user)}

  defp data(%User{} = user) do
    %{id: user.id, email: user.email, name: user.name, active: user.active}
  end
end
```

## The FallbackController (Uniform Error Handling)
`action_fallback` funnels every non-happy-path return from every controller through one place, so error-to-HTTP mapping is defined once.

```elixir
# lib/my_app_web/controllers/fallback_controller.ex
defmodule MyAppWeb.FallbackController do
  use MyAppWeb, :controller

  # Changeset validation failure → 422 with the errors rendered
  def call(conn, {:error, %Ecto.Changeset{} = changeset}) do
    conn
    |> put_status(:unprocessable_entity)
    |> put_view(json: MyAppWeb.ChangesetJSON)
    |> render(:error, changeset: changeset)
  end

  # Domain "not found" → 404
  def call(conn, {:error, :not_found}) do
    conn
    |> put_status(:not_found)
    |> put_view(json: MyAppWeb.ErrorJSON)
    |> render(:"404")
  end

  # Domain "unauthorized" → 403
  def call(conn, {:error, :unauthorized}) do
    conn
    |> put_status(:forbidden)
    |> put_view(json: MyAppWeb.ErrorJSON)
    |> render(:"403")
  end
end
```
This is *why* controllers can use `with` and return domain tuples directly: the fallback is the single translation layer from domain results to HTTP responses.

## Plugs
Cross-cutting request concerns (auth, request scoping, headers) are **plugs** — composable `conn -> conn` transforms wired in the router pipeline, not logic smuggled into controllers.

```elixir
# lib/my_app_web/plugs/require_auth.ex
defmodule MyAppWeb.Plugs.RequireAuth do
  import Plug.Conn
  import Phoenix.Controller, only: [put_view: 2, render: 2]

  def init(opts), do: opts

  def call(conn, _opts) do
    case get_session(conn, :user_id) do
      nil ->
        conn
        |> put_status(:unauthorized)
        |> put_view(json: MyAppWeb.ErrorJSON)
        |> render(:"401")
        |> halt()

      user_id ->
        assign(conn, :current_user, MyApp.Accounts.get_user(user_id))
    end
  end
end
```
```elixir
# lib/my_app_web/router.ex
pipeline :api do
  plug :accepts, ["json"]
end

pipeline :authenticated do
  plug MyAppWeb.Plugs.RequireAuth
end

scope "/api", MyAppWeb do
  pipe_through [:api, :authenticated]
  resources "/users", UserController, except: [:new, :edit]
end
```

## Configuration (`config/runtime.exs`)
Anything that varies per deployment — secrets, database URLs, hosts — is read from the environment at **runtime**, not baked in at compile time.

```elixir
# config/runtime.exs
import Config

if config_env() == :prod do
  database_url =
    System.get_env("DATABASE_URL") ||
      raise "environment variable DATABASE_URL is missing"

  config :my_app, MyApp.Repo,
    url: database_url,
    pool_size: String.to_integer(System.get_env("POOL_SIZE") || "10")

  secret_key_base =
    System.get_env("SECRET_KEY_BASE") ||
      raise "environment variable SECRET_KEY_BASE is missing"

  config :my_app, MyAppWeb.Endpoint,
    url: [host: System.get_env("PHX_HOST") || "example.com", port: 443, scheme: "https"],
    secret_key_base: secret_key_base
end
```
- `runtime.exs` runs on boot in the release — the correct place for `System.get_env/1`. `config.exs`/`dev.exs` are compile-time and env-agnostic.
- **Never** hardcode secrets in source; `raise` on missing required vars so prod fails fast.

## LiveView vs. Controller
- **Controller (+ JSON/HTML render):** stateless request/response — REST/JSON APIs, form POSTs, redirects, anything a client consumes over plain HTTP.
- **LiveView:** stateful, server-rendered interactive UI over a websocket — live-updating dashboards, multi-step forms, anything you'd otherwise reach for client-side JS to do.
- Both are strictly **web-layer**. Whichever you choose, it calls the **same context functions** — the domain does not know or care which one invoked it. A feature is never "a LiveView feature" or "a controller feature"; it's a context with a web front door.

## Testing
Two case templates split the domain from the web, mirroring the code layout.

**`DataCase` — context and schema tests (no HTTP):**
```elixir
# test/my_app/accounts_test.exs
defmodule MyApp.AccountsTest do
  use MyApp.DataCase, async: true

  alias MyApp.Accounts

  describe "create_user/1" do
    test "with valid attrs creates a user" do
      assert {:ok, user} = Accounts.create_user(%{email: "a@b.com", name: "Ada"})
      assert user.email == "a@b.com"
    end

    test "with invalid attrs returns an error changeset" do
      assert {:error, %Ecto.Changeset{}} = Accounts.create_user(%{name: "x"})
    end
  end
end
```

**`ConnCase` — controller/request tests (through the plug pipeline):**
```elixir
# test/my_app_web/controllers/user_controller_test.exs
defmodule MyAppWeb.UserControllerTest do
  use MyAppWeb.ConnCase, async: true

  import MyApp.AccountsFixtures

  describe "POST /api/users" do
    test "renders user when data is valid", %{conn: conn} do
      conn = post(conn, ~p"/api/users", user: %{email: "a@b.com", name: "Ada"})
      assert %{"id" => _id} = json_response(conn, 201)["data"]
    end

    test "renders 422 when data is invalid", %{conn: conn} do
      conn = post(conn, ~p"/api/users", user: %{name: ""})
      assert json_response(conn, 422)["errors"] != %{}
    end
  end
end
```
- Both cases run inside `Ecto.Adapters.SQL.Sandbox`, so each test gets an isolated transaction rolled back at teardown — `async: true` is safe.
- Build test data with **factories (ExMachina)** or generated **fixtures** — never hand-roll `Repo.insert!` in tests; go through the same changeset the app uses.

```elixir
# test/support/factory.ex  (ExMachina)
defmodule MyApp.Factory do
  use ExMachina.Ecto, repo: MyApp.Repo

  def user_factory do
    %MyApp.Accounts.User{email: sequence(:email, &"user#{&1}@ex.com"), name: "User"}
  end
end
```

## Tooling
- **Build/Deps**: Mix; commit `mix.lock`.
- **Formatting**: `mix format` (built-in, enforced in CI) — see base Elixir standard.
- **Linting**: Credo (`mix credo --strict`).
- **Static Analysis**: Dialyzer via Dialyxir on the specs above.
- **Testing**: ExUnit with `DataCase` + `ConnCase` and the SQL sandbox.
- **Migrations**: Ecto migrations in `priv/repo/migrations/` — committed, never edited after deploy.

## Anti-Patterns (Rejected by This Standard)
- ❌ Business logic in a controller (queries, validations, orchestration) instead of in a context.
- ❌ Calling `Repo` — or importing `Ecto.Query` — from the web layer (`lib/my_app_web/`).
- ❌ Fat schemas that call `Repo`, hit external services, or orchestrate other schemas. Schemas hold fields and changesets only.
- ❌ Skipping changesets on writes (`Repo.insert(%User{...})` with unvalidated data).
- ❌ Cross-context coupling: one context calling another's `Repo`/schema directly, or a controller reaching into `MyApp.Accounts.User` internals instead of going through `MyApp.Accounts`.
- ❌ Per-schema "contexts" (a `Users` context, a `Posts` context) that just proxy `Repo` — contexts are bounded **domains**, not table wrappers.
- ❌ Reading secrets from `config.exs` at compile time instead of `runtime.exs` via `System.get_env/1`.
