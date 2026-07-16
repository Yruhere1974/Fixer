# Flask Standards — Application Architecture

> Deep-dive standard for Flask apps in the Ummard/Simon ecosystem.
> **Mandate:** every non-trivial Flask app uses the **application-factory + blueprint** pattern.
> A flat single-file `app.py` with a module-level `app = Flask(__name__)` is **not** an acceptable baseline — it is untestable, forces circular imports, and binds extensions to a single hardcoded app.

See [`../README.md`](../README.md) for base Python conventions (naming, tooling). This document layers the Flask-specific architecture on top.

## The Two Non-Negotiable Rules
1. **App is built only inside `create_app()`** — never a module-level `app` at import time.
2. **Extensions are instantiated unbound** in `extensions.py`, then bound to the app via `init_app()` inside the factory.

Everything below follows from these two rules.

## Prescribed Structure
```text
project_root/
├── src/
│   └── myapp/
│       ├── __init__.py              # create_app() factory — the ONLY place an app is built
│       ├── config.py                # Config classes (Base/Dev/Prod/Test), env-driven
│       ├── extensions.py            # db, migrate, login_manager … instantiated UNBOUND
│       ├── errors.py                # app-wide error handlers
│       ├── cli.py                   # custom `flask` CLI commands
│       ├── blueprints/
│       │   ├── __init__.py
│       │   ├── auth/
│       │   │   ├── __init__.py      # bp = Blueprint("auth", __name__)
│       │   │   ├── routes.py
│       │   │   ├── models.py
│       │   │   ├── forms.py
│       │   │   └── templates/auth/  # blueprint-scoped templates
│       │   └── api/
│       │       ├── __init__.py      # bp = Blueprint("api", __name__)
│       │       ├── routes.py
│       │       └── schemas.py
│       ├── static/
│       └── templates/               # base/shared templates only
├── migrations/                      # Alembic (flask-migrate) — committed
├── tests/
│   ├── conftest.py                  # app/client/db fixtures built from create_app()
│   └── test_auth.py
├── wsgi.py                          # entrypoint: from myapp import create_app
├── pyproject.toml
├── .env.example                     # documented env vars, NO secrets
└── .gitignore
```

## The Application Factory
```python
# src/myapp/__init__.py
from flask import Flask

from .config import Config
from .extensions import db, migrate, login_manager


def create_app(config_class: type[Config] = Config) -> Flask:
    app = Flask(__name__)
    app.config.from_object(config_class)

    register_extensions(app)
    register_blueprints(app)
    register_errorhandlers(app)
    register_cli(app)

    return app


def register_extensions(app: Flask) -> None:
    db.init_app(app)                      # bind each extension to THIS app
    migrate.init_app(app, db)
    login_manager.init_app(app)


def register_blueprints(app: Flask) -> None:
    from .blueprints.auth import bp as auth_bp
    from .blueprints.api import bp as api_bp

    app.register_blueprint(auth_bp)                       # url_prefix set at registration…
    app.register_blueprint(api_bp, url_prefix="/api")     # …not hardcoded in the blueprint


def register_errorhandlers(app: Flask) -> None:
    from .errors import register as register_errors
    register_errors(app)


def register_cli(app: Flask) -> None:
    from .cli import register as register_commands
    register_commands(app)
```

## Extensions (Unbound)
```python
# src/myapp/extensions.py
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_login import LoginManager

db = SQLAlchemy()          # NO app here — bound later via init_app()
migrate = Migrate()
login_manager = LoginManager()
login_manager.login_view = "auth.login"
```
Instantiating extensions here (module level, appless) is what lets multiple apps — notably the test app — coexist. Binding happens once per app in the factory.

## Configuration
```python
# src/myapp/config.py
import os


class Config:
    SECRET_KEY = os.environ["SECRET_KEY"]                 # fail fast if missing
    SQLALCHEMY_DATABASE_URI = os.environ["DATABASE_URL"]
    SQLALCHEMY_TRACK_MODIFICATIONS = False


class DevConfig(Config):
    DEBUG = True


class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    WTF_CSRF_ENABLED = False


class ProdConfig(Config):
    pass
```
- Config via classes selected by environment; **never** hardcode secrets — read from env.
- Commit `.env.example` documenting every variable; never commit `.env`.

## Defining a Blueprint
```python
# src/myapp/blueprints/auth/__init__.py
from flask import Blueprint

# template_folder is relative to this package → blueprint-scoped templates
bp = Blueprint("auth", __name__, template_folder="templates")

from . import routes  # noqa: E402,F401  (import at bottom to register routes, avoid circular import)
```
```python
# src/myapp/blueprints/auth/routes.py
from flask import render_template, redirect, url_for

from . import bp


@bp.route("/login", methods=["GET", "POST"])
def login():
    # url_for uses the blueprint name: "auth.login"
    return render_template("auth/login.html")


@bp.route("/logout")
def logout():
    return redirect(url_for("auth.login"))
```
- **One blueprint per feature/domain** (`auth`, `api`, `admin`, `billing`), not per file.
- `url_prefix` is applied at **registration**, keeping blueprints relocatable.
- Reference endpoints as `blueprint_name.view` in `url_for`.
- Blueprint-scoped `templates/<bp>/…` and `static/` keep features self-contained.

## Models
```python
# src/myapp/blueprints/auth/models.py
from myapp.extensions import db


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
```
- Models import `db` from `extensions`, never from the app package (prevents circular imports).
- Keep models beside the blueprint that owns them; share cross-cutting models via a `models/` package.

## Error Handlers
```python
# src/myapp/errors.py
from flask import Flask, jsonify, render_template


def register(app: Flask) -> None:
    @app.errorhandler(404)
    def not_found(err):
        return render_template("errors/404.html"), 404

    @app.errorhandler(500)
    def server_error(err):
        return jsonify(error="internal server error"), 500
```

## Custom CLI Commands
```python
# src/myapp/cli.py
import click
from flask import Flask

from .extensions import db


def register(app: Flask) -> None:
    @app.cli.command("init-db")
    def init_db() -> None:
        """Create all tables."""
        db.create_all()
        click.echo("Database initialized.")
```

## Entrypoint
```python
# wsgi.py
from myapp import create_app

app = create_app()   # gunicorn wsgi:app  /  flask --app wsgi run
```

## Testing (Built From the Factory)
```python
# tests/conftest.py
import pytest

from myapp import create_app
from myapp.config import TestConfig
from myapp.extensions import db as _db


@pytest.fixture
def app():
    app = create_app(TestConfig)          # a fresh, isolated app per test run
    with app.app_context():
        _db.create_all()
        yield app
        _db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()
```
```python
# tests/test_auth.py
def test_login_page(client):
    resp = client.get("/login")
    assert resp.status_code == 200
```
The factory is *why* this is testable: each test gets its own app + in-memory DB with zero global state.

## Tooling
- **Server**: Gunicorn (or Uvicorn+ASGI bridge) in production — never the dev server.
- **ORM/Migrations**: SQLAlchemy + Flask-Migrate (Alembic); commit the `migrations/` folder.
- **Validation**: Flask-WTF (forms) / Marshmallow or Pydantic (API schemas).
- **Linting/Formatting**: Ruff (per base Python standard).
- **Testing**: pytest with factory-built fixtures.

## Anti-Patterns (Rejected by This Standard)
- ❌ Module-level `app = Flask(__name__)` with `@app.route` decorators scattered across files.
- ❌ `db = SQLAlchemy(app)` bound at import time (breaks tests and multi-app setups).
- ❌ Hardcoded `url_prefix` inside the blueprint instead of at registration.
- ❌ Importing the app package from models/routes (circular imports) instead of importing `db` from `extensions`.
- ❌ Secrets or `SECRET_KEY` literals in source instead of environment variables.
