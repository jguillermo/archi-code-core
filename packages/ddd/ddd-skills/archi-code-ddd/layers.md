# Domain, application and infrastructure

Part of the `archi-code-ddd` skill: read it only when that skill routes here. The rules of every
kind of class, also the audit checklist (with `ddd-auditoria-refactorizacion`). The shape of each
class is the code in `patterns.md`: copy it; folders and names in `where-each-class-goes.md`.
Never invent API (`findOrFail`, `saveAndPublish`, `setNow()`), own base classes (`ValueObject`,
`DomainEvent`, `EventPublisher`) nor pattern-named folders (`use-cases/`, `dtos/`).

## Value objects

- **Optional by default** (`T | null`, empty = `new X(null)`); `Required(XType)` demands a value
  `[Fuera de los libros: convención de @archi-code/ddd]`. Ids are always required. A missing simple
  value is an optional VO holding `null`; only a missing composite or child is an `X | null` field.
- **One named subclass per file**, never a base type as a property type; each context declares its
  own VOs.
- **A VO that exists is valid**: the constructor converts, checks `Required` and runs every
  `@Validations` rule (from `@archi-code/validation`, English messages). No `assertValid()`,
  `ensure…()` nor catching `ValidationException`; VO rules never move to a controller.
- **Every field reported**: build VOs only with `ValueObjectBuilder.build` / `buildList` in
  `toCommand` or first thing in a reaction; never one by one with `new`, never raw values into
  aggregates.
- Kinds: `Required(StringType | NumberType | BooleanType | DateType)`; id `XId extends
  IdType<'XId'>` (`XId.generate()` in the use case, derived id = static UUID v5 method); another
  context's aggregate `<Other>Reference extends Required(UuidType)`; enum = `enum` +
  `<Enum>Option extends EnumType` + `<Enum>Type extends Required(<Enum>Option)` in one file; list
  of simple values `ArrayType`; custom conversion overrides only `filter`; several fields
  `Composite`; free-form JSON `JsonType`.
- **Immutable**: behavior returns new instances; compare with `equals`, never `===`;
  `toString()` is a method; serialize `value`/`toPrimitives()`, never `JSON.stringify` of a VO.
- Text through `slug()`/`StringSanitizer` inside `filter`, never own regexes; a slug is not an id.
  `DateType` needs a zone.
- **Composite**: fields are VO classes, composites or lists `[X]`; frozen; cross-field rules are
  `custom` validations; optional = `X | null` field, never `Required(Composite(...))`.
- **Money** (`shared-kernel/money/`): `Composite({ amount: Cents, currency: MoneyCurrency })`,
  whole minor units, explicit rounding (the discount amount rounds down), `MoneyCurrency` an enum
  VO (`enum Currency`, `CurrencyOption`, `MoneyCurrency`), `CurrencyMismatch` (code `MNY<NNN>`).
- **Derived values are methods, never getters** (`total()`): getters break `PrimitiveTypes`.

## Aggregates

`[Fuera de los libros: convención de @archi-code/ddd]`: public constructor, `create`, getters,
`fromPrimitives`/`toPrimitives` (shape: `Payment` in `patterns.md`).

- State only in VOs, composites or child entities (a flag is a `Required(BooleanType)` VO):
  `readonly x`, or `private _x` + `get x()`; `createdAt`/`_updatedAt` last.
- **Constructor public, only assigns**. **`static create(id, …)`** is the only factory: initial
  state, `CreatedAt.now()`/`UpdatedAt.now()`, creation invariants, `<Aggregate>CreatedDomainEvent`
  (skip it only for an aggregate whose creation nobody hears). The use case passes the id. Only
  exception: `create<ClosedState>` (`Invoice.createVoided`, recording its closing event) for a
  closing fact that arrives first.
- **`fromPrimitives`** rebuilds without events nor checks; **`toPrimitives`** returns plain data.
  A private field without getter is silently lost: every aggregate has a round-trip test.
- **Each state change is a business method** named after the action, VO params, `void`, touches
  `_updatedAt`, records zero or more events.
- **A command can be refused, a fact cannot**: user-requested methods throw business errors; methods
  reactions call return silently (events arrive twice or late). A broken invariant restores the
  state before throwing.
- A rule over its own state (also "only the buyer cancels", a business error → 422) is its method;
  only the actor alone deciding is `NotAllowedException` (403) in the use case. Public `assert…()`
  preconditions are allowed before `remove`.
- Never holds a repository, bus, logger, service, version nor other aggregates (only their ids);
  loaded data and services come as method arguments.
- **Child entity** (`extends Entity<LocalId>`) only when something looks the part up by id, else a
  composite; no setters, events, `create` nor own conversion; only its root calls it.

## Domain events

`[Fuera de los libros: convención de @archi-code/ddd]`: shape `PaymentCapturedDomainEvent`.

- `<Aggregate><PastAction>DomainEvent`, `eventName = '<aggregate>.<past_action>'`, a fact, never
  `OrderUpdated` with the whole state.
- `readonly` primitive fields only (money `{ amount, currency }`, dates ISO), named id
  (`orderId`), no `aggregateId`, version, methods nor unneeded personal data.
- Only its aggregate creates it; never set `eventId`/`occurredOn` (only when rebuilding). No union
  types of events.
- Publish `pullDomainEvents()` after `save`. An incompatible change is a new `eventName`.

## Business errors, specifications, domain services, repositories

- **Business error**: `<WhatWentWrong> extends DomainException`, no `Exception` suffix, constructor
  with primitives, code `<CTX><NNN>` per context.
- **Specification**: a named yes/no criterion over loaded data; never loads, never guards an
  invariant.
- **Domain service only when** (user rule) two+ use cases share business logic (`CourseFinder`) or
  a rule needs several aggregates or a domain port (`OrderPricing`). Otherwise: one aggregate →
  its method; values → VO method; yes/no → `Specification`; load/authorize/save/publish → the use
  case; a bare port call → call the port.
- **Domain service how**: stateless, business name (never `…Manager`/`…Helper`); throws business
  errors (never `AggregateNotFoundException`); never saves, publishes, logs nor authorizes. Takes
  loaded aggregates, or the **abstract** repository (`findById`), or a domain port. The use case
  receives those dependencies and does `new CourseFinder(this.courses)` in `handle`; never
  injected nor built in `composition.ts`.
- **Repository contract**: one abstract `<Aggregate>Repository extends AggregateRepository<X>`,
  only the verbs the business needs (`findById`, `save`, `remove`, `search`), each implementing
  its role; no interface, code, business names, query methods nor `nextId()`.

## Use cases

User: `<Action> extends UseCase<Input, Command, Output>`; reaction: `<Action>On<Event> extends
EventListener<Event>`, the listener **is** the use case
`[Fuera de los libros: convención de @archi-code/ddd]`.

- **One thing**: one business action (`PlaceOrder`, never CRUD/technical), one aggregate saved
  once; flows are chained by events, never flags. A multi-aggregate exception (IDDD ch. 10) is a
  decision record in `docs/decisions/`.
- **Never uses another use case** (user rule): never instantiates, receives, imports, extends nor
  calls one or a reaction; no base use case. Shared rule → aggregate or domain service; technical
  step → a port; "B after A" → A records an event, a reaction does B.
- **The aggregate decides**: `handle` never branches on its state; one method returns the outcome
  (`course.retire()` → `'discarded' | 'archived'`).
- Constructor: only what `handle` uses (abstract repository, service dependencies, `EventBus`,
  `Logger`). No transactions, HTTP nor business rules.

### User use cases

- `Input` (primitives, `actorId`/`actorRole`), `Command` (VOs) and the class in one file; output
  `void` or the new id, never an aggregate. `toCommand` is only `ValueObjectBuilder.build`.
- `handle` (shape: `ConfirmTransferReceived`): authorize (`NotAllowedException`) → create or
  `findById` + `AggregateNotFoundException` → business method → save once → publish. Never catch.
  A lookup only one use case makes stays there with `AggregateNotFoundException`; a lookup with a
  business rule two+ use cases share (`CourseFinder`) throws a business error mapped to 404 in
  `NOT_FOUND_CODES`. A bare shared `findById` is no service: each use case keeps its own.
- **Concurrency**: `ConcurrencyException` reaches the entry point (409); only a repeat-safe command
  (set an address) may retry the whole load→save→publish a few times; a relative change (10%
  discount) never retries [IDDD ch. 10].
- **External effects** (charge, email) never before `save`: record the intent, save; a reaction
  calls the port with an idempotency key (the `eventId` that asked: one per attempt and effect) and
  records the outcome. The aggregate stores the attempt's key and answers whether it still awaits
  that outcome (`invoice.awaitsCharge(key)`): the reaction returns when it does not. Secrets the
  effect needs (card token) never go in the aggregate nor the event: a port keeps them under a
  reference. An event that takes the aggregate out of an intermediate state (`CHARGING`) must not
  be lost: the repository writes it to an outbox.
- **Uniqueness across aggregates** is a derived id the repository refuses twice; never a `search`
  before `create`. Uniqueness that ends (one active appointment per vet and slot) is a reservation
  aggregate under the derived id (`VetSlot` with `hold`/`release`), held by the use case that
  creates the main aggregate in the same save only when it is the same aggregate, else the main
  one is created by a reaction to the hold; a concurrent first hold is a `ConcurrencyException`
  (409). A bulk `search` pages with `limit`, re-reading the first page when the change removes
  rows from the result.

### Reaction use cases

- `@ListensTo(Event, { consumer: '<context>.<action>-on-<event>' })`, a stable literal; one event
  per class; subscribed only in `composition.ts`.
- `handle` (shape: `RequestPaymentOnOrderCreated`): build VOs → derived id → create (`return` if
  taken) or load (`return` if missing) → reaction method → save → publish.
- **Order-independent**: a closing fact finding no aggregate creates it already closed under the
  derived id, only when the producer can emit both facts for the same aggregate (check its states:
  if a completed appointment can never be cancelled, a cancellation with no invoice just returns).
- Never authorizes, throws business errors or `AggregateNotFoundException`, catches nor retries:
  the channel redelivers or dead-letters.

### Events between contexts

- One local **copy per foreign event and context** (same class name and `eventName`, only the
  fields read), next to its first reaction, registered once; never import the producer's class.
- Input data types (`MoneyData`) live next to their first use case, never in `domain/` nor shared
  between contexts. An application port (authorization data such as `PetOwnerships`) is an
  interface next to its first use case; a port with business meaning is a domain port.
- The event JSON is the contract; events leaving the system are translated to a versioned contract
  (`messageId` = `eventId`) [IDDD ch. 13].

### Read models

- Row of primitives, store port, query port, projection skipping applied `eventId`s and keeping
  the later `lastEventAt`; one reaction per event, values built through VOs (event time as
  `CreatedAt`).
- **Rows survive late or repeated events**: each reaction writes only its own fields; one flag per
  fact (`archived`), never one overwritten `status`.
- **Queries have no use case** (not even `FindCourse`): the entry point calls the query port, which
  converts and validates its text parameters; non-public data requires the actor. Read models
  never load aggregates.
- A business query is a read model when it only lists, a `Criteria` for `search` when the use case
  changes the aggregates.

## Infrastructure

- **One repository adapter per aggregate and technology** (`<Technology><Aggregate>Repository
  extends <Aggregate>Repository`): receives only its technology, converts with
  `fromPrimitives`/`toPrimitives`, the only code touching the database (no DAO, mapper nor generic
  repository).
- **Version check** [IDDD ch. 10] (shape: `InMemoryOrderRepository`): stale or existing id →
  `ConcurrencyException`; `version + 1` stored next to the primitives, never visible to the domain.
  Driver errors → `InternalErrorException` with `{ cause }`.
- **The repository owns the transaction** `[Fuera de los libros: convención de @archi-code/ddd]`:
  each `save`/`remove` atomic; events that must not be lost go to an outbox in the same write.
- In-memory: `structuredClone` both ways. IndexedDB: only `IndexedDbTable`, version check and write
  in one `IndexedDbTable.transaction`, `search` via `toIndexedDbQuery`; its errors are already
  `InfrastructureException`s: let them pass. `IndexedDbTable.of` throws where there is no
  `indexedDB`: a composition that also runs in Node loads the adapter with `await import()`.
- **Port adapters** are their own class (never a repository nor store), answer in VOs; bad external
  data → `InternalErrorException`, never a business error.
- One `DomainEventBus`; a new technology implements only `EventChannel`. Registry factories pass
  `eventId` and `occurredOn`.

## Entry points, composition, time, logging

- One protocol helper (shape: `Http`) is the only importer of `ExceptionClassifier`; 500 hides the
  message; a business code meaning 404 goes in its `NOT_FOUND_CODES` table.
- Controllers check only actor (401) and body shape (400), call one use case or query port, never
  catch, map statuses, check values nor touch repositories.
- `composition.ts` alone builds classes and subscribes reactions; nothing imports it.
- Time only via `CreatedAt.now()`/`UpdatedAt.now()` in aggregates, never `new Date()` for now;
  tests never fix it; no time source is passed anywhere. "Future" or "expired" is decided by the
  aggregate method (it is the only code that reads now); a search filters by state and pages.
- Log only through the `Logger` port: snake_case message, data in the context, after publishing,
  never from the domain, each error once, no secrets.
- Domain throws business errors; user use cases `AggregateNotFoundException`/`NotAllowedException`;
  reactions nothing; adapters `InfrastructureException`s with `{ cause }`.
