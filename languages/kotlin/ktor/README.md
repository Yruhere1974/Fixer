# Ktor Standards — Application Architecture

> Deep-dive standard for Ktor backend services in the Ummard/Simon ecosystem.
> **Mandate:** every non-trivial Ktor service composes its wiring in `Application.module()` extension functions, resolves collaborators through **Koin** dependency injection, and keeps route handlers thin.
> Business logic inside route handlers, global singletons, and blocking calls inside coroutines are **rejected** — they are untestable, hide side effects, and starve the coroutine dispatcher.

See [`../README.md`](../README.md) for base Kotlin conventions (naming, tooling, coroutines). This document layers the Ktor-specific architecture on top.

## The Non-Negotiable Rules
1. **Wiring lives in `Application.module()` extension functions** — never inline in `main`, never a god-function. Each concern (plugins, DI, routing) is its own `Application.xxx()` extension.
2. **Dependencies are resolved via Koin**, never via top-level `object` singletons or `lateinit` globals. Services and repositories are declared in a Koin module and injected.
3. **Routes are thin** — they parse input, call a service, and serialize the result. Domain logic lives in `services/`, persistence in `repositories/`.
4. **No blocking inside `suspend` functions** — no `Thread.sleep`, no blocking JDBC/IO on the request dispatcher. Wrap unavoidable blocking work in `withContext(Dispatchers.IO)`.

Everything below follows from these four rules.

## Prescribed Structure
```text
project_root/
├── src/
│   ├── main/
│   │   ├── kotlin/com/ummard/project/
│   │   │   ├── Application.kt              # embeddedServer entrypoint + Application.module()
│   │   │   ├── plugins/
│   │   │   │   ├── Serialization.kt        # install(ContentNegotiation) { json() }
│   │   │   │   ├── Monitoring.kt           # install(CallLogging)
│   │   │   │   ├── StatusPages.kt          # install(StatusPages) — centralized errors
│   │   │   │   └── Routing.kt              # Application.configureRouting() — mounts routes
│   │   │   ├── routes/
│   │   │   │   ├── UserRoutes.kt           # Route.userRoutes() — thin handlers
│   │   │   │   └── HealthRoutes.kt
│   │   │   ├── services/
│   │   │   │   └── UserService.kt          # business logic, suspend functions
│   │   │   ├── repositories/
│   │   │   │   └── UserRepository.kt       # persistence, suspend functions
│   │   │   ├── models/
│   │   │   │   ├── User.kt                 # @Serializable domain/DTO models
│   │   │   │   └── ApiError.kt
│   │   │   └── di/
│   │   │       └── AppModule.kt            # Koin module: services, repositories
│   │   └── resources/
│   │       ├── application.conf            # HOCON config — env-driven, NO secrets
│   │       └── logback.xml
│   └── test/
│       └── kotlin/com/ummard/project/
│           └── UserRoutesTest.kt           # testApplication { } + client
├── build.gradle.kts
├── gradle.properties
└── .gitignore
```

## The Entrypoint & Module
`Application.module()` is the single composition root. It is named in `application.conf`, so it is called both by `embeddedServer` in production and by `testApplication { }` in tests — the same wiring, verbatim.

```kotlin
// src/main/kotlin/com/ummard/project/Application.kt
package com.ummard.project

import io.ktor.server.application.Application
import io.ktor.server.engine.embeddedServer
import io.ktor.server.netty.Netty

fun main() {
    embeddedServer(Netty, port = 8080, host = "0.0.0.0", module = Application::module)
        .start(wait = true)
}

// The ONLY place plugins, DI, and routing are composed.
fun Application.module() {
    configureDependencyInjection()   // Koin first — routes/services depend on it
    configureSerialization()
    configureMonitoring()
    configureStatusPages()
    configureRouting()
}
```
- `main` does nothing but start the engine; all wiring is delegated to `module()`.
- Each `configureXxx()` is an `Application.()` extension in its own file — composable, independently testable, no ordering surprises beyond DI-first.

## Plugins (One Concern Per File)
Plugins are installed via `install(...)` inside focused extension functions.

```kotlin
// src/main/kotlin/com/ummard/project/plugins/Serialization.kt
package com.ummard.project.plugins

import io.ktor.serialization.kotlinx.json.json
import io.ktor.server.application.Application
import io.ktor.server.application.install
import io.ktor.server.plugins.contentnegotiation.ContentNegotiation
import kotlinx.serialization.json.Json

fun Application.configureSerialization() {
    install(ContentNegotiation) {
        json(Json {
            prettyPrint = false
            ignoreUnknownKeys = true
            explicitNulls = false
        })
    }
}
```

```kotlin
// src/main/kotlin/com/ummard/project/plugins/Monitoring.kt
package com.ummard.project.plugins

import io.ktor.server.application.Application
import io.ktor.server.application.install
import io.ktor.server.plugins.calllogging.CallLogging
import org.slf4j.event.Level

fun Application.configureMonitoring() {
    install(CallLogging) {
        level = Level.INFO
        filter { call -> call.request.path().startsWith("/") }
    }
}
```

## Centralized Error Handling
`StatusPages` is the single place exceptions become HTTP responses. Handlers throw domain exceptions; they never assemble error payloads inline.

```kotlin
// src/main/kotlin/com/ummard/project/plugins/StatusPages.kt
package com.ummard.project.plugins

import com.ummard.project.models.ApiError
import io.ktor.http.HttpStatusCode
import io.ktor.server.application.Application
import io.ktor.server.application.install
import io.ktor.server.plugins.statuspages.StatusPages
import io.ktor.server.response.respond

class NotFoundException(message: String) : RuntimeException(message)
class ValidationException(message: String) : RuntimeException(message)

fun Application.configureStatusPages() {
    install(StatusPages) {
        exception<ValidationException> { call, cause ->
            call.respond(HttpStatusCode.BadRequest, ApiError(cause.message ?: "invalid request"))
        }
        exception<NotFoundException> { call, cause ->
            call.respond(HttpStatusCode.NotFound, ApiError(cause.message ?: "not found"))
        }
        exception<Throwable> { call, cause ->
            call.application.log.error("Unhandled exception", cause)
            call.respond(HttpStatusCode.InternalServerError, ApiError("internal server error"))
        }
    }
}
```

## Dependency Injection (Koin)
Collaborators are declared once in a Koin module and resolved by interface. No `object` singletons, no manual `new`-ing of services inside routes.

```kotlin
// src/main/kotlin/com/ummard/project/di/AppModule.kt
package com.ummard.project.di

import com.ummard.project.repositories.UserRepository
import com.ummard.project.repositories.InMemoryUserRepository
import com.ummard.project.services.UserService
import org.koin.dsl.module

val appModule = module {
    single<UserRepository> { InMemoryUserRepository() }   // bound by interface
    single { UserService(get()) }                         // get() injects UserRepository
}
```

```kotlin
// src/main/kotlin/com/ummard/project/plugins/Koin.kt
package com.ummard.project.plugins

import com.ummard.project.di.appModule
import io.ktor.server.application.Application
import io.ktor.server.application.install
import org.koin.ktor.plugin.Koin
import org.koin.logger.slf4jLogger

fun Application.configureDependencyInjection() {
    install(Koin) {
        slf4jLogger()
        modules(appModule)
    }
}
```
- Repositories are bound **by interface** (`single<UserRepository> { … }`) so tests can swap a fake.
- `get()` resolves constructor dependencies — the graph is declared in one place, not scattered across call sites.

## Routing (Thin, Grouped)
Routing is split by domain. Each domain exposes a `Route.xxxRoutes()` extension; `configureRouting()` only mounts them. Handlers `inject()` their service and delegate immediately.

```kotlin
// src/main/kotlin/com/ummard/project/plugins/Routing.kt
package com.ummard.project.plugins

import com.ummard.project.routes.healthRoutes
import com.ummard.project.routes.userRoutes
import io.ktor.server.application.Application
import io.ktor.server.routing.routing

fun Application.configureRouting() {
    routing {
        healthRoutes()
        userRoutes()
    }
}
```

```kotlin
// src/main/kotlin/com/ummard/project/routes/UserRoutes.kt
package com.ummard.project.routes

import com.ummard.project.models.CreateUserRequest
import com.ummard.project.plugins.NotFoundException
import com.ummard.project.services.UserService
import io.ktor.http.HttpStatusCode
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.get
import io.ktor.server.routing.post
import io.ktor.server.routing.route
import org.koin.ktor.ext.inject

fun Route.userRoutes() {
    val service by inject<UserService>()   // resolved from Koin, not constructed here

    route("/users") {
        get {
            call.respond(service.listUsers())
        }
        get("/{id}") {
            val id = call.parameters["id"]
                ?: throw NotFoundException("user id required")
            val user = service.getUser(id)   // service throws NotFoundException → StatusPages
            call.respond(user)
        }
        post {
            val request = call.receive<CreateUserRequest>()   // deserialized by ContentNegotiation
            val created = service.createUser(request)
            call.respond(HttpStatusCode.Created, created)
        }
    }
}
```
- **One `Route.xxxRoutes()` per domain** (`users`, `orders`, `health`) — never one giant `routing { }` block.
- Handlers contain no business rules: parse → delegate → respond.
- `route("/users") { … }` groups the prefix once; nested `get`/`post`/`get("/{id}")` inherit it.

## Services & Repositories (The Layering)
Business rules live in services; persistence lives in repositories. Both expose `suspend` functions and never block.

```kotlin
// src/main/kotlin/com/ummard/project/services/UserService.kt
package com.ummard.project.services

import com.ummard.project.models.CreateUserRequest
import com.ummard.project.models.User
import com.ummard.project.plugins.NotFoundException
import com.ummard.project.plugins.ValidationException
import com.ummard.project.repositories.UserRepository

class UserService(private val repository: UserRepository) {

    suspend fun listUsers(): List<User> = repository.findAll()

    suspend fun getUser(id: String): User =
        repository.findById(id) ?: throw NotFoundException("no user with id=$id")

    suspend fun createUser(request: CreateUserRequest): User {
        if (request.email.isBlank()) throw ValidationException("email is required")
        return repository.save(User(id = repository.nextId(), email = request.email))
    }
}
```

```kotlin
// src/main/kotlin/com/ummard/project/repositories/UserRepository.kt
package com.ummard.project.repositories

import com.ummard.project.models.User
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicLong

interface UserRepository {
    suspend fun findAll(): List<User>
    suspend fun findById(id: String): User?
    suspend fun save(user: User): User
    fun nextId(): String
}

class InMemoryUserRepository : UserRepository {
    private val store = ConcurrentHashMap<String, User>()
    private val seq = AtomicLong(0)

    override suspend fun findAll(): List<User> = store.values.toList()

    override suspend fun findById(id: String): User? = store[id]

    override suspend fun save(user: User): User {
        store[user.id] = user
        return user
    }

    override fun nextId(): String = seq.incrementAndGet().toString()
}
```
For a real datastore, keep blocking JDBC off the request dispatcher:
```kotlin
// Wrap unavoidable blocking IO — never call it directly from a suspend handler.
override suspend fun findById(id: String): User? = withContext(Dispatchers.IO) {
    jdbc.query("SELECT … WHERE id = ?", id)   // blocking driver isolated on the IO pool
}
```

## Models (Serializable DTOs)
```kotlin
// src/main/kotlin/com/ummard/project/models/User.kt
package com.ummard.project.models

import kotlinx.serialization.Serializable

@Serializable
data class User(val id: String, val email: String)

@Serializable
data class CreateUserRequest(val email: String)
```
```kotlin
// src/main/kotlin/com/ummard/project/models/ApiError.kt
package com.ummard.project.models

import kotlinx.serialization.Serializable

@Serializable
data class ApiError(val message: String)
```
- Every type crossing the wire is `@Serializable` — `ContentNegotiation` handles (de)serialization.
- Prefer `data class` + `val` (per base Kotlin standard); model absence with nullable types, not `!!`.

## Configuration (HOCON)
Config lives in `application.conf`; secrets are read from the environment via `${?ENV_VAR}` — never hardcoded.

```hocon
# src/main/resources/application.conf
ktor {
    deployment {
        port = 8080
        port = ${?PORT}
    }
    application {
        modules = [ com.ummard.project.ApplicationKt.module ]
    }
}

database {
    url = "jdbc:postgresql://localhost:5432/app"
    url = ${?DATABASE_URL}
    user = ${?DATABASE_USER}
    password = ${?DATABASE_PASSWORD}   # sourced from env, never committed
}
```
Read typed config off the application inside `module()` or a plugin:
```kotlin
val dbUrl = environment.config.property("database.url").getString()
```
- `${?ENV_VAR}` overrides the default when the env var is present — dev-friendly defaults, prod-safe secrets.
- Referencing `module` in `application.conf` is what lets `main` use `embeddedServer(module = Application::module)` and tests reuse the identical wiring.

## Testing (Against the Real Module)
`testApplication { }` boots the same `Application.module()` and exposes a `client` — no running server, no ports, full plugin stack.

```kotlin
// src/test/kotlin/com/ummard/project/UserRoutesTest.kt
package com.ummard.project

import com.ummard.project.models.CreateUserRequest
import com.ummard.project.models.User
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.get
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.call.body
import io.ktor.http.ContentType
import io.ktor.http.HttpStatusCode
import io.ktor.http.contentType
import io.ktor.serialization.kotlinx.json.json
import io.ktor.server.testing.testApplication
import kotlin.test.Test
import kotlin.test.assertEquals

class UserRoutesTest {

    @Test
    fun `creates and fetches a user`() = testApplication {
        application { module() }   // the SAME wiring as production

        val client = createClient {
            install(ContentNegotiation) { json() }
        }

        val created: User = client.post("/users") {
            contentType(ContentType.Application.Json)
            setBody(CreateUserRequest(email = "a@b.com"))
        }.body()

        assertEquals("a@b.com", created.email)

        val fetched = client.get("/users/${created.id}")
        assertEquals(HttpStatusCode.OK, fetched.status)
    }

    @Test
    fun `returns 404 for unknown user`() = testApplication {
        application { module() }
        val response = client.get("/users/999")   // built-in client
        assertEquals(HttpStatusCode.NotFound, response.status)
    }
}
```
Testing through the real `module()` is *why* this architecture pays off: the StatusPages mapping, serialization, and Koin graph are all exercised exactly as they run in production. Swap a Koin binding to a fake repository for isolated service tests via `koin-test`.

## Tooling
- **Build**: Gradle with the Kotlin DSL (`build.gradle.kts`); apply the Ktor and `kotlinx.serialization` plugins.
- **Engine**: Netty (or CIO) via `embeddedServer` — configured in code, port overridable by env.
- **Linting/Formatting**: ktlint and/or detekt (per base Kotlin standard).
- **Testing**: JUnit 5 with `ktor-server-test-host` (`testApplication`); `koin-test` for isolated DI graphs.
- **DI**: Koin (`koin-ktor`, `koin-logger-slf4j`) — no compile-time DI framework needed for this scale.
- **JVM Target**: current LTS (Java 21) unless the platform dictates otherwise.

## Anti-Patterns (Rejected by This Standard)
- ❌ Business logic, validation, or DB access written directly inside a route handler instead of a service/repository.
- ❌ Global `object` singletons or `lateinit var` for services/repositories instead of Koin `inject()`.
- ❌ Blocking calls inside `suspend` functions — `Thread.sleep`, blocking JDBC/HTTP on the request dispatcher — instead of `withContext(Dispatchers.IO)`.
- ❌ Hardcoded ports, URLs, or secrets in code instead of `application.conf` with `${?ENV_VAR}` overrides.
- ❌ One giant `routing { }` block with every endpoint inline instead of grouped `Route.xxxRoutes()` extensions.
- ❌ Building error responses ad hoc in each handler instead of centralizing them in `StatusPages`.
- ❌ All wiring crammed into `main`/a single function instead of composable `Application.configureXxx()` extensions.
