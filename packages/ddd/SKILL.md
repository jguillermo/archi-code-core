---
name: archi-code-ddd
description: The single entry point for Domain-Driven Design with @archi-code/ddd. It routes every DDD question to the skill suite shipped in the package (discovery, subdomains and bounded contexts, context mapping, architecture, value objects and entities, aggregates, domain events, repositories, application services, event sourcing and CQRS, audits) and gives the rules, patterns and common mistakes for TypeScript code with @archi-code/ddd - where each class goes and what it may import, value objects, Composite, Specification, Entity, AggregateRoot, EventBase, repository roles, exceptions, UseCase, EventListener with @ListensTo, ports, transactions, outbox, inbox and HttpErrorMapper. Use it whenever someone applies DDD, designs or reviews a domain model, splits a system into contexts, writes or changes value objects, aggregates, events, use cases, listeners, repositories or adapters, decides which layer a class belongs to, or whenever the code imports @archi-code/ddd.
---

# archi-code-ddd

`@archi-code/ddd` is archi-code's Domain-Driven Design package for TypeScript, one entry point per
layer: `@archi-code/ddd/exceptions` (the exceptions every layer throws), `@archi-code/ddd/domain`
(value objects, `Composite`, `Specification`, `Entity`, `AggregateRoot`, `EventBase` and the
repository contracts `AggregateFinder`, `AggregateSaver`, `AggregateRemover`),
`@archi-code/ddd/application` (`UseCase`, `EventListener`, `@ListensTo` and the ports `EventBus`,
`Clock`, `TransactionRunner`) and `@archi-code/ddd/infrastructure` (aggregate mapper, in-memory
repository, transaction runner, outbox and relay, inbox, event dispatcher and registry, published
language, HTTP error mapper, clocks).

## Full API

Before using a class, function, option or type that does not appear in this skill, read
`node_modules/@archi-code/ddd/README.md`: it matches the installed version. Do not assume
signatures, options or exports. If the package is not installed: `npm install @archi-code/ddd`
(and `npm install @archi-code/validation` if validations are declared with `@Validations`).

If that path does not exist (monorepo with workspaces, pnpm…), locate the package with
`node -p "require.resolve('@archi-code/ddd/package.json')"` and read the `README.md` in that
folder.

## Related skills

This is the **only skill to load** for Domain-Driven Design with this package. It brings a suite
of DDD skills (in Spanish, with the source of each rule: Vernon's _Implementing Domain-Driven
Design_ and _Domain-Driven Design Distilled_, and _DDD in PHP_) inside the package, in
`ddd-skills/`; never copy the suite into `.claude/skills/`: read it from the package when this
skill says so. Locate it as the README: `node_modules/@archi-code/ddd/ddd-skills/`, or the
`ddd-skills/` folder next to the `package.json` that
`node -p "require.resolve('@archi-code/ddd/package.json')"` prints (in this monorepo,
`packages/ddd/ddd-skills/`). The suite files are guides without a skill frontmatter: they are
never loaded on their own, only read when this skill routes to them.

How to use it, for every design question or task:

1. **Classify the request** (as `ddd-skills/ddd-orquestador/SKILL.md` does): strategic (split the
   system, contexts, integration), architecture (folders, layers, where a file goes), tactical
   (classes, aggregates, events, repositories, use cases) or mixed. If it is unclear, read that
   orchestrator first; its `references/chuleta-reglas.md` has every essential rule with its source.
2. **Read the `SKILL.md` of the matching suite skill** before answering, and the `references/` it
   points to for the case at hand:

   | Situation                                                              | Read `ddd-skills/…/SKILL.md`       |
   | ---------------------------------------------------------------------- | ---------------------------------- |
   | Unclear request, "where do I start", the essential rules               | `ddd-orquestador`                  |
   | Understand a business, Event Storming, glossary, scenarios             | `ddd-descubrimiento-dominio`       |
   | What is core, how many contexts or services, where the boundaries go   | `ddd-subdominios-bounded-contexts` |
   | How contexts and external systems relate and integrate, ACL            | `ddd-context-mapping`              |
   | Folder structure, layers, dependencies, modules, composition root      | `ddd-arquitectura`                 |
   | Value object or entity, ids, primitives, validation, Specification     | `ddd-value-objects-entidades`      |
   | What goes together, invariants, transactions, concurrency, factories   | `ddd-agregados`                    |
   | Events, messaging, outbox, idempotence, versions                       | `ddd-eventos-dominio`              |
   | Loading and saving aggregates, mappers, transactions, repository tests | `ddd-repositorios-persistencia`    |
   | Domain services, use cases, where the logic goes, authorization        | `ddd-servicios-capa-aplicacion`    |
   | Full history, read models, CQRS                                        | `ddd-event-sourcing-cqrs`          |
   | Review or migrate existing code                                        | `ddd-auditoria-refactorizacion`    |

   A new project follows the orchestrator's sequence (discovery → subdomains → context map →
   architecture → aggregates and value objects → events → repositories → use cases).

3. **Design with the suite, write the code with this package.** The suite's examples are plain
   TypeScript; translate every one of them with the table in
   [From the DDD suite to this package](#from-the-ddd-suite-to-this-package). Where a suite rule is
   marked `[Fuera de los libros: convención de @archi-code/ddd]`, or where it disagrees with the
   rules below, this skill wins.
4. **Audits of code built on this package** (`ddd-auditoria-refactorizacion`): apply its checklist
   and also every item of [What not to do](#what-not-to-do). Its scanner needs Python 3:
   `python3 -I "$(dirname "$(node -p "require.resolve('@archi-code/ddd/package.json')")")/ddd-skills/ddd-auditoria-refactorizacion/scripts/scan_ddd_smells.py" <folder>`;
   it only spots repositories by names ending in `Repository`/`Repo`, so check by hand the use
   cases that save two aggregates. Without Python, apply the checklist by hand.
5. Keep the suite's conventions in your answers: say which rule comes from which book, present what
   no domain expert validated as an assumption, and answer in the person's language.

If they are installed in the project, use them together with this one:

- `archi-code-validation`: available validators, their options and `@Validations` rules.

## Import

```ts
import {
  AggregateRoot,
  BooleanType,
  Composite,
  CreatedAt,
  DateType,
  Entity,
  EnumType,
  EventBase,
  IdType,
  NumberType,
  Required,
  Specification,
  StringType,
  UpdatedAt,
  ValueObjects,
} from '@archi-code/ddd/domain';
import {
  AggregateNotFoundException,
  ConcurrencyException,
  DomainException,
  ExceptionCode,
  InternalErrorException,
  NotAllowedException,
} from '@archi-code/ddd/exceptions';
import type {
  AggregateFinder,
  AggregateRemover,
  AggregateSaver,
  EventMetadata,
  PrimitiveTypes,
} from '@archi-code/ddd/domain';
import { EventListener, ListensTo, UseCase } from '@archi-code/ddd/application';
import type { Clock, EventBus, TransactionRunner } from '@archi-code/ddd/application';
import {
  AggregateMapper,
  DomainEventRegistry,
  EventDispatcher,
  FixedClock,
  HttpErrorMapper,
  InMemoryEventBus,
  InMemoryInbox,
  InMemoryOutbox,
  InMemoryRepository,
  InMemoryTransactionRunner,
  OutboxRelay,
  PublishedLanguage,
} from '@archi-code/ddd/infrastructure';
import { Validations } from '@archi-code/validation';
```

```js
const { Required, StringType } = require('@archi-code/ddd/domain');
```

## Rules

### Where each class goes

| Class                                                        | Layer                                   | May depend on                                                                             | Never                                                                      |
| ------------------------------------------------------------ | --------------------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Value object, composite                                      | domain                                  | other value objects, `@archi-code/validation`, exceptions                                 | mutate, know about storage or transport                                    |
| Aggregate root (`extends AggregateRoot`)                     | domain                                  | value objects, child entities, events; a domain service or loaded data as method argument | read a repository, publish, `new Date()`, services received by constructor |
| Child entity (`extends Entity`)                              | domain                                  | its id (global or local) and value objects                                                | business logic, being loaded or saved on its own                           |
| Domain event (`OrderPlaced`)                                 | domain                                  | primitives taken from value objects                                                       | behavior, value objects or the whole state in its payload                  |
| Repository contract (`AggregateFinder`…)                     | domain                                  | the aggregate                                                                             | business logic or queries, an all-in-one `Repository`                      |
| Domain service                                               | domain                                  | aggregates, value objects, specifications, repository contracts (to read), domain ports   | I/O code, transactions, publishing                                         |
| Domain port to another context or service (`ProductPricing`) | domain                                  | value objects                                                                             | remote DTOs, I/O code                                                      |
| Use case (`PlaceOrder`)                                      | application                             | domain, ports, exceptions                                                                 | import another use case or a listener, return an aggregate                 |
| Listener (`ReserveStockOnOrderPlaced`)                       | application                             | one use case (by constructor), the event                                                  | business rules, saving aggregates, calling several use cases               |
| Port (`EventBus`, `Clock`, `TransactionRunner`, your own)    | application                             | domain types                                                                              | code                                                                       |
| Read query (`OrderSummaries`, `StaleOrders`)                 | application (interface), infrastructure | DTOs and ids, `@archi-code/criteria`                                                      | loading aggregates, repositories, business rules                           |
| Adapter (repository, outbox, inbox, ACL translator)          | infrastructure                          | domain, application, exceptions, drivers                                                  | business rules                                                             |
| Entry point (controller, consumer, scheduler, CLI)           | interfaces                              | application, exceptions, `HttpErrorMapper`; domain types only if unavoidable              | business rules, repositories or other adapters                             |
| Composition root (`composition.ts`)                          | per context                             | everything                                                                                | being imported by any layer                                                |

- Dependencies only point inwards: the domain imports only `@archi-code/ddd/domain`,
  `@archi-code/ddd/exceptions` and `@archi-code/validation` (not "nothing external" as the suite
  says: these are the package convention); the application adds `@archi-code/ddd/application`;
  only infrastructure and the composition root import `@archi-code/ddd/infrastructure`, with one
  exception: an entry point may import `HttpErrorMapper` (or receive it from the composition root).
  Entry points (`interfaces/`: controllers, message consumers, schedulers, CLI) call use cases
  only. The composition root of each context is the only place that builds and connects everything
  (repositories, dispatcher, relay, listeners) and reads `process.env`.
- Layout, with modules named after the ubiquitous language inside each zone, never after patterns
  (`entities/`, `events/`, `valueobjects/`, `listeners/`); a listener lives next to the use case it
  runs; a context never imports another one, only an explicit `shared-kernel/`:

  ```
  src/contexts/sales/
  ├── domain/order/            Order, OrderId, OrderLine, OrderPlaced, ProductPricing (port)
  ├── application/order/       PlaceOrder, ReserveStockOnOrderPlaced, OrderSummaries (read query)
  ├── infrastructure/order/    MongoOrderRepository, HttpProductPricing (ACL), MongoOrderSummaries
  ├── interfaces/http/         OrderController
  └── composition.ts
  ```

- Check the direction with dependency-cruiser (`tsPreCompilationDeps: true`) and the suite's
  `ddd-arquitectura/assets/dependency-cruiser.cjs`, which already allows the `@archi-code/ddd`
  layers above and forbids importing `composition.ts`.
- Import from the layer, never from the package root (there is none): exceptions always come from
  `@archi-code/ddd/exceptions` (never from `/domain`).
- Logic two use cases share never goes in a use case: a business rule becomes a method of the
  aggregate or a domain service; a technical step becomes a port. When an action must follow
  another, the first records an event and a listener runs the second.
- Names: use cases are business verbs (`PlaceOrder`), events are facts in the past
  (`OrderPlaced`, never `OrderUpdated` nor present tense), listeners are `<Action>On<Event>`
  (`ReserveStockOnOrderPlaced`, where `<Action>` is the use case it runs).

### From the DDD suite to this package

| The suite writes                                                                              | With `@archi-code/ddd`                                                                                                                                                                                                             |
| --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ValueObject<{ value }>` with `static of()` and `props`                                       | `class Email extends Required(StringType) {}` + `@Validations`; built with `new`, valid by construction                                                                                                                            |
| A value normalized in `of()` (trimmed, lower case email, upper case currency)                 | override `protected filter(value: unknown): string { return super.filter(value).trim().toLowerCase(); }`; the rules run on the normalized value                                                                                    |
| `ValueObject<{ a; b }>` (`Money`, `DateRange`, `OrderLine`)                                   | `class Money extends Composite({ amount: Cents, currency: Currency }) {}`; rules over several fields with `@Validations` custom                                                                                                    |
| `Money` in `bigint` minor units, `CurrencyMismatch`                                           | `Composite` with `@Validations([{ validator: 'isInt' }]) class Cents extends Required(NumberType)`; `add` throws your `CurrencyMismatch extends DomainException`                                                                   |
| A collection with behavior (`OrderLines`: not empty, unique SKU, `total()`)                   | `class OrderLines extends Composite({ items: [OrderLine] })` with `@Validations` custom rules and methods that return a new instance; never `ArrayType` (it holds only simple value objects)                                       |
| A state as a value object with static instances (`OrderStatus.Pending`)                       | `class OrderStatus extends Required(StatusType)` where `StatusType extends EnumType<Status>`, with methods; `fromPrimitives` does `new OrderStatus(primitives.status)`                                                             |
| `OrderId.of('ord-…')`, branded string ids, `repository.nextId()`                              | `class OrderId extends IdType {}` (UUID); a new one with `OrderId.generate()`                                                                                                                                                      |
| An id chosen by the user or assigned by another context (campaign code, CRM id)               | a named `Required(StringType)` with `@Validations` (`class CampaignCode …`) used as `AggregateRoot<CampaignCode>`; a stable UUID from an external key with `UuidType.fromValue(key)`                                               |
| `Entity<Id>` with `equals` by id                                                              | `Entity<Id>` from `/domain`; a child entity holds only its id (a local one is fine: `SeatNumber extends Required(NumberType)`) and value objects; the root replaces it to change it                                                |
| `domain/shared/AggregateRoot.ts`, `DomainEvent.ts`, `ValueObject.ts`, `Entity.ts`             | not written: extend `AggregateRoot`, `EventBase`, `AbstractType` types and `Entity` from `/domain`                                                                                                                                 |
| `AggregateRoot(id, version)`, `markPersisted()`, `pullEvents()`, `pendingEvents()`            | `AggregateRoot<Id, Event>` with `super(id)`; `version`, `restoreVersion()` and `markPersisted()` live in the base and your repositories call them (`InMemoryRepository` does); `pullDomainEvents()` returns and empties the events |
| Getters "only if needed"                                                                      | every persisted field has a public getter with its name without `_` (or is public `readonly`): `PrimitiveTypes` and `AggregateMapper` read them; derived values are methods (`total()`)                                            |
| `Customer.placeOrder(...)` returns a new `Order` (factory on another aggregate)               | the use case reads `Customer` with `AggregateFinder<Customer>`, calls `customer.placeOrder(OrderId.generate(), …)` and saves only the new order with `AggregateSaver<Order>`                                                       |
| `static reconstitute(snapshot)`, `toSnapshot()`, `OrderMapper.toRow/toDomain`                 | `static fromPrimitives(PrimitiveTypes<X>)`, `toPrimitives()`, and `AggregateMapper.of(X)` in the repository                                                                                                                        |
| `DomainEvent { type, eventId, occurredOn, version }` with `OrderId`/`Money` in the payload    | `class OrderPlaced extends EventBase` with `static readonly eventName` and optional `eventVersion`; `super(aggregateId, metadata)`; payload of primitives (`orderId: string`, `total: { amount, currency }`)                       |
| `EventPublisher` / `OutboxEventPublisher` port                                                | the `EventBus` port; your outbox implements it (`InMemoryOutbox` in tests)                                                                                                                                                         |
| `OrderRepository { byId, save, nextId, pendingOlderThan }`                                    | `AggregateFinder<X>` / `AggregateSaver<X>` / `AggregateRemover<X>` only; selections are read queries                                                                                                                               |
| A repository that pulls and publishes the events on `save`; `orders.publishedEvents` in tests | the use case calls `events.publish(order.pullDomainEvents())` inside `transactions.run`; tests read `outbox.pending(n)` (or `InMemoryEventBus.published`)                                                                          |
| `orderRepositoryContract(make)` run against the in-memory and the real repository             | the same shared suite in `test/support/`, run against `new InMemoryRepository(AggregateMapper.of(Order))` and your adapter (see the pattern below)                                                                                 |
| Read queries `StaleOrders.ids(olderThan)`, `OrderSummaries` returning DTOs                    | an interface in `application/`, implemented in infrastructure straight on the database (filters with `@archi-code/criteria`); never through `AggregateFinder`                                                                      |
| A projection updating a read model with a checkpoint                                          | an `EventListener` run by the dispatcher with an inbox; a rebuild from position 0 needs your own event log (the outbox does not keep a readable history)                                                                           |
| A process caused by time (`PaymentAuthorizationExpired`)                                      | a scheduler entry point calls a read query for the ids and runs one use case per aggregate                                                                                                                                         |
| `ConcurrencyConflict` and its retry in the application service                                | `ConcurrencyException(mapper.aggregateName, id, aggregate.version, { cause })`; a retry wraps `execute` in the entry point or composition, only for commands safe to repeat                                                        |
| `DomainError` with a `code`, `OrderNotFound`, `NotAllowed`                                    | `DomainException(message, ['ORD001'])`, `AggregateNotFoundException`, `NotAllowedException`                                                                                                                                        |
| `ValidationNotificationHandler` collecting errors                                             | `ValueObjects.build({...})` (every field) and `ValidationException.errors` (`{ field, code, message }`)                                                                                                                            |
| `ProductListingValidator` checking an existing object ("three photos to publish")             | a domain service or `Specification`s that collect `ValidationIssue`s and throw one `new ValidationException(issues)`, or a named `DomainException`                                                                                 |
| `CompositeSpecification<T>` with `and`/`or`/`not`                                             | `Specification<T>` from `/domain`; it receives loaded data (the suite's repository specifications become read queries)                                                                                                             |
| An application service `execute(cmd)` that loads, invokes and saves                           | `UseCase<Input, Command, Output>`: `toCommand` with `ValueObjects.build`, `handle` inside `transactions.run`                                                                                                                       |
| `requestedBy` in the command and a `SalesAccessPolicy`                                        | the entry point takes the requester id from the token into the input, `toCommand` builds it as a value object, an application policy throws `NotAllowedException`                                                                  |
| A policy `when(event)` (`RegisterReservationOnOrder`)                                         | `@ListensTo(StockReserved) class RegisterReservationOnStockReserved extends EventListener` + one use case, which returns when the aggregate is missing                                                                             |
| `TransactionRunner` + `AsyncLocalStorage` (`PgTransactionRunner`, `current()`)                | the `TransactionRunner` port (`run` only); your adapter keeps its own `current()` for your repositories; tests use `InMemoryTransactionRunner([...])`                                                                              |
| `NoTransaction` in tests                                                                      | `new InMemoryTransactionRunner()` (or with the participants to roll back)                                                                                                                                                          |
| `stored_events` outbox + `StoredEventForwarder`                                               | `EventBus.publish` inside the transaction (your outbox, `InMemoryOutbox` in tests) + `OutboxRelay`, which passes each event with its `sequence`                                                                                    |
| `InboxGuard.once(messageId, work)`                                                            | `new EventDispatcher(listeners, { inbox, transactions })` with an `InboxStore` (`InMemoryInbox`)                                                                                                                                   |
| `PublishedLanguageMapper.toPublished(row)`                                                    | `PublishedLanguage.expose(Event, { name, version, data })` and `translate(json)` in the relay                                                                                                                                      |
| `ProductPricing` port + anticorruption adapter and translator                                 | the interface in `domain/` with value objects; adapter and translator in `infrastructure/`; an inbound webhook is an entry point mapped to a use case input                                                                        |
| `Clock` injected in the aggregate                                                             | `clock: { now(): Date }` in domain methods, passed to events too (`{ clock }`); the `Clock` port and `FixedClock` in application and tests                                                                                         |
| Controller mapping errors to 404/403/409/422                                                  | `HttpErrorMapper` (same table), used by the entry points in `interfaces/`                                                                                                                                                          |
| `PgEventStore`, `Payment.fromHistory` (Event Sourcing)                                        | not provided: only when the suite's decision table says so, built in your infrastructure; `version` grows 1 per save (not per event), so an event-sourced aggregate keeps its stream version itself and skips `AggregateMapper`    |

### Domain, application and infrastructure

- Value objects are **optional by default** (`value: T | null`). `Required(XType)` makes them
  required: the constructor demands `T` and, if it receives an empty value (`null`, `undefined` or a
  blank string), throws `RequiredValueException` with the class name. `Required(...)` also declares
  the `isRequired` validation.
- A domain VO is always a named subclass (`class Email extends ...`): the name appears in the error
  messages, and `equals` compares the class too (`BillingCountry('ES')` is not a
  `ShippingCountry('ES')`).
- **A value object that exists is valid.** The constructor converts (or throws
  `TypePrimitiveException`), checks `Required` (or throws `RequiredValueException`) and runs every
  `@Validations` rule, throwing one `ValidationException` with all the broken rules
  (`errors: [{ field: null, code: 'isEmail', message: '<Class>: <message>' }]`; `code` is the
  validator or custom rule name, or the code of the exception). There is no `assertValid()`;
  `validate()` only re-runs the rules and is always ok on a built VO.
- **Report every field, never only the first.** Build the value objects of an input with
  `ValueObjects.build({ field: () => new X(input.field), … })`: it runs every factory and throws one
  `ValidationException` whose `errors` carry the `field` and `code` of each problem (required
  `DOM004`, conversion `DOM003`, a rule name, or the code of any `DomainException`, such as your
  `ORD003`); `ValueObjects.buildList(list, (item) => …)` names list items by position
  (`lines.1.units`). It returns the command typed field by field.
- **Which layer validates what:** the input adapter checks only the shape of the request (it parses,
  a field is a string), never a business rule; value objects check each value (built in
  `toCommand`); the aggregate checks invariants over several values; a domain service checks rules
  over several aggregates; the use case checks authorization. The input of a use case arrives
  unvalidated on purpose: every adapter goes through it.
- `@Validations` is imported from `@archi-code/validation`; a validator's parameters go in a single
  `properties` object. Subclasses inherit validations, and one with the same name replaces the
  parent's.
- Values are **immutable**: `_value` is `readonly`; to change a value, build a new VO.
  `ArrayType.withItem/withoutItem` return a new instance; `UpdatedAt` is replaced with
  `UpdatedAt.now()`.
- `toString()` is a method, `toJSON()` returns the plain value, `equals(other)` compares class and
  value (dates by instant, arrays and objects by content). Template literals and `JSON.stringify`
  work on VOs.
- Dates: `DateType` accepts `Date`, ISO dates (`'2024-01-31'`, UTC midnight) and ISO date-times
  **with** a zone (`Z` or offset); a date-time without a zone throws `TypePrimitiveException`.
  `UuidType`/`IdType` store lowercase. New ids: `OrderId.generate()` (an `OrderId`).
- Time: pass a `Clock` to `CreatedAt.now(clock)` / `UpdatedAt.now(clock)` and to events
  (`new OrderPlaced(id, …, { clock })`) from use cases; tests use `FixedClock`. Aggregate methods
  type it as `clock: { now(): Date }`: the `Clock` port matches it, and the domain never imports
  `/application`.
- A custom type extends `AbstractType<T>` and implements only `protected filter(value: unknown): T`
  (it receives input already known to be non-empty; it returns the value or throws
  `TypePrimitiveException`). If restricting an existing type is enough, extend it and use
  `@Validations`; to normalize the value (trim, lower case) override `filter` and call
  `super.filter(value)` first: `IdType` does the same, and the rules run on the normalized value.
- **Concepts of several attributes are composite value objects**, not entities nor loose fields:
  `class Money extends Composite({ amount: Cents, currency: Currency }) {}`. The schema names each
  field's class: a value object class, another composite, or a list `[OrderLine]`. Fields are
  exposed read-only with their value object type; the instance is frozen; `equals` compares class
  and every field; `toPrimitives()` gives plain data (dates stay `Date`); `JSON.stringify` writes
  the values; `X.fromPrimitives(data)` rebuilds it reporting every invalid field with its path
  (`lines.1.units`). Rules over several fields (end ≥ start, one currency) are `@Validations`
  `custom` rules on the composite class: `fn` receives the built composite, after its fields are
  valid. Behavior returns new instances (`add(other): Money`). Prefer a composite over a child
  entity: an order line with no id anybody looks it up by is a value [IDDD ch. 6]. A collection
  with rules of its own (`OrderLines`: not empty, unique SKU, `total()`) is a composite with a list
  field (`Composite({ items: [OrderLine] })`); `ArrayType` holds only simple value objects. A field
  of a composite may hold an optional value object whose value is `null` (`new Line2(null)`); only
  a missing instance is refused.
- The aggregate root passes the id to `super(id)`, exposed as `readonly id`; do not redeclare it
  (no `_id` + getter). `equals` compares class and id only. A child entity (a part with an identity
  of its own inside the aggregate) extends `Entity<Id>` (`super(id)`, `equals` by class and id)
  and holds only its id and value objects, **no business logic**: the root owns every rule and
  changes a child by replacing it
  (`this._seats = this._seats.map((seat) => seat.id.equals(id) ? new Seat(id, label) : seat)`),
  never through setters or methods of the child. Its id may be local to the aggregate
  (`class SeatNumber extends Required(NumberType)`). `AggregateRoot` extends `Entity` too.
- **Derived values are methods, never getters** (`total()`, `isEditable()`), on aggregates, child
  entities and composites: `PrimitiveTypes` sees every getter as a field, so a computed getter
  breaks `toPrimitives()` at compile time.
- **A named business rule that selects, validates or combines is a `Specification<T>`**:
  `class EligibleForExpressShipping extends Specification<Order> { isSatisfiedBy(order) {…} }`,
  combined with `and`, `or` and `not`. It receives data already loaded (never a repository) and is
  never used to protect an invariant of an aggregate: invariants stay inside the aggregate.
- **The domain knows nothing about persistence**: no mapper, repository nor storage concern in
  domain code; a repository receives an aggregate and stores it. `AggregateMapper` is imported from
  `@archi-code/ddd/infrastructure`.
- **Aggregates and their primitives** (every aggregate follows these six rules so infrastructure can
  store it):
  1. All its state is value objects: each persisted field is a value object, a composite, a list
     of them or a child entity (`extends Entity<Id>`) whose fields are value objects. A flag is
     `class Shipped extends Required(BooleanType) {}`, never `boolean`; a moment is `DateType` /
     `CreatedAt`, never `Date`.
  2. Private field + public getter with the same name without `_` (or a public `readonly`). No
     private state without its getter: the primitives use those names.
  3. Private constructor and two factories: a business one that validates and records events, and
     `static fromPrimitives(primitives: PrimitiveTypes<Order>)` that rebuilds each value object
     from its primitive and records nothing.
  4. `toPrimitives(): PrimitiveTypes<Order>` returns only plain data (`vo.value`, child primitives),
     never a value object.
  5. Repositories receive `AggregateMapper.of(Order)` and only call `toPrimitives` /
     `fromPrimitives`; they never read the aggregate's fields.
  6. One round-trip test per aggregate: `Order.fromPrimitives(order.toPrimitives()).toPrimitives()`
     equals `order.toPrimitives()`.
     The compiler rejects public raw state (`PrimitiveTypes` gives `never`); `AggregateMapper` throws
     `InternalErrorException` at runtime for raw private state, private fields missing from the
     primitives (also inside child entities and composites) and value objects returned by
     `toPrimitives()`. An enum value object stores its option (`PrimitiveType` is the enum type),
     so `new OrderStatus(primitives.status)` needs no cast.
- Aggregates extend `AggregateRoot<Id, Event>` and call `super(id)`. **Every aggregate has a
  `version`** for optimistic concurrency: `0` when new, the stored one when loaded, `+1` after each
  save. The aggregate never declares, stores nor maps it (it is not a field nor in
  `PrimitiveTypes`); only repositories touch it.
- **Every repository checks the version** (contract): load with
  `mapper.fromPrimitives(row, storedVersion)`; save a new aggregate (`version === 0`) as version 1
  and treat an existing id as a conflict; save an existing one only where the stored version still
  equals `aggregate.version`, storing `aggregate.version + 1` next to (never inside) the
  primitives; when nothing was written throw
  `ConcurrencyException(mapper.aggregateName, id, aggregate.version)` (HTTP 409); after a write
  call `aggregate.markPersisted()`. Keep the driver error: `ConcurrencyException(…, { cause })`.
  After a conflict, repeat the command only if it is safe against the new state, from the entry
  point or the composition (a wrapper around `execute`), never from a use case; otherwise report it
  to the user.
- `record(event)` is `protected`; `pullDomainEvents()` returns the events (typed `Event[]`) in order
  and empties the list. Pull them after persisting, to publish.
- Events extend `EventBase`, declare `static readonly eventName = '<aggregate>.<past_fact>'`
  (`order.placed`; a published contract is named `<context>.<fact>`, `sales.order_placed`) and
  call `super(aggregateId, metadata)`; `event.eventName()` returns it. The payload is primitives
  taken from value objects (`customer.value`, money as `{ amount, currency }`), only what
  consumers need: never value objects, `toPrimitives()` nor personal data nobody needs. Listeners and registries refer to
  the event by its class (`@ListensTo(OrderPlaced)`, `register(OrderPlaced, …)`). The
  base sets `eventId` (UUID v4) and `occurredOn` (immutable `Date`, from `metadata.clock` when
  given, otherwise the system time); pass `{ eventId, occurredOn }` only when rebuilding an event
  read from an outbox or a broker. Inside an aggregate method, always pass the clock it received:
  `new OrderPlaced(id.value, customer.value, { clock })`. Serialize with `JSON.stringify` /
  `toJSON()` (`eventName`, `eventId`, `aggregateId`, ISO `occurredOn` and the payload).
- `PrimitiveTypes<T>` only sees **public** non-method members (it strips the leading `_`): expose
  VOs with public getters or public `readonly` properties. For an aggregate it includes `id`;
  child entities become their primitives; raw `string`/`number`/`boolean`/`Date`
  members become `never`.
- Where to throw each exception:
  - Domain (aggregates, VOs, business rules): `DomainException` or a custom subclass with its own
    code; `ValidationException` (thrown by value objects and `ValueObjects.build`).
  - Use cases: `AggregateNotFoundException` when a repository returns `null` (except a use case
    run by a listener to register a fact: it returns, so the listener is not retried forever),
    `NotAllowedException` when the requester may not run the action (authorization belongs to the
    use case), `ApplicationException` for other application errors.
  - Adapters (DB, network…): `InfrastructureException` / `InternalErrorException`, always with
    `{ cause: error }` when wrapping another error.
  - `TypePrimitiveException` and `RequiredValueException` are thrown by the VOs; throw them yourself
    only inside the `filter` of a custom type.
- Map errors to HTTP with `HttpErrorMapper` (overrides by code for your own codes): 400 for
  conversion and required values, 403 `NotAllowedException`, 404 `AggregateNotFoundException`, 409
  `ConcurrencyException`, 422 `ValidationException` and any other `DomainException` (a broken
  business rule), 500 otherwise; never hand-write status tables that leak infrastructure
  messages. For logs or messages use `error.code` and the exported `ExceptionCode` enum, or
  `instanceof`: the built-in exceptions are recognized across the CJS and ESM builds.
- A use case does **one thing**: one business action, one class, one `handle`. It changes one
  aggregate and saves it once; a flow that needs several actions is several use cases (chained by
  domain events or called one after another by whoever orchestrates them), never one use case with
  flags or a `type` field in its input that switch between behaviors.
- A use case is **named after the business action**, a verb and a noun from the ubiquitous language
  that a domain expert would say: `PlaceOrder`, `ShipOrder`, `CancelSubscription`,
  `RegisterUser`, `ApproveRefund`. Never technical or CRUD names (`CreateOrder` when the business
  says "place", `UpdateOrder`, `SaveUser`, `OrderService`, `OrderManager`, `ProcessOrder`,
  `HandleData`, `OrderUseCase`).
- The repository contracts belong to the domain (`import type { AggregateSaver } from
'@archi-code/ddd/domain'`). Interface segregation: a use case depends only on the repository roles it uses —
  `AggregateFinder<A>` (`findById`), `AggregateSaver<A>` (`save`), `AggregateRemover<A>`
  (`delete`), combined with `&` when it needs several. There is no all-in-one `Repository` port:
  an adapter implements each role it supports.
- Use cases extend `UseCase<Input, Command, Output>`, receive ports by constructor
  (`AggregateSaver<Order>`, `EventBus<OrderEvent>`, `TransactionRunner`, `Clock`) and are called
  with `execute(input)`.
  They implement two steps: `protected toCommand(input)` builds the value objects with
  `ValueObjects.build` and returns the command (a small interface of value objects, or one value
  object built with `new`); `protected handle(command)` works only with value objects. `UseCase` has no helpers:
  write every step in `handle` (load with `findById` and throw `AggregateNotFoundException` when it
  is `null` — or return, in a use case a listener runs —, change the aggregate, `save`, then
  `publish(aggregate.pullDomainEvents())`), all of
  them inside `transactions.run(async () => …)` when the project has transactions. Let errors
  propagate: `execute` keeps package exceptions and wraps any other error (also from `toCommand`)
  in `InternalErrorException` with `cause`.
- A use case never imports nor calls another use case, and **returns an id, a DTO or nothing**,
  never an aggregate. Screens that read several aggregates use read queries, not repositories.
- **Authorization belongs to the use case**: the entry point takes the requester id from the token
  and puts it in the input, `toCommand` builds it as a value object, and an application policy
  (`SalesAccessPolicy`) throws `NotAllowedException`. A rule that is business (only the owner may
  change the order) stays in the aggregate.
- **Domain services** are plain classes in `domain/` (no base class) named after the business
  operation; they receive aggregates and loaded data, never open transactions nor publish. A
  technical one (`ExchangeRates`) is an interface in `domain/` implemented in infrastructure.
- **Repositories only get and persist** (`findById`, `save`, `delete`): no business logic, no
  business queries (`pendingOlderThan`), no `nextId()`; new ids come from the value object
  (`OrderId.generate()`). `InMemoryRepository.findAll()` is a convenience of the test adapter.
- **Another aggregate is referenced by its id** (`customerId: CustomerId`), never by the object.
- **A command can be refused, a fact cannot**: a method that registers something that already
  happened elsewhere (`registerStockReservation`, called by a listener) is idempotent and never
  throws a business error; if the fact does not fit, it records an event so another listener
  compensates.
- **Money is a composite with whole minor units** (`Money({ amount: Cents, currency })`), never a
  `NumberType`; rounding is explicit.
- **Transactions belong to the application, events to the outbox** [IDDD ch. 12; Destilado ch. 6]:
  the use case opens the transaction with the `TransactionRunner` port (`run(work)`; a nested run
  joins the outer one) and publishes inside it, so the aggregate and its events are committed
  together. `EventBus` is then an outbox: it stores the events; an `OutboxRelay(store, deliver)`
  run by a worker after the commit (`forward()`) delivers them in order to the dispatcher or a
  broker, at least once, so listeners must tolerate an `eventId` they already processed. Neither
  the domain nor a repository opens a transaction. The relay stops at the first failure and
  retries it on the next run, so a delivery that can never succeed for one event (a poison
  message) must catch it and park it (a dead-letter table), or every later event waits. Each event
  arrives with its outbox `sequence` (`deliver(json, sequence)`) for consumers that keep order.
- **Events have a schema version** (`static readonly eventVersion = 2` when their data changes
  incompatibly; 1 by default, written in `toJSON()`); a `DomainEventRegistry` factory reads older
  stored versions from `json.eventVersion`.
- **Consumers are idempotent**: wire `new EventDispatcher(listeners, { inbox, transactions })`;
  each listener runs in its own transaction that marks `eventId` for that listener in the inbox
  (`InMemoryInbox` or a table implementing `InboxStore`) and skips an event already processed.
- **Other contexts never receive domain classes**: `new PublishedLanguage().expose(OrderPlaced, {
name: 'sales.order_placed', version: 1, data: (json) => ({ … }) })` and, in the relay,
  `published.translate(json)` (`null` for internal events) before sending to the broker. Publish
  only what consumers need; a new contract version for incompatible changes.
- Event Sourcing and CQRS are optional, only for a concrete need (full history, read models very
  different from the model); read queries straight to the database come first. A projection is
  an `EventListener` with the inbox that writes a read table; a read query is an application
  interface implemented in infrastructure that returns DTOs or ids.
- Tests use `InMemoryTransactionRunner([repository, outbox])` (restores both when the work throws;
  `committed`/`rolledBack`; one transaction at a time: concurrent runs join each other),
  `InMemoryOutbox` (events stored as JSON, `pending(limit)`) and
  `OutboxRelay`. `InMemoryEventBus` dispatches immediately: only for a quick test without
  transactions.
- Listeners extend `EventListener<Event>`, are decorated with `@ListensTo(EventClass)` (one event
  per listener, any number of listeners per event), receive the one use case they run by
  constructor and their `handle(event)` only maps the event to that use case's input.
- The dispatcher and the relay are infrastructure classes built and connected in the composition
  root: `new EventDispatcher([...listeners])`, fed after the commit by
  `new OutboxRelay(outbox, (json) => dispatcher.dispatchSerialized(json, registry))` or by a queue
  consumer (`InMemoryEventBus(dispatcher)` for a quick test). `dispatchSerialized` skips an event
  nobody listens to without rebuilding it, so an event without a factory never blocks the outbox.
  The application only knows `EventBus.publish` and `TransactionRunner.run`.
- A real repository implements the roles it supports (`AggregateFinder<A>`, `AggregateSaver<A>`,
  `AggregateRemover<A>`) and wraps driver errors in `InternalErrorException` with `cause`.
  `InMemoryRepository(AggregateMapper.of(Order))` is the reference for tests: it stores copies of
  the primitives with their version and follows the same concurrency contract.
- Consumers of an outbox or broker rebuild events with `DomainEventRegistry`: register a factory per
  event class that passes the JSON as metadata
  (`register(OrderPlaced, (json) => new OrderPlaced(json.aggregateId, …, json))`); `fromJSON`
  throws `InternalErrorException` when the rebuilt event lost its `eventId` or `occurredOn`, which
  the inbox needs to skip a redelivery.

## Recommended patterns

Optional by default, required with `Required(XType)`:

```ts
class Nickname extends StringType {} // value: string | null; constructor accepts string | null | nothing
class Name extends Required(StringType) {} // value: string; constructor demands string
class FullName extends Name {} // still required
```

Always-valid value objects: `@Validations` rules run in the constructor:

```ts
@Validations([{ validator: 'isEmail' }])
class Email extends Required(StringType) {}

@Validations([
  { validator: 'isInt', properties: { min: 0 } },
  { custom: 'isEven', fn: (v) => Number(v) % 2 === 0, message: 'Must be even' },
])
class Quantity extends NumberType {}

new Email('ana@example.com').value; // 'ana@example.com'
new Email('x');
// ValidationException: Validation failed, Email: Value does not satisfy isEmail

new Quantity(-3);
// ValidationException: Validation failed, Quantity: Value does not satisfy isInt, Quantity: Must be even

const command = ValueObjects.build({
  email: () => new Email(input.email),
  quantity: () => new Quantity(input.quantity),
});
// input { email: 'x', quantity: 3 } → one ValidationException with every field:
// errors: [
//   { field: 'email', code: 'isEmail', message: 'Email: Value does not satisfy isEmail' },
//   { field: 'quantity', code: 'isEven', message: 'Quantity: Must be even' },
// ]
```

Aggregate with typed id, a list of composite value objects and events:

```ts
class OrderId extends IdType {}
class Sku extends Required(StringType) {}
class Units extends Required(NumberType) {}
class CustomerName extends Required(StringType) {}
class Shipped extends Required(BooleanType) {}

class OrderLine extends Composite({ sku: Sku, units: Units }) {}

class OrderPlaced extends EventBase {
  static readonly eventName = 'order.placed';

  constructor(
    orderId: string,
    readonly customer: string,
    metadata?: EventMetadata,
  ) {
    super(orderId, metadata);
  }
}

class OrderLineAdded extends EventBase {
  static readonly eventName = 'order.line_added';

  constructor(
    orderId: string,
    readonly sku: string,
    readonly units: number,
    metadata?: EventMetadata,
  ) {
    super(orderId, metadata);
  }
}

type OrderEvent = OrderPlaced | OrderLineAdded;

class OrderShippedException extends DomainException {
  constructor(orderId: string) {
    super(`Order ${orderId} is already shipped`, ['ORD001']);
  }
}

class Order extends AggregateRoot<OrderId, OrderEvent> {
  private constructor(
    id: OrderId,
    readonly customer: CustomerName,
    private _lines: OrderLine[],
    private _shipped: Shipped,
    private _updatedAt: UpdatedAt,
    readonly createdAt: CreatedAt,
  ) {
    super(id);
  }

  static place(id: OrderId, customer: CustomerName, clock: { now(): Date }): Order {
    const order = new Order(
      id,
      customer,
      [],
      new Shipped(false),
      UpdatedAt.now(clock),
      CreatedAt.now(clock),
    );
    order.record(new OrderPlaced(id.value, customer.value, { clock }));
    return order;
  }

  static fromPrimitives(primitives: PrimitiveTypes<Order>): Order {
    return new Order(
      new OrderId(primitives.id),
      new CustomerName(primitives.customer),
      primitives.lines.map((line) => OrderLine.fromPrimitives(line)),
      new Shipped(primitives.shipped),
      new UpdatedAt(primitives.updatedAt),
      new CreatedAt(primitives.createdAt),
    );
  }

  get lines(): OrderLine[] {
    return [...this._lines];
  }

  get shipped(): Shipped {
    return this._shipped;
  }

  get updatedAt(): UpdatedAt {
    return this._updatedAt;
  }

  addLine(sku: Sku, units: Units, clock: { now(): Date }): void {
    if (this._shipped.value) {
      throw new OrderShippedException(this.id.value);
    }
    this._lines = [...this._lines, new OrderLine({ sku, units })];
    this._updatedAt = UpdatedAt.now(clock);
    this.record(new OrderLineAdded(this.id.value, sku.value, units.value, { clock }));
  }

  toPrimitives(): PrimitiveTypes<Order> {
    return {
      id: this.id.value,
      customer: this.customer.value,
      lines: this._lines.map((line) => line.toPrimitives()),
      shipped: this.shipped.value,
      updatedAt: this.updatedAt.value,
      createdAt: this.createdAt.value,
    };
  }
}
```

Use case: the input becomes a command of value objects, then `handle` loads, changes, saves and
publishes:

```ts
interface AddOrderLineInput {
  orderId: string;
  sku: string;
  units: number;
}

interface AddOrderLineCommand {
  orderId: OrderId;
  sku: Sku;
  units: Units;
}

class AddOrderLine extends UseCase<AddOrderLineInput, AddOrderLineCommand, void> {
  constructor(
    private readonly orders: AggregateFinder<Order> & AggregateSaver<Order>,
    private readonly events: EventBus<OrderEvent>,
    private readonly transactions: TransactionRunner,
    private readonly clock: Clock,
  ) {
    super();
  }

  protected toCommand(input: AddOrderLineInput): AddOrderLineCommand {
    return ValueObjects.build({
      orderId: () => new OrderId(input.orderId),
      sku: () => new Sku(input.sku),
      units: () => new Units(input.units),
    });
  }

  protected handle(command: AddOrderLineCommand): Promise<void> {
    return this.transactions.run(async () => {
      const order = await this.orders.findById(command.orderId);
      if (order === null) {
        throw new AggregateNotFoundException('Order', command.orderId.value);
      }
      order.addLine(command.sku, command.units, this.clock);
      await this.orders.save(order);
      await this.events.publish(order.pullDomainEvents());
    });
  }
}
```

Listener: named `<Action>On<Event>`, subscribed with `@ListensTo`, runs one use case:

```ts
interface Warehouse {
  prepare(orderId: OrderId, sku: Sku): Promise<void>;
}

class PrepareShipment extends UseCase<
  { orderId: string; sku: string },
  { orderId: OrderId; sku: Sku },
  void
> {
  constructor(private readonly warehouse: Warehouse) {
    super();
  }

  protected toCommand(input: { orderId: string; sku: string }): { orderId: OrderId; sku: Sku } {
    return ValueObjects.build({
      orderId: () => new OrderId(input.orderId),
      sku: () => new Sku(input.sku),
    });
  }

  protected async handle(command: { orderId: OrderId; sku: Sku }): Promise<void> {
    await this.warehouse.prepare(command.orderId, command.sku);
  }
}

@ListensTo(OrderLineAdded)
class PrepareShipmentOnOrderLineAdded extends EventListener<OrderLineAdded> {
  constructor(private readonly prepareShipment: PrepareShipment) {
    super();
  }

  async handle(event: OrderLineAdded): Promise<void> {
    await this.prepareShipment.execute({ orderId: event.aggregateId, sku: event.sku });
  }
}
```

A real repository implements only the roles it supports, checks the version and wraps driver
errors with their cause:

```ts
class MongoOrderRepository implements AggregateFinder<Order>, AggregateSaver<Order> {
  private readonly mapper = AggregateMapper.of(Order);

  async findById(id: OrderId): Promise<Order | null> {
    const document = await this.collection.findOne({ _id: id.value });
    if (document === null) {
      return null;
    }
    const { _id, version, ...primitives } = document;
    return this.mapper.fromPrimitives(primitives, version);
  }

  async save(order: Order): Promise<void> {
    const data = { ...this.mapper.toPrimitives(order), version: order.version + 1 };
    let written: boolean;
    try {
      written =
        order.version === 0
          ? await this.insertUnlessTaken(data)
          : (await this.collection.replaceOne({ _id: data.id, version: order.version }, data))
              .matchedCount === 1;
    } catch (error) {
      throw new InternalErrorException('saving order', { cause: error });
    }
    if (!written) {
      throw new ConcurrencyException(this.mapper.aggregateName, order.id.value, order.version);
    }
    order.markPersisted();
  }
}
```

Wiring and tests with the in-memory adapters (transaction, outbox, relay) and the HTTP mapper:

```ts
const orders = new InMemoryRepository(AggregateMapper.of(Order));
const outbox = new InMemoryOutbox<OrderEvent>();
const transactions = new InMemoryTransactionRunner([orders, outbox]);
const listeners = new EventDispatcher([
  new PrepareShipmentOnOrderLineAdded(new PrepareShipment(warehouse)),
]);
const registry = new DomainEventRegistry<OrderEvent>().register(
  OrderLineAdded,
  (json) => new OrderLineAdded(json.aggregateId, json.sku as string, json.units as number, json),
);
const relay = new OutboxRelay(outbox, (json) => listeners.dispatchSerialized(json, registry));

const clock = new FixedClock('2026-03-01T09:30:00Z');
await orders.save(Order.place(new OrderId(orderId), new CustomerName('Ana'), clock));
await new AddOrderLine(orders, outbox, transactions, clock).execute({
  orderId,
  sku: 'TORCH-01',
  units: 2,
});
await outbox.pending(10); // the OrderLineAdded event, committed with the order
await relay.forward(); // after the commit: PrepareShipment runs; OrderPlaced has no listener and is skipped

const errors = new HttpErrorMapper({ ORD001: 409 }); // a domain rule defaults to 422
const { status, body } = errors.map(caughtError);
```

Tests with Vitest: describe real situations, use a plain fixture factory in the project's
`test/support/` and the native matchers (there is no archi-code test package). Dates held by VOs and
events are immutable `Date` subclasses: compare them with `toEqual` or `.toISOString()`, not
`toStrictEqual` against a plain `Date`.

```ts
import { describe, expect, it } from 'vitest';

const orderId = '9b2f6c1e-4d3a-4f8b-a1c2-3e4d5f6a7b8c';

describe('Order', () => {
  it('a customer adds a torch to a new order and the warehouse is told about it', () => {
    const clock = new FixedClock('2026-03-01T09:30:00Z');
    const order = Order.place(new OrderId(orderId), new CustomerName('Ana'), clock);
    order.addLine(new Sku('TORCH-01'), new Units(2), clock);
    expect(order.toPrimitives()).toMatchObject({
      id: orderId,
      lines: [{ sku: 'TORCH-01', units: 2 }],
    });
    expect(order.pullDomainEvents().map((event) => event.toJSON())).toMatchObject([
      { eventName: 'order.placed', aggregateId: orderId, customer: 'Ana' },
      { eventName: 'order.line_added', sku: 'TORCH-01', units: 2 },
    ]);
  });
});
```

Composite value objects and specifications:

```ts
@Validations([{ validator: 'isInt' }])
class Cents extends Required(NumberType) {}
@Validations([{ validator: 'isISO4217' }])
class Currency extends Required(StringType) {
  protected filter(value: unknown): string {
    return super.filter(value).trim().toUpperCase();
  }
}

class CurrencyMismatch extends DomainException {
  constructor(expected: string, received: string) {
    super(`Cannot add ${received} to ${expected}`, ['PAY001']);
  }
}

class Money extends Composite({ amount: Cents, currency: Currency }) {
  add(other: Money): Money {
    if (!this.currency.equals(other.currency)) {
      throw new CurrencyMismatch(this.currency.value, other.currency.value);
    }
    return new Money({
      amount: new Cents(this.amount.value + other.amount.value),
      currency: this.currency,
    });
  }
}

class StartDate extends Required(DateType) {}
class EndDate extends Required(DateType) {}

@Validations([
  {
    custom: 'endsAfterItStarts',
    fn: (range) => (range as Promotion).end.value >= (range as Promotion).start.value,
    message: 'A promotion cannot end before it starts',
  },
])
class Promotion extends Composite({ start: StartDate, end: EndDate }) {}

const price = Money.fromPrimitives({ amount: 1250, currency: ' eur ' });
price.toPrimitives(); // { amount: 1250, currency: 'EUR' }
price.equals(Money.fromPrimitives({ amount: 1250, currency: 'EUR' })); // true

class OrderAbove extends Specification<Order> {
  constructor(private readonly minimumUnits: number) {
    super();
  }

  isSatisfiedBy(order: Order): boolean {
    return order.lines.reduce((sum, line) => sum + line.units.value, 0) >= this.minimumUnits;
  }
}

const freeShipping = new OrderAbove(10).and(new OrderAbove(100).not());
freeShipping.isSatisfiedBy(order);
```

A state as an enum value object: the primitive is the enum option, so the round trip needs no cast:

```ts
enum Status {
  Pending = 'pending',
  Shipped = 'shipped',
}

class StatusType extends EnumType<Status> {
  protected getEnum(): typeof Status {
    return Status;
  }
}

class OrderStatus extends Required(StatusType) {
  isShipped(): boolean {
    return this.value === Status.Shipped;
  }
}

new OrderStatus(primitives.status); // primitives.status: Status, from PrimitiveTypes<Order>
```

A use case run by a listener registers a fact: it never refuses it, and returns when the aggregate
is missing instead of making the relay retry forever:

```ts
class RegisterReservation extends UseCase<ReservationInput, ReservationCommand, void> {
  // constructor and toCommand as in AddOrderLine

  protected handle(command: ReservationCommand): Promise<void> {
    return this.transactions.run(async () => {
      const order = await this.orders.findById(command.orderId);
      if (order === null) {
        return;
      }
      order.registerStockReservation(command.reservationId, this.clock);
      await this.orders.save(order);
      await this.events.publish(order.pullDomainEvents());
    });
  }
}
```

A read query: an application interface returning DTOs, implemented in infrastructure on the
database, never through aggregates or repositories:

```ts
export interface OrderSummary {
  readonly id: string;
  readonly customer: string;
  readonly lines: number;
}

export interface OrderSummaries {
  ofCustomer(
    customer: CustomerName,
    page: { limit: number; offset: number },
  ): Promise<OrderSummary[]>;
}
```

One repository contract, run against the in-memory reference and the real adapter:

```ts
export function orderRepositoryContract(
  make: () => Promise<AggregateFinder<Order> & AggregateSaver<Order>>,
): void {
  const clock = new FixedClock('2026-03-01T09:30:00Z');
  const placeOrder = () => Order.place(new OrderId(orderId), new CustomerName('Ana'), clock);

  it('loads what it saved', async () => {
    const orders = await make();
    const order = placeOrder();
    await orders.save(order);
    expect((await orders.findById(order.id))?.toPrimitives()).toEqual(order.toPrimitives());
  });

  it('saves the same object twice', async () => {
    const orders = await make();
    const order = placeOrder();
    await orders.save(order);
    await expect(orders.save(order)).resolves.toBeUndefined();
  });

  it('refuses a stale save and a new order with a taken id', async () => {
    const orders = await make();
    await orders.save(placeOrder());
    const first = await orders.findById(new OrderId(orderId));
    const second = await orders.findById(new OrderId(orderId));
    await orders.save(first!);
    await expect(orders.save(second!)).rejects.toThrow(ConcurrencyException);
    await expect(orders.save(placeOrder())).rejects.toThrow(ConcurrencyException);
  });
}

describe('InMemoryRepository', () =>
  orderRepositoryContract(async () => new InMemoryRepository(AggregateMapper.of(Order))));
describe('MongoOrderRepository', () => orderRepositoryContract(async () => mongoOrders()));
```

## What not to do

- Putting a class in the wrong layer: a repository implementation, a mapper or a driver in the
  domain; a listener or an event bus implementation in the domain; a use case importing
  `/infrastructure`; business rules in an adapter or a controller.
- A use case that imports, extends or calls another use case, or a base use case with shared
  helpers: move the rule to the aggregate or a domain service, or chain them with an event and a
  listener.
- Building value objects inside `handle` from raw input, or passing raw strings to aggregates
  from a use case: build them in `toCommand`.
- A listener without `@ListensTo`, decorated with two events, or one that holds business rules,
  saves aggregates or calls several use cases.
- Subscribing listeners by a text name or calling them from a use case: the dispatcher in
  infrastructure finds them by `@ListensTo`.
- Declaring `eventName()` as a method in an event: declare `static readonly eventName`.
- Importing the repository contracts from `@archi-code/ddd/application`: they live in `/domain`.
- Do not invent API: there is no root `@archi-code/ddd` import, no `toPrimitives()` in the base
  classes, no generic `ValueObject` (a value object of several fields is `Composite({...})`), no
  `setNow()`, `addItem()`, `setItem()` or `removeItem()`. When in doubt, check the installed
  README.
- Writing the suite's base classes in the project (`domain/shared/AggregateRoot.ts`,
  `DomainEvent.ts`, `ValueObject.ts`, an `EventPublisher` port): they come from the package.
- A computed getter (`get total()`, `get isEditable()`) on an aggregate, a child entity or a
  composite: `PrimitiveTypes` takes it for a field and `toPrimitives()` stops compiling; write a
  method.
- `ArrayType<OrderLine>` with a composite item: a list of composites is a `Composite` list field
  (`Composite({ items: [OrderLine] })`) or a `OrderLine[]` field of the aggregate.
- A domain service or a repository received by the constructor of an aggregate: pass the service
  or the loaded data as a method argument.
- Events named `OrderUpdated` carrying the whole state, named in present tense (`PlaceOrder` as an
  event), carrying value objects, `toPrimitives()` or personal data that consumers do not need.
- Creating an event inside an aggregate method without the clock it received
  (`new OrderPlaced(id.value, customer.value)`): `occurredOn` becomes the system time and tests stop
  being deterministic.
- A registry factory that does not pass the JSON as metadata
  (`(json) => new OrderShipped(json.aggregateId)`): the event gets a new `eventId`, the inbox
  cannot skip a redelivery, and `fromJSON` throws.
- Wiring the relay with `dispatcher.dispatch(registry.fromJSON(json))` and registering only the
  events that have listeners: the first event without a factory blocks the outbox; use
  `dispatcher.dispatchSerialized(json, registry)`.
- A relay `deliver` that throws forever for one event: catch it and park it, or every later event
  waits behind it.
- A use case run by a listener that throws `AggregateNotFoundException` or a business error: the
  relay retries it forever; return, or record an event that compensates.
- Retrying a `ConcurrencyException` inside a use case, or a use case calling itself again: retry
  from the entry point or the composition, only for commands safe to repeat.
- A read query that loads aggregates through `AggregateFinder`, or a repository method that
  returns DTOs: reads go straight to the database through an application interface.
- Importing `@archi-code/ddd/infrastructure` from domain code, or `application` from the domain.
- Importing an exception from `@archi-code/ddd/domain`: exceptions live in
  `@archi-code/ddd/exceptions`.
- Catching errors inside `handle` just to rethrow them as `ApplicationException`: let them
  propagate; `execute` keeps package exceptions and wraps the rest.
- Calling `bus.publish` before `repository.save`, or publishing without `pullDomainEvents()`.
- Publishing after `transactions.run(...)` returns, or delivering events (dispatching listeners,
  sending to a broker) inside the transaction: events are stored in the transaction and delivered
  by the relay after the commit.
- Opening transactions (`BEGIN`/`COMMIT`) in a repository or in the domain, or saving two
  aggregates in one `run`: the use case owns one transaction for one aggregate.
- Using `InMemoryEventBus` with a `TransactionRunner`: it dispatches before the commit; use
  `InMemoryOutbox` + `OutboxRelay`.
- A listener that breaks when the relay delivers the same event twice: delivery is at least once;
  use the inbox.
- Sending `event.toJSON()` of a domain event to another context: translate it with
  `PublishedLanguage`.
- Changing the data of a stored or published event without raising `eventVersion` (or the
  contract version).
- Repository methods with business names or rules (`pendingOlderThan`, `findOverdueInvoices`),
  `nextId()` in a repository, or a use case returning the aggregate to the controller.
- Throwing `AggregateNotFoundException` from the domain or a repository: the use case throws it when
  `findById` returns `null`; it is an application exception (404).
- Authorization checks in the aggregate, or business rules in a controller: authorization is the
  use case's (`NotAllowedException`, 403); business rules are the aggregate's.
- A controller, consumer or CLI importing a repository or an adapter: entry points only call use
  cases; the composition root wires everything.
- Folders named after patterns (`entities/`, `services/`, `valueobjects/`): name modules after the
  business (`order/`, `invoicing/`).
- A use case that does several things (`UpdateOrder` that ships, cancels or renames depending on
  the input) or that saves more than one aggregate: split it into one use case per business
  action.
- Technical or CRUD names for use cases (`OrderService`, `UpdateUser`, `SaveOrder`,
  `ProcessPayment` when the business says `CapturePayment`): name them after the business action.
- Declaring an all-in-one `Repository` interface in the project, or a use case that receives the
  three roles when it only reads or only saves: ask for exactly the roles it uses.
- Looking for helpers such as `findOrFail` or `saveAndPublish` in `UseCase`: there are none; the
  steps go in `handle`.
- Using `new Date()` inside use cases or aggregates: inject a `Clock`.
- Using `InMemoryRepository` in production: it is for tests and prototypes.
- `vo.toString` without parentheses: it is a method; use `vo.toString()`, `` `${vo}` `` or
  `vo.value`.
- Mutating a VO or its value (`vo.value.setFullYear(...)`, pushing to `vo.value`): values are frozen
  and date setters throw. Build a new VO; for arrays use `withItem`/`withoutItem` and keep the
  returned instance (`this._tags = this._tags.withItem('x')`).
- Ignoring what `withItem`/`withoutItem` return: the original does not change.
- Comparing VOs or entities with `===`: use `equals()`.
- Calling `assertValid()`: it does not exist; the constructor already throws `ValidationException`.
- Building the value objects of an input one after another with `new` in `toCommand`: the first
  invalid field hides the rest. Use `ValueObjects.build` so every field is reported.
- Repeating a value object's rule in the request schema or the controller (`isEmail` in a DTO
  validator): the adapter checks only the shape; the value object owns the rule.
- Catching the `ValidationException` of a value object to keep an invalid value, or creating
  `ValidationException` by hand from `validate()` results (a domain service that collects
  `ValidationIssue`s of an existing object may throw `new ValidationException(issues)`).
- Sending local date-times without a zone (`'2024-01-31T10:00:00'`) to `DateType`: they are rejected.
- Passing unconverted values with their static type (`new NumberType('1.5')`): type error; conversion
  is for `any`/`unknown` input.
- Using `Required(StringType)` directly as a property type instead of a named subclass.
- Declaring `private readonly _id` + `get id()` in an aggregate: the id goes to `super(id)`.
- A child entity as a plain class, or with business methods or setters: it extends `Entity<Id>`
  and only holds its id and value objects; the aggregate root replaces it to change it.
- Modeling an amount with its currency, a date range or an address as loose fields of the
  aggregate, as a `JsonType`, or as a child entity with an id nobody looks up: use `Composite`.
- `Required(Composite(...))`, or `Composite({ amount: Required(NumberType) })` without a named
  class: every field class is a named subclass, and every field instance must be given (an
  optional value object holding `null` is fine; an optional composite is a `Money | null` field of
  the aggregate).
- Mutating a composite or adding state to it (instance fields, setters): it is frozen; return a new
  instance from its methods.
- Returning a composite from `toPrimitives()` instead of `composite.toPrimitives()`.
- A specification that loads data through a repository, a generic one without a business name
  (`FieldEquals`), or one used instead of the aggregate to protect an invariant.
- Raw state in an aggregate (`private _shipped: boolean`, `private _at: Date`, a `string` field):
  wrap it in a value object.
- A private field without its public getter: it would be lost when saving (`AggregateMapper` throws
  `… is not in its primitives`).
- `toPrimitives()` returning value objects instead of `vo.value`.
- A repository that reads aggregate fields or builds rows by hand: use `AggregateMapper.of(Order)`.
- Importing `AggregateMapper` (or any persistence concern) into domain code: it belongs to
  infrastructure.
- Passing `{ toPrimitives, fromPrimitives }` objects to `InMemoryRepository`: pass
  `AggregateMapper.of(Order)`.
- Declaring a `version` field in an aggregate, or putting it in `toPrimitives()`: the base already
  has it, and the repository stores it next to the primitives.
- A repository that saves with `upsert` and no version condition, or `InMemoryRepository`
  behavior expected as "last save wins": a stale save must throw `ConcurrencyException`.
- Forgetting `markPersisted()` after a successful write (the next save of the same object becomes a
  false conflict), or `mapper.fromPrimitives(row)` without the stored version (every load looks
  new, and the first save conflicts).
- Calling `restoreVersion()` or `markPersisted()` from domain or application code: they are for
  repositories.
- Creating events without the aggregate id (`super()`), or generating `eventId`/`occurredOn`
  yourself for a new event: the base does it.
- Wrapping or translating an error (`InternalErrorException`, `ConcurrencyException`,
  `NotAllowedException`, `AggregateNotFoundException`) without `{ cause: error }`.
- `JsonType` with `{}` or with an array: throws `TypePrimitiveException` (it must be a non-empty
  object).
- `IdType` with `00000000-0000-0000-0000-000000000000` or `ffffffff-ffff-ffff-ffff-ffffffffffff`:
  throws `TypePrimitiveException`.
- Declaring an aggregate's VOs as `private` without getters and expecting `PrimitiveTypes` to see
  them.
- Calling `record()` from outside the aggregate (it is `protected`) or forgetting `super(...)` in the
  constructor of an aggregate or event.
- Importing `@Validations` from `@archi-code/ddd/domain`: it is imported from `@archi-code/validation`.
