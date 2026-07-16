# Spring Boot Standards — Application Architecture

> Deep-dive standard for Spring Boot 3 (Java 21) REST services in the Ummard/Simon ecosystem.
> **Mandate:** every service uses **constructor injection** and **layered separation** (`@RestController` → `@Service` → `@Repository`).
> Field injection (`@Autowired` on fields) and business logic in controllers are **rejected** — they hide dependencies, break immutability, and make classes untestable without the Spring container.

See [`../README.md`](../README.md) for base Java conventions (naming, tooling, JDK). This document layers the Spring Boot-specific architecture on top.

## The Non-Negotiable Rules
1. **Constructor injection ONLY** — dependencies are `private final` fields set by a single constructor. Never `@Autowired` on a field or setter.
2. **Layered separation is enforced** — controllers handle HTTP, services own business logic and transactions, repositories own persistence. A layer never reaches past its neighbour (no repository calls from a controller).
3. **Entities never leak as API DTOs** — JPA `@Entity` types stay behind the service boundary; the web layer speaks in request/response records.

Everything below follows from these three rules.

## Prescribed Structure
Package-by-feature under `com.ummard.project`. Each feature owns its full vertical slice; only genuinely cross-cutting code (config, error handling) sits at the root.
```text
project_root/
├── src/
│   ├── main/
│   │   ├── java/com/ummard/project/
│   │   │   ├── Application.java              # @SpringBootApplication — the ONLY main()
│   │   │   ├── config/
│   │   │   │   └── StorageProperties.java    # @ConfigurationProperties — typed config
│   │   │   ├── common/
│   │   │   │   └── web/
│   │   │   │       ├── GlobalExceptionHandler.java  # @RestControllerAdvice
│   │   │   │       └── ApiError.java                # error response record
│   │   │   └── order/                        # a feature slice
│   │   │       ├── OrderController.java       # @RestController — HTTP only
│   │   │       ├── OrderService.java          # @Service — business logic + @Transactional
│   │   │       ├── OrderRepository.java       # @Repository — Spring Data JPA interface
│   │   │       ├── Order.java                 # @Entity — persistence, never returned to web
│   │   │       ├── OrderMapper.java           # entity <-> DTO mapping
│   │   │       ├── CreateOrderRequest.java    # inbound DTO (record + Bean Validation)
│   │   │       ├── OrderResponse.java         # outbound DTO (record)
│   │   │       └── OrderNotFoundException.java
│   │   └── resources/
│   │       ├── application.yml               # shared config + profile blocks
│   │       ├── application-prod.yml          # prod overrides
│   │       └── db/migration/                 # Flyway — V1__init.sql, committed
│   └── test/
│       └── java/com/ummard/project/
│           ├── order/OrderControllerTest.java   # @WebMvcTest slice
│           ├── order/OrderServiceTest.java       # plain unit test (no Spring)
│           └── order/OrderRepositoryIT.java      # Testcontainers integration test
├── pom.xml (or build.gradle)
└── .gitignore
```

## The Application Entrypoint
```java
// com/ummard/project/Application.java
package com.ummard.project;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication              // = @Configuration + @EnableAutoConfiguration + @ComponentScan
@ConfigurationPropertiesScan        // registers @ConfigurationProperties records as beans
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}
```
- One `@SpringBootApplication` class at the root package; component scanning covers every feature package beneath it.
- Keep `main` empty apart from the `run` call — no wiring, no `new`.

## The Controller (HTTP Only)
The controller translates HTTP to method calls and back. It contains **no** business logic and **never** touches a repository or an entity.
```java
// com/ummard/project/order/OrderController.java
package com.ummard.project.order;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;   // final — set once, never null

    public OrderController(OrderService orderService) {   // constructor injection, no @Autowired
        this.orderService = orderService;
    }

    @GetMapping("/{id}")
    public OrderResponse getById(@PathVariable long id) {
        return orderService.findById(id);        // returns a DTO, never an Order entity
    }

    @PostMapping
    public ResponseEntity<OrderResponse> create(@Valid @RequestBody CreateOrderRequest request,
                                                UriComponentsBuilder uri) {
        OrderResponse created = orderService.create(request);
        URI location = uri.path("/api/orders/{id}").buildAndExpand(created.id()).toUri();
        return ResponseEntity.created(location).body(created);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable long id) {
        orderService.delete(id);
    }
}
```
- A single constructor means `@Autowired` is **not needed** — Spring auto-injects it. This is the only injection style permitted.
- `@Valid` triggers Bean Validation on the request body before the method runs (see [Validation](#validation)).

## The Service (Business Logic + Transactions)
```java
// com/ummard/project/order/OrderService.java
package com.ummard.project.order;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final OrderMapper orderMapper;

    public OrderService(OrderRepository orderRepository, OrderMapper orderMapper) {
        this.orderRepository = orderRepository;
        this.orderMapper = orderMapper;
    }

    @Transactional(readOnly = true)
    public OrderResponse findById(long id) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new OrderNotFoundException(id));   // domain exception, not null
        return orderMapper.toResponse(order);
    }

    @Transactional
    public OrderResponse create(CreateOrderRequest request) {
        Order order = orderMapper.toEntity(request);
        order.markPending();                       // business rules live on the entity/service
        Order saved = orderRepository.save(order);
        return orderMapper.toResponse(saved);
    }

    @Transactional
    public void delete(long id) {
        if (!orderRepository.existsById(id)) {
            throw new OrderNotFoundException(id);
        }
        orderRepository.deleteById(id);
    }
}
```
- `@Transactional` belongs on the **service**, not the controller or repository — the service defines the unit of work.
- The service is the boundary: it accepts and returns DTOs, and maps to/from entities internally. Entities do not escape.

## The Repository (Spring Data JPA)
```java
// com/ummard/project/order/OrderRepository.java
package com.ummard.project.order;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

    // Derived query — Spring Data implements it from the method name.
    List<Order> findByCustomerId(long customerId);

    // Explicit JPQL when a derived name would be unreadable.
    @Query("select o from Order o where o.status = 'PENDING' and o.total > :min")
    List<Order> findPendingOver(double min);
}
```
- The repository is an **interface** — Spring Data generates the implementation. Never write a hand-rolled JDBC repository for CRUD.
- Repositories contain queries only. No business logic, no mapping, no cross-aggregate orchestration.

## The Entity (Persistence, Not API)
```java
// com/ummard/project/order/Order.java
package com.ummard.project.order;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "orders")
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private long customerId;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal total;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OrderStatus status = OrderStatus.DRAFT;

    private Instant createdAt = Instant.now();

    protected Order() { }   // required by JPA

    public Order(long customerId, BigDecimal total) {
        this.customerId = customerId;
        this.total = total;
    }

    public void markPending() {   // behaviour, not just getters/setters
        this.status = OrderStatus.PENDING;
    }

    public Long getId() { return id; }
    public long getCustomerId() { return customerId; }
    public BigDecimal getTotal() { return total; }
    public OrderStatus getStatus() { return status; }
}
```
- The entity models the database. It carries mapping annotations and invariants — it is **never** serialized directly to an HTTP response.

## DTOs + Mapping (Entity ≠ DTO)
DTOs are Java `record`s: immutable, concise, and decoupled from the persistence model. This lets the schema and the API evolve independently.
```java
// com/ummard/project/order/CreateOrderRequest.java
package com.ummard.project.order;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;

public record CreateOrderRequest(
        @NotNull @Positive Long customerId,
        @NotNull @Positive BigDecimal total) {
}
```
```java
// com/ummard/project/order/OrderResponse.java
package com.ummard.project.order;

import java.math.BigDecimal;

public record OrderResponse(long id, long customerId, BigDecimal total, String status) {
}
```
```java
// com/ummard/project/order/OrderMapper.java
package com.ummard.project.order;

import org.springframework.stereotype.Component;

@Component
public class OrderMapper {

    public Order toEntity(CreateOrderRequest request) {
        return new Order(request.customerId(), request.total());
    }

    public OrderResponse toResponse(Order order) {
        return new OrderResponse(
                order.getId(),
                order.getCustomerId(),
                order.getTotal(),
                order.getStatus().name());
    }
}
```
- Mapping is explicit and testable. For large models use MapStruct, but the rule is unchanged: **the web layer never sees an entity**.

## Configuration
`application.yml` for values; a typed `@ConfigurationProperties` record for structured, validated config. Reach for `@ConfigurationProperties` over scattered `@Value` strings.
```yaml
# src/main/resources/application.yml
spring:
  application:
    name: order-service
  datasource:
    url: ${DATABASE_URL}            # from environment — never a literal secret
    username: ${DATABASE_USER}
    password: ${DATABASE_PASSWORD}
  jpa:
    hibernate:
      ddl-auto: validate            # schema owned by Flyway migrations, not Hibernate
    open-in-view: false             # disable OSIV — keep persistence in the service layer

storage:
  bucket: local-dev-bucket
  max-upload-size: 10MB

---
spring:
  config:
    activate:
      on-profile: prod
  jpa:
    properties:
      hibernate:
        jdbc:
          batch_size: 50
```
```java
// com/ummard/project/config/StorageProperties.java
package com.ummard.project.config;

import jakarta.validation.constraints.NotBlank;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.util.unit.DataSize;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "storage")
public record StorageProperties(
        @NotBlank String bucket,
        DataSize maxUploadSize) {
}
```
- Secrets come from environment variables via `${...}` placeholders — never committed to `application.yml`.
- `open-in-view: false` and `ddl-auto: validate` are deliberate: the persistence session closes with the transaction, and schema changes go through committed Flyway migrations.

## Profiles
- Environment-specific config lives in `application-<profile>.yml` or a `---` document block guarded by `on-profile`.
- Select the profile at runtime: `SPRING_PROFILES_ACTIVE=prod`. Never branch on `System.getenv` in code.
- Annotate environment-only beans with `@Profile("prod")` / `@Profile("!prod")` rather than `if` checks.

## Validation
```java
// request record — constraints declared on the DTO (shown above)
public record CreateOrderRequest(
        @NotNull @Positive Long customerId,
        @NotNull @Positive BigDecimal total) { }
```
- `@Valid @RequestBody` in the controller triggers Bean Validation; a violation throws `MethodArgumentNotValidException` **before** the handler body runs.
- That exception is translated into a clean `400` by the global handler below — controllers never hand-roll validation `if` checks.

## Global Exception Handling
One `@RestControllerAdvice` centralises error-to-HTTP translation. No `try/catch` boilerplate in controllers.
```java
// com/ummard/project/common/web/GlobalExceptionHandler.java
package com.ummard.project.common.web;

import com.ummard.project.order.OrderNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(OrderNotFoundException.class)
    public ProblemDetail handleNotFound(OrderNotFoundException ex) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail handleValidation(MethodArgumentNotValidException ex) {
        String detail = ex.getBindingResult().getFieldErrors().stream()
                .map(e -> e.getField() + ": " + e.getDefaultMessage())
                .collect(Collectors.joining("; "));
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, detail);
    }
}
```
```java
// com/ummard/project/order/OrderNotFoundException.java
package com.ummard.project.order;

public class OrderNotFoundException extends RuntimeException {
    public OrderNotFoundException(long id) {
        super("Order not found: " + id);
    }
}
```
- Return `ProblemDetail` (RFC 7807) for a consistent, machine-readable error shape across the service.
- Business/domain failures are thrown as exceptions from the service and mapped **once**, here.

## Testing
Three tiers — plain unit tests for logic, sliced tests for the web layer, and Testcontainers for real persistence. Reach for the narrowest tier that proves the behaviour; `@SpringBootTest` (full context) is the exception, not the default.

**Service — plain JUnit 5, no Spring:**
```java
// OrderServiceTest.java
class OrderServiceTest {

    private final OrderRepository repository = mock(OrderRepository.class);
    private final OrderService service = new OrderService(repository, new OrderMapper());

    @Test
    void findByIdThrowsWhenMissing() {
        when(repository.findById(1L)).thenReturn(Optional.empty());
        assertThrows(OrderNotFoundException.class, () -> service.findById(1L));
    }
}
```
Constructor injection is *why* this needs no container: the collaborators are just constructor arguments.

**Web layer — `@WebMvcTest` slice with `MockMvc`:**
```java
// OrderControllerTest.java
@WebMvcTest(OrderController.class)          // loads ONLY the web layer
class OrderControllerTest {

    @Autowired MockMvc mockMvc;
    @MockitoBean OrderService orderService;  // service is mocked — no DB, no full context

    @Test
    void getByIdReturnsOrder() throws Exception {
        when(orderService.findById(1L))
                .thenReturn(new OrderResponse(1L, 42L, new BigDecimal("9.99"), "PENDING"));

        mockMvc.perform(get("/api/orders/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDING"));
    }

    @Test
    void createRejectsInvalidBody() throws Exception {
        mockMvc.perform(post("/api/orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"customerId\":-1,\"total\":0}"))
                .andExpect(status().isBadRequest());
    }
}
```

**Persistence — Testcontainers against a real database:**
```java
// OrderRepositoryIT.java
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)  // use the container, not H2
@Testcontainers
class OrderRepositoryIT {

    @Container
    @ServiceConnection                       // wires the datasource automatically
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16");

    @Autowired OrderRepository repository;

    @Test
    void persistsAndFindsByCustomer() {
        repository.save(new Order(42L, new BigDecimal("9.99")));
        assertThat(repository.findByCustomerId(42L)).hasSize(1);
    }
}
```
- Test the DB layer against the **same engine used in production** (Postgres), not H2 — Testcontainers makes this cheap and deterministic.
- `@ServiceConnection` (Spring Boot 3.1+) removes manual `@DynamicPropertySource` datasource wiring.

## Tooling
- **Build**: Maven or Gradle (pick one per repo, do not mix) with the Spring Boot plugin. Build a layered executable jar; never ship a fat jar without layering.
- **Formatting**: Spotless with `google-java-format` — enforced in CI (per base Java standard).
- **Static analysis**: Checkstyle + SpotBugs (per base Java standard).
- **Testing**: JUnit 5 + Mockito, `@WebMvcTest` / `@DataJpaTest` slices, Testcontainers for integration.
- **Migrations**: Flyway (or Liquibase); commit the `db/migration/` scripts. Hibernate `ddl-auto` stays at `validate`.
- **JDK**: Java 21 LTS (records, pattern matching, virtual threads).

## Anti-Patterns (Rejected by This Standard)
- ❌ `@Autowired` on a field or setter instead of a constructor with `final` fields.
- ❌ Business logic in a `@RestController` — fat controllers that validate, orchestrate, and persist inline.
- ❌ Returning a JPA `@Entity` (or accepting one as `@RequestBody`) instead of a request/response DTO.
- ❌ Calling a `@Repository` directly from a controller, skipping the service layer.
- ❌ Business logic or `@Transactional` orchestration inside a repository interface.
- ❌ `try/catch` that catches and swallows (empty block, or `log` then `return null`) instead of throwing a domain exception handled by `@RestControllerAdvice`.
- ❌ Secrets hardcoded in `application.yml` instead of `${ENV_VAR}` placeholders.
- ❌ `ddl-auto: update` in production instead of committed Flyway/Liquibase migrations.
