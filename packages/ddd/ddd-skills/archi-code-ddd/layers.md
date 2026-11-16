# Domain, application and infrastructure

Part of the `archi-code-ddd` skill: read it only when that skill routes here. Code in
`patterns.md`; folders and names in `where-each-class-goes.md`.

## Value objects

- **Optional by default** (`T | null`) `[Fuera de los libros: convención de @archi-code/ddd]`;
  `Required(XType)` demands `T` and throws `RequiredValueException` on `null`/`undefined`. An empty
  optional VO is `new X(null)`. A blank text is a value (`StringType` keeps it, other types throw
  `TypePrimitiveException`). An id is always required. `Required(...)` also declares `isRequired`.
- One named subclass per file (`class Email extends …`); `equals` compares the class too. Each
  context declares its own VOs, even when another context has a similar one.
- **A VO that exists is valid**: the constructor converts (`TypePrimitiveException`), checks
  `Required` (`RequiredValueException`) and runs every `@Validations` rule (one
  `ValidationException` with all `errors`: `{ field, code, message: '<Class>: <message>' }`,
  `code` = validator, custom rule name or exception code). No `assertValid()` nor `ensure…()`;
  `validate()` only re-runs the rules.
- Rules: `@Validations([...])` from `@archi-code/validation`: `{ validator, properties?, message? }`
  or `{ custom: '<camelCase>', fn, message }`. English messages. Subclasses inherit; same name
  replaces.
- **Report every field**: in `toCommand` (or at the start of a reaction) build VOs with
  `ValueObjectBuilder.build({ field: () => new X(input.field) })` / `buildList` (`/application`; the
  domain never uses it). Codes: required `DOM004`, conversion `DOM003`, rule name, or the
  `DomainException` code; list items by position (`lines.1.quantity`). Factories are synchronous
  (a Promise → `UnexpectedErrorException`); a non-`DomainException` error is a bug and wins.
- Kinds:
  - Text, number, boolean, date: `Required(StringType | NumberType | BooleanType | DateType)` or the
    bare base when optional.
  - Aggregate id: `class OrderId extends IdType<'OrderId'> {}`; new id `OrderId.generate()` (in the
    use case); derived id = static method over UUID v5 (`PaymentId.forOrder(order)`: `new
    PaymentId(UuidType.fromValue(`payment-of-order:${order.value}`))`). `UuidType`/`IdType` store
    lowercase.
  - Reference to another context's aggregate: `<Other>Reference extends Required(UuidType)`.
  - Enum: one `<Enum>Type.ts` with `enum <Enum>` (snake_case values), `<Enum>Option extends
    EnumType<<Enum>>` (`protected getEnum()`), `<Enum>Type extends Required(<Enum>Option)`; an
    optional enum is only `<Enum>Type extends EnumType<<Enum>>`. The primitive is the enum option
    (no cast in `fromPrimitives`); cast text input (`input.method as PaymentMethod`).
  - List of simple values: `<Item>List extends ArrayType<<Item>>` (`createItem`) + `<Item>s extends
    Required(<Item>List)`; items arrive valid (the first invalid item's error passes as is), list
    rules are `custom`.
  - Custom conversion: `extends AbstractType<T>` with only `protected filter(value)` (receives
    non-empty input, throws `TypePrimitiveException('<what>', value)`), plus a `Required(...)` class
    in a second file (`CentsAmount` + `Cents`). Restrict an existing type by extending it with
    `@Validations`; normalize by overriding `filter` and calling `super.filter(value)` first.
  - Several fields: `Composite`. Free-form JSON: `<Name>Data extends JsonTypeValue`,
    `<Name>Json extends JsonType<…>`, `<Name> extends Required(<Name>Json)`. JSON is never a
    composite and vice versa.
- **Immutable**: behavior returns new instances (`money.add`, `withItem`/`withoutItem`,
  `UpdatedAt.now()`).
- `toString()` is a method; `equals` by class and value; `isNull` for an empty optional. Dates go
  to events as `toString()` (ISO), fields named `…On`. `JSON.stringify` does not unwrap VOs:
  serialize `value` or `toPrimitives()`.
- **Every VO has `slug()`** (slug of its `toString()`: lowercase `a-z`, `0-9`, single inner `-`,
  accents removed, ordinals dropped, `''` for null; `JsonType` sorts its keys first; overriding
  `toString()` changes it); plain strings use `StringSanitizer.slug`. One-line text: the VO
  overrides `filter` with `StringSanitizer.singleLine(super.filter(value))`; `toCommand` never
  cleans by hand. No regex of your own. A slug is not unique: look aggregates up by id; to find one
  by slug, store it as its own VO with a unique index.
- `DateType` accepts `Date`, ISO dates (UTC midnight) and date-times **with** a zone; without a
  zone it throws `TypePrimitiveException`.
- **Several attributes = composite**: `class Money extends Composite({ amount: Cents, currency:
  MoneyCurrency }) {}`; fields are VO classes, composites or lists `[X]`; frozen;
  `fromPrimitives` reports every field path; `new X({ field: vo })` builds it from VOs;
  cross-field rules are `custom` validations receiving the composite. A collection with rules is a
  composite with a list field. A field may hold an optional VO with `null`; only a missing instance
  is refused. An optional composite is an `X | null` field, never `Required(Composite(...))`.
- **Money** = `Composite({ amount: Cents, currency: MoneyCurrency })`; `MoneyCurrency` is an enum
  value object (`enum Currency`, `CurrencyOption`, `MoneyCurrency extends EnumType` in
  `MoneyCurrency.ts`), never a validated text. Whole minor units (`Cents` ≥ 0, never a decimal), exact up to `Number.MAX_SAFE_INTEGER`
  cents, explicit rounding (discounts round down), `CurrencyMismatch`
  business error, in `shared-kernel/money/` `[Fuera de los libros: convención de @archi-code/ddd]`.
- **Derived values are methods, never getters** (`total()`): getters break `PrimitiveTypes`.

## Aggregates

`[Fuera de los libros: convención de @archi-code/ddd]`: public constructor, `create`, getters,
`fromPrimitives`/`toPrimitives`.

- `extends AggregateRoot<<Aggregate>Id>`, `super(id)`, `readonly id` (no `_id` + getter);
  `equals` compares class and id; an id holding no value throws `RequiredValueException`.
- Member order: `private static readonly` business constants → fields → constructor → `create` → `fromPrimitives` → getters →
  queries → business methods → `toPrimitives` → private helpers.
- Fields: `readonly x` if it never changes, else `private _x` + `get x()`; `createdAt`/`_updatedAt`
  last. Only VOs, composites or child entity arrays; never primitives, `Date`s nor plain objects
  (a flag is `class GiftWrap extends Required(BooleanType) {}`).
- **Constructor public, only assigns** (id first, dates last): no checks, events nor defaults;
  `create` and `fromPrimitives` both call it.
- **`static create(id, ...valueObjects)`**: builds children from `New<Child>` shapes assigning
  local ids (`new LineNumber(index + 1)`), sets initial state and
  `CreatedAt.now()`/`UpdatedAt.now()`, checks creation invariants (on the input, or private
  `assert…()` after building; business errors), records `<Aggregate>CreatedDomainEvent`. Never
  generates nor computes the id: the use case passes it.
- **`fromPrimitives(primitives: PrimitiveTypes<X>)`** rebuilds every field (`new X(...)`,
  composites `X.fromPrimitives`, children with their constructor); no events, no checks.
  **`toPrimitives`** returns plain data (VO → `.value`, composite → `.toPrimitives()`, child →
  object literal `{ id: line.id.value, … }`). `PrimitiveTypes` sees only public non-method members
  (strips `_`): round-trip test per aggregate, a private field without getter is silently lost.
- **Each state change is a business method** named after the action, VO params, returns `void`,
  updates `_updatedAt` (private `moveTo()`/`touch()`), records zero or more events.
- **A command can be refused, a fact cannot**: user-requested methods throw business errors;
  methods called by reactions (`markPaid`) return silently when they do not apply and never throw a
  business error (events arrive twice or late).
- A method that breaks an invariant after changing state restores it before rethrowing.
- Public queries and public `assert…()` preconditions a use case checks before an operation that
  does not change the aggregate (`order.assertDiscardable()` before `remove`) are allowed.
- Never holds a repository, bus, logger, HTTP, version, setters nor ids derived from other data.
  Other aggregates by id. Services and loaded data come as method arguments, never by constructor.
- **Child entities** (`entity/`): `extends Entity<<IdVO>>` (`LineNumber extends
  Required(NumberType)`), local id, fields like the aggregate's without `createdAt`/`updatedAt`,
  constructor takes VOs, calls `super(id)` and assigns; queries and business methods only the root
  calls; no setters, events, `create` nor own conversion. Use a composite unless something looks
  the part up by id (a use case changing a part by its number makes it a child entity); rules over
  all children are aggregate business errors checked by a private `assert…()` (`DuplicateSku`).
- No version on the aggregate: concurrency is the repository's.

## Domain events

`[Fuera de los libros: convención de @archi-code/ddd]`: `DomainEvent` suffix, dotted name, object
constructor.

- `event/<Aggregate><PastAction>DomainEvent.ts extends EventBase`, `static readonly eventName =
  '<aggregate>.<past_action>'` (snake_case, past tense, unique in the system); a missing or blank
  one throws `InvalidEventDefinitionException`.
- `readonly` primitive fields only (text, finite numbers, booleans, `null`, lists and plain objects
  of them; money `{ amount, currency }`, dates ISO); never VOs, `Date`s nor class instances; named
  id field (`orderId`, also for references), no `aggregateId`, no schema version; no personal data
  nobody needs.
- No interfaces nor type aliases in the file; constructor takes one inline `{ …fields } &
  EventMetadata`, destructures `eventId, occurredOn`, calls `super({ eventId, occurredOn })` and
  assigns each field.
- Plain data, no methods nor `toPrimitives`. Only its aggregate creates it (`this.record(...)`);
  pass `eventId`/`occurredOn` only when rebuilding a delivered event. The bus sets `occurredOn` on
  send (an event that has one keeps it) and sends `{ eventName, eventId, occurredOn, ...fields }`.
- No union type of an aggregate's events: `AggregateRoot`, `EventBus`, `DomainEventBus`,
  `EventRegistry` work with `EventBase`.
- `record` is `protected` and keeps the event as is; `pullDomainEvents()` returns them in order and
  empties the list: call it after saving, to publish.
- An added optional field is compatible; an incompatible change = new `eventName`, or a registry
  factory that reads both shapes.

## Business errors, specifications, domain services, repositories

- **Business error**: `exception/<WhatWentWrong>.ts extends DomainException`, no `Exception`
  suffix, only a constructor receiving primitives and calling `super('<English message>',
  ['<CTX><NNN>'])`: one prefix per context (`SAL`, `PAY`, `SHP`, `MNY` for money in
  `shared-kernel/money/`), next free number. Thrown only by the domain of its context, never by a
  reaction method.
- **Specification<T>** (`specification/<Rule>.ts`): a named yes/no business criterion
  [IDDD ch. 5]; params by constructor (then `super()`); a composed rule keeps `private readonly
  rule = new A().or(new B()).and(new C().not())`; `and`/`or` take any `SatisfiedBy<T>`; receives
  loaded data, never a repository; never guards an invariant (its answer is data, such as
  `freeShipping` in an event).
- **Domain service — when** (user rule, `[Fuera de los libros: convención de @archi-code/ddd]`).
  Only when:
  - two or more use cases (user or reaction) share business logic (`CreateCourse` and
    `PublishCourse` both look the course up → `CourseFinder`); or
  - a business rule one use case needs does not fit one aggregate or VO (needs several aggregates
    or a domain port: `OrderPricing` with `CouponCatalog`). A port call with no rule around it is
    not a domain service: the use case or reaction calls the port directly.

  Otherwise: rule over one aggregate's state → aggregate method (also "only the buyer cancels":
  `order.cancel(requester)`); calculation over values → VO method; yes/no criterion →
  `Specification`; load/authorize/save/publish → the use case.
- **Domain service — how**: plain stateless class with a business name (never `…Manager`,
  `…Helper`, `…Utils`); throws business errors; never saves, removes, publishes, logs, opens
  transactions nor authorizes. Preference order:
  1. loaded aggregates as method arguments, no dependencies;
  2. the **abstract** repository by constructor, only `findById` (never the implementation, as a
     type nor instantiated);
  3. a domain port by constructor (`service/<Port>.ts`, speaks VOs, implemented in infrastructure).
- **Never injected nor built in `composition.ts`**: the use case (user or reaction) receives the
  service's dependencies in its own constructor, typed with the abstract repository or the port
  (the concrete adapter is built only in `composition.ts`), and does `new
  CourseFinder(this.courses)` inside `handle`. A reaction calls only methods whose business errors
  it does not let out.
- **Tests**: real domain objects; deps stubbed with `vi.fn()` (`findById` resolving the aggregate
  or `null`).
- The domain declares the repository of each aggregate and nothing else about persistence: no
  mapper, adapter, command, logger nor `Date.now()`.
- **Repository contract**: one abstract `<Aggregate>Repository extends AggregateRepository<X>` per
  aggregate in `domain/repository/`, declaring as `abstract` only the verbs the business needs,
  each implementing its role: `findById(id): Promise<X | null>` (`AggregateFinder`),
  `save(x): Promise<void>` (`AggregateSaver`), `remove(x)` (`AggregateRemover`, only when the
  business deletes it), `search(criteria, options?): Promise<SearchResult<X>>`
  (`AggregateSearcher`, only when searched). Nothing else: no business names, query methods,
  `nextId()`, events nor code; the roles never type a dependency on their own.

## Use cases

| Kind              | Input        | Class                                                         | Run by         |
| ----------------- | ------------ | ------------------------------------------------------------- | -------------- |
| user use case     | request data | `<Action> extends UseCase<Input, Command, Output>`            | an entry point |
| reaction use case | an event     | `<Action>On<Event> extends EventListener<<Event>DomainEvent>` | the event bus  |

- **One thing**: one business action, one aggregate saved once (IDDD ch. 10 exceptions only as a
  written decision); flows are use cases chained by events, never one use case with flags or a
  `type` field. Named after the business action (`PlaceOrder`), never CRUD/technical
  (`UpdateOrder`, `OrderService`). No transactions, HTTP, raw shape checks nor business rules.
- **The aggregate decides, the use case does not branch on its state**: never `if
  (course.isDraft())` to pick an action in `handle`. When the outcome depends on the state, one
  aggregate method decides and the use case acts on its answer (`const outcome = course.retire()`
  returns `'discarded' | 'archived'`, then `remove` or `save`).
- **The written decision of a multi-aggregate use case** (IDDD ch. 10) lives in the project's
  decision records (`docs/decisions/<id>.md`), not only in a code comment; the code may keep one
  line pointing to it.
- **Never uses another use case** (user rule, no exception): never instantiates, receives, imports,
  extends nor calls another use case or reaction; no base use case with helpers. Shared logic →
  aggregate method or domain service; a shared technical step → a port; an action that must follow
  another → the first records an event and a reaction runs the second. Example: `CreateCourse`/`PublishCourse` both get
  `CourseRepository` and use `new CourseFinder(this.courses)`: `find` throws `CourseNotFound`,
  `assertDoesNotExist` throws `CourseAlreadyExists` (both `DomainException`; the domain cannot
  throw `AggregateNotFoundException`, which is `/application`). A lookup nobody shares may stay
  in the use case with `AggregateNotFoundException`.
- Constructor (`private readonly`, only what `handle` uses), in this order: the aggregate's abstract
  repository (never role intersections), the domain services' dependencies (never the service),
  `EventBus`, `Logger`; body `super();`.

### User use cases

- `application/<action>/<action>.ts` exports `<Action>Input` (primitives and data types,
  `actorId`/`actorRole`), `<Action>Command` (VOs, composites, `New<Child>[]`) and the class. Output
  `void` or the new id as `string`; never an aggregate.
- `toCommand` is exactly `return ValueObjectBuilder.build({ … })`: enums `new <Enum>Type(input.x as
  <Enum>)`, composites `X.fromPrimitives(input.x)`, lists `buildList(input.lines, (line) =>
  ValueObjectBuilder.build({ … }))`.
- `handle` order: authorization (`NotAllowedException('<English message>')`) →
  `<Aggregate>Id.generate()` → `create`, or `findById` + `AggregateNotFoundException('<Aggregate>',
  id.value)` (or a shared domain service) → business method(s) → `save`/`remove` once →
  `publish(x.pullDomainEvents())` → log if the business wants a trace → return. `UseCase` has no
  helpers. Let errors propagate: `execute` keeps package exceptions and wraps the rest in
  `UnexpectedErrorException` with `cause`.
- Authorization is the use case's when the actor alone decides: the entry point puts the requester
  (`actorId`/`actorRole`) in the input and `toCommand` builds it as a VO; when it depends on the
  aggregate's state, it is an aggregate business error.
- Concurrency: let `ConcurrencyException` reach the entry point (409). Only a repeat-safe use case
  (the same command twice gives the same result: set an address, mark paid) may retry; a
  relative change (a 10% discount, add stock) never retries, because a conflict may hide a change
  already applied. A repeat-safe one may retry the whole load→save→publish (`private static readonly ATTEMPTS = 3`), rethrowing anything
  else and the last conflict, never with the same loaded aggregate [IDDD ch. 10].

### Reaction use cases

`[Fuera de los libros: convención de @archi-code/ddd]`: the listener **is** the use case.

- `application/<action>/<action>-on-<event>.ts` (read model:
  `application/<read-model>/<action>/<action>-on-<event>.ts`), class `<Action>On<Event>` (`<Event>`
  without `DomainEvent`); one event per class and one class per reaction, also when several events
  feed one read model.
- `@ListensTo(<Event>DomainEvent, { consumer: '<context>.<action>-on-<event>' })`: its identity
  (queue) in the channel, stable literal, unique, never from the class name. The event class is the
  local copy of a foreign event, or the context's own event (read models).
- Constructor as a user use case; a read-model reaction receives only its projection.
- `handle`: `ValueObjectBuilder.build` → derived id → create (`return` if the id exists) or load
  (`return` if missing) → reaction method (silent if not applicable) → save once → publish → log.
- **Facts may arrive in any order between aggregates**: the reaction to a closing fact
  (cancelled, voided) that finds no aggregate under the derived id creates it already closed
  (`Invoice.createVoided(id, …)`), so the creating reaction that arrives later finds the id taken
  and returns. A fact is never lost because of its order.
- **External side effects** (charge a gateway, send an email, call another system) never run
  before `save` in a user use case: a conflict on `save` would leave the effect done and
  unrecorded. The use case only records the intent (`invoice.requestPayment(...)` →
  `InvoicePaymentRequestedDomainEvent`) and saves; a reaction to that event receives the domain
  port by constructor and calls it directly with an idempotency key, then records the outcome on
  the aggregate (`markPaid(chargeId)` / `markPaymentFailed(reason)`) and saves. The key is one per
  attempt and per effect: the `eventId` of the event that asked for it (a declined charge retried
  is a new request, a new key; the refund has its own key). The aggregate id is a key only for an
  effect that happens once in the aggregate's life.
- **Uniqueness across aggregates** ("one active enrollment per student and course") is never a
  `search` before `create`: two concurrent requests both pass it. Make the unique key the
  derived id (UUID v5 of student + course + attempt number, or a `Seat` aggregate per student and
  course), so the repository refuses the second insert with `ConcurrencyException`. A `search`
  check is acceptable only as an accepted eventual-consistency decision record.
- Never authorizes, throws `AggregateNotFoundException` or business errors (redelivered forever),
  calls use cases, handles HTTP, catches errors. `DomainEventBus` logs failures (`warn` for domain
  and application exceptions, `error` otherwise) and rethrows; channel redelivery is the retry.
- **Idempotent**: derived id check on create, silent methods on change, projections skip applied
  `eventId`s.

### Events between contexts

- Never import another context's event: the consumer keeps **one copy per foreign event and
  context** (`<event>-domain-event.ts`, same class name and `eventName`, the union of the fields its
  reactions read, written like a domain event: inline types, `EventMetadata`), in the folder of
  the first reaction that hears it; every other reaction of the context imports that copy, and
  `registry()` registers it once (`EventRegistry` refuses an `eventName` twice).
- Input data types (`MoneyData`) are `export interface`s in kebab-case files in the folder of the
  first use case needing them (the context imports them from there); never in `domain/`, never
  shared between contexts. Nested foreign-event objects get data types
  named after the event (`PaidOrderAddress`); registry factories cast with them, never
  `Event['field']`. The context's own events are cast with its existing data types
  (`json.total as MoneyData`) and inline shapes; no data type is created only for the registry.
- An event no VO accepts throws `ValidationException` in the reaction, uncaught: `DomainEventBus`
  logs it and the channel keeps it (dead letter).
- An event's JSON is the contract: no incompatible change under the same `eventName`; events
  leaving the system are translated by the broker adapter to a versioned published contract
  (`messageId` = `eventId`) [IDDD ch. 13].

### Read models

- `application/<read-model>/`: `<row>.ts` (row interface of primitives + `<Row>Changes =
  Partial<Pick<<Row>, …>>`), `<row>-store.ts` (write port: `find`, `hasApplied`, `save(row,
  eventId)`), `<rows>.ts` (query port: `byId`, `ofCustomer`), `<row>-projection.ts`, one subfolder
  per reaction.
- The projection is not a use case and hears no event: it receives the store port; `apply({
  eventId, orderId, occurredOn, changes })` skips applied `eventId`s, merges into the stored (or a
  default) row, sets `lastEventAt` and saves with the `eventId`.
- Each reaction builds `eventId: new UuidType(event.eventId)`, `occurredOn: new
  CreatedAt(event.occurredOn as string)` and the id, then calls `projection.apply(...)`.
- One reaction per event that changes the row. Queries have no use case, not even reading one
  aggregate by id (no `FindCourse`): the entry point calls the query port of a read model.
  Query parameters arrive as text: the controller checks only that they are present, the query
  port takes primitives and its implementation converts and validates them (invalid → empty
  result or `ValidationException`); a controller never does `Number(...)` nor checks values.
  A query that shows non-public data (drafts) requires the actor like any endpoint.
  Only use cases that change state load aggregates. One infrastructure class implements both ports and returns `structuredClone` copies.
  Never loads aggregates nor uses a repository. Event Sourcing/CQRS beyond this only for a concrete
  need.
- A business query (`pendingOlderThan`) is a read model when it only shows/lists, and a `Criteria`
  for `search` when a use case needs the aggregates to change them.
- **Order-independent rows**: events may arrive late, twice or with a new `eventId`, so each
  reaction writes only the fields its event owns and never overwrites a later fact. Keep one flag
  per fact (`published`, `archived`) instead of one overwritten `status`; a creation reaction
  never resets a status set by a later event.
- Reactions of a read model build the values they store through value objects too
  (`ValueObjectBuilder.build`), never raw event fields.

## Infrastructure

- **Repositories only get, search and persist** (`findById`, `search`, `save`, `remove`): no
  business logic, business query methods, `nextId()` nor events. **One adapter per aggregate and
  technology** (`infrastructure/persistence/<technology>-<aggregate>-repository.ts`), `extends
  <Aggregate>Repository` implementing exactly its verbs (a test double may add technical read
  helpers such as `versionOf(id)`), constructor (`super()` first) receives only its technology
  (never an aggregate class nor mapper), calls `fromPrimitives` on load and `toPrimitives` on save.
- **Persistence is that one adapter**: database technology only inside it; no DAO, storage service
  nor helper; use cases, services, entry points and `composition.ts` never touch the database.
- **IndexedDB**: `IndexedDb<Aggregate>Repository` in
  `infrastructure/persistence/indexeddb-<aggregate>-repository.ts`, over `IndexedDbTable` of
  `@archi-code/ddd/infrastructure`, never raw `indexedDB`/`IDBDatabase`/`IDBObjectStore` nor
  another library:
  - table declared once in a `private static readonly` field (`IndexedDbTable.of<Row, Index>(name,
    { database, indexes, version, migrations })`); versions, upgrades and connections are the
    table's;
  - row `{ ...x.toPrimitives(), version }` (`PrimitiveTypes<X> & { version: number }`), key = the
    aggregate's `id` (already a UUID); on load split `version` off before `fromPrimitives`;
  - `save`/`remove`: version check + write in one `IndexedDbTable.transaction` (only `tx` calls
    awaited inside; a stale version throws `ConcurrencyException` inside and rolls back);
    multi-table aggregates or an outbox in that same transaction;
  - `search` via `toIndexedDbQuery` of `@archi-code/criteria-adapters/indexeddb` → `find`, then
    `fromPrimitives` on every row;
  - `withStore` only for what the table does not wrap, never CRUD; `IndexedDbInspector` only for
    diagnostics. Table errors are already `InfrastructureException`s: let them pass (or wrap with
    `{ cause }`). Read-model stores follow the same rules.
- In-memory repository: an implementation like any other [IDDD ch. 12];
  `infrastructure/persistence/in-memory-<aggregate>-repository.ts` when the app runs in memory, else
  `test/support/` (the package ships none); `Map<string, { version, primitives }>` with
  `structuredClone` copies both ways.
- **Version check in every repository** [IDDD ch. 10]: private `WeakMap<X, number>`; on load
  `versions.set(x, row.version)`; on save `version = versions.get(x) ?? 0`, a stored version
  (`?? 0`) that differs → `ConcurrencyException('<Aggregate>', id, version)` (so an existing id for
  a new aggregate conflicts too); store `version + 1` next to (never inside) the primitives and
  remember it; `remove(aggregate)` checks too. Driver errors → `InternalErrorException` with
  `{ cause }`.
- **The repository owns the transaction** `[Fuera de los libros: convención de @archi-code/ddd]`: no
  transaction port; each `save`/`remove` atomic (one document, or a DB transaction opened inside
  `save`); events that must not be lost go in an outbox in the same write and a relay delivers them
  through an `EventChannel`.
- **A domain port has its own adapter class** (`infrastructure/<area>/<technology>-<port>.ts`),
  never implemented by a repository or a read-model store; when the data comes from a read model,
  the adapter wraps its query port (`ReadModelCourseCatalog implements CourseCatalog`).
- **Port adapters** (`infrastructure/<area>/<technology>-<port>.ts`) receive raw data or their
  technology by constructor (raw shapes as interfaces in the same file), answer in VOs; bad
  external data → `InternalErrorException` with `{ cause }`, never a business error.
- **Event wiring** (composition only): `DomainEventBus(channel, registry, logger)` implements
  `EventBus` (`publish` sends plain copies in one `send`; `subscribe(listener)` → `Subscription`,
  refuses an unregistered event with `UnknownEventException`, hands the listener the event rebuilt
  from JSON, also in memory). A new technology implements only `EventChannel` (`send`,
  `receive(eventName, consumer, handler)` → `ChannelSubscription`); swapping it changes one line.
  `EventRegistry` registers each heard event once; its factory casts every field and passes
  `eventId: json.eventId`, `occurredOn: json.occurredOn` (`fromJSON` throws
  `InternalErrorException` when lost).

## Entry points and composition

- The package speaks no protocol. One protocol helper (`platform/http/http.ts`, shared by every
  context, no business rule) maps `ExceptionClassifier.classify(error)`: `Malformed` (conversion or
  required error thrown alone) and `Rejected` (other `ApplicationException`) 400, `NotAllowed` 403,
  `NotFound` (`AggregateNotFoundException`) 404, `Conflict` 409, `Invalid` (`ValidationException`
  and other `DomainException`) 422, `Internal` 500 (logged once as `http_request_failed`, message
  hidden). Body `{ code, message, errors }` (`errors` only for `ValidationException`). No
  `instanceof` chains.
- Domain-service business errors (`CourseNotFound`) are `Invalid` (422). For a 404 the helper keeps
  a table of business codes (`private static readonly NOT_FOUND_CODES = new Set(['CRS001'])`)
  checked after `ExceptionClassifier`, the only place that turns a code into a status; controllers
  still never catch errors.
- Controllers (`interfaces/http/<aggregates>-controller.ts`) receive the user use cases (or one
  `<Aggregates>UseCases` interface), the query ports and `logger` last, and build their `Http`
  helper. One method per endpoint returns `this.http.respond(async () => …)`: missing
  `request.auth` when an actor matters → 401; a body that is not a JSON object (or a list not an
  array) → 400 with an English hint (shape only, never values); `await useCase.execute({ actorId |
  actorRole, …params, …body })`; 201 `{ id }` to create, 204 for a command, 200 for a query (a
  missing row → 404). Never catch errors, map statuses nor hold rules.
- `composition.ts` (`<Context>Context`, `interface <Context>Settings { channel; logger; …own data
  }`): the only place that builds classes and reads config. `static async start(settings)` builds
  `new DomainEventBus(channel, <Context>Context.registry(), logger)`, repositories, adapters,
  projections, every reaction (`await bus.subscribe(listener)`, `Subscription` kept), then the
  controller with the user use cases; never domain services. `async stop()` unsubscribes; `private
  static registry()` builds the `EventRegistry`. One top-level file opens one channel, starts every
  context with that channel and logger, and stops them in reverse order.

## Time and logging

- Current time only through `CreatedAt.now()`/`UpdatedAt.now()` in the aggregate; never
  `Date.now()`/`new Date()` for now (`new Date(createdAt.value.getTime() + ms)` from a known value
  is fine); no time source passed anywhere. Tests never fix the time: they check stamped dates are
  valid and build loaded dates with the constructor (`new CreatedAt('2026-03-01T09:30:00Z')`).
- Log through the `Logger` port (`debug`/`info`/`warn`/`error`, each `(message, context?)`): stable
  snake_case message, data in the context, after publishing; never from the domain (it records
  events or throws); each error logged once where handled. A reaction logs only when its method
  recorded events. The composition root picks the provider: `ConsoleLogger({ level })`, an adapter over
  pino or winston, `InMemoryLogger` in tests, `SilentLogger` by default.

## Where to throw each exception

- Domain: business errors; VO exceptions come from the VOs (throw them yourself only in `filter`).
- User use cases: `AggregateNotFoundException`, `NotAllowedException`, `ApplicationException`.
  Reactions throw none.
- Adapters: `InternalErrorException` (or another `InfrastructureException`) with `{ cause }`.
- For logs or messages use `error.code` and each layer's code enum (`DomainExceptionCode`,
  `ApplicationExceptionCode`, `InfrastructureExceptionCode`) or `instanceof` (works across CJS and
  ESM builds).
