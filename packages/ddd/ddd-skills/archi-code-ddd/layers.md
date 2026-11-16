# Domain, application and infrastructure

Part of the `archi-code-ddd` skill: read it only when that skill routes here. The rules of every
kind of class; code in `patterns.md`, folders and names in `where-each-class-goes.md`. Every rule
here is also an audit item.

## Value objects

- **Optional by default** (`T | null`) `[Fuera de los libros: convención de @archi-code/ddd]`;
  `Required(XType)` demands `T` (`RequiredValueException`) and declares `isRequired`. Empty
  optional: `new X(null)`. A blank text is a value (`StringType` keeps it, other types throw
  `TypePrimitiveException`). Ids are always required, never nil/max UUIDs.
- **One named subclass per file** (`class Email extends …`), never `Required(StringType)` as a
  property type. Each context declares its own VOs, even when another has a similar one.
- **A VO that exists is valid**: the constructor converts (`TypePrimitiveException`), checks
  `Required` and runs every `@Validations` rule (one `ValidationException`, `errors` =
  `{ field, code, message: '<Class>: <message>' }`). No `assertValid()`/`ensure…()`; `validate()`
  only re-runs the rules; never catch `ValidationException` to keep an invalid value.
- Rules: `@Validations` from `@archi-code/validation` (never `/domain`): `{ validator,
  properties?, message? }` or `{ custom: '<camelCase>', fn, message }`, English messages;
  subclasses inherit, same name replaces. VO rules never move to a controller or request schema.
- **Report every field**: in `toCommand` (or first thing in a reaction) build VOs only with
  `ValueObjectBuilder.build({ field: () => new X(input.field) })` / `buildList` (`/application`,
  never in the domain); never one by one with `new`, never raw input in `handle`, never raw strings
  to aggregates. Codes: required `DOM004`, conversion `DOM003`, rule name or the
  `DomainException` code; list items by position (`lines.1.quantity`). Factories are synchronous;
  a non-`DomainException` error is a bug and wins.
- Kinds:
  - Text, number, boolean, date: `Required(StringType | NumberType | BooleanType | DateType)`, or
    the bare base when optional. Pass converted values (`new NumberType(1.5)`, not `'1.5'`).
  - Aggregate id: `class OrderId extends IdType<'OrderId'> {}` (always branded); new id
    `OrderId.generate()` in the use case; derived id = static UUID v5 method
    (`PaymentId.forOrder(order)`). Stored lowercase.
  - Another context's aggregate: `<Other>Reference extends Required(UuidType)`, never its id class.
  - Enum: one `<Enum>Type.ts` with `enum <Enum>` (snake_case values), `<Enum>Option extends
    EnumType<<Enum>>` (`protected getEnum()`), `<Enum>Type extends Required(<Enum>Option)` (optional:
    only `<Enum>Type extends EnumType`). The primitive is the enum option; cast text input
    (`input.method as PaymentMethod`).
  - List of simple values: `<Item>List extends ArrayType<<Item>>` (`createItem`) + `<Item>s extends
    Required(<Item>List)`; items arrive valid, list rules are `custom`. Never a list of composites.
  - Custom conversion: `extends AbstractType<T>` with only `protected filter(value)` (throws
    `TypePrimitiveException('<what>', value)`) + its `Required(...)` class in a second file
    (`CentsAmount` + `Cents`). Restrict a type by extending it with `@Validations`; normalize by
    overriding `filter` after `super.filter(value)`.
  - Several fields: `Composite`. Free-form JSON: `<Name>Data extends JsonTypeValue`, `<Name>Json
    extends JsonType<…>`, `<Name> extends Required(<Name>Json)` (an object, never `{}` nor an
    array). JSON is never a composite and vice versa.
- **Immutable**: behavior returns new instances (`money.add`, `withItem`/`withoutItem`); compare
  with `equals` (class + value), never `===`; `toString()` is a method; `isNull` for empty.
  `JSON.stringify` does not unwrap VOs: use `value` or `toPrimitives()`.
- **Text**: every VO has `slug()` (plain strings: `StringSanitizer.slug`); one-line text overrides
  `filter` with `StringSanitizer.singleLine(super.filter(value))`. No own regex, no cleaning
  outside `filter`. A slug is not unique nor an id: to find by slug, store it as its own VO with a
  unique index.
- `DateType` accepts `Date`, ISO dates and date-times **with** a zone; dates go to events as
  `toString()` in fields named `…On`.
- **Composite**: `class Money extends Composite({ amount: Cents, currency: MoneyCurrency }) {}`;
  fields are named VO classes, composites or lists `[X]`; frozen, no added state;
  `fromPrimitives` reports every path; cross-field rules are `custom` validations on the
  composite. A collection with rules is a composite with a list field. Optional composite: an
  `X | null` field, never `Required(Composite(...))`. Loose fields, `JsonType` or a child entity
  where a composite belongs are wrong.
- **Money** (`shared-kernel/money/`) = `Composite({ amount: Cents, currency: MoneyCurrency })`:
  whole minor units (`Cents` ≥ 0), explicit rounding (discounts round down), `MoneyCurrency` an
  enum VO (`Currency`, `CurrencyOption`, `MoneyCurrency`), `CurrencyMismatch` business error.
- **Derived values are methods, never getters** (`total()`), on VOs, composites, entities and
  aggregates: getters break `PrimitiveTypes`.

## Aggregates

`[Fuera de los libros: convención de @archi-code/ddd]`: public constructor, `create`, getters,
`fromPrimitives`/`toPrimitives`.

- `extends AggregateRoot<<Aggregate>Id>`, `super(id)`, `readonly id` (never `_id` + getter).
  Member order: `private static readonly` constants → fields → constructor → `create` →
  `fromPrimitives` → getters → queries → business methods → `toPrimitives` → private helpers.
- Fields: `readonly x` if it never changes, else `private _x` + `get x()`; `createdAt`/`_updatedAt`
  last. Only VOs, composites or child entity arrays (a flag is `class GiftWrap extends
  Required(BooleanType) {}`).
- **Constructor public, only assigns** (id first, dates last): no checks, defaults nor events.
- **`static create(id, ...valueObjects)`** is the only factory: builds children from `New<Child>`
  shapes with local ids, initial state, `CreatedAt.now()`/`UpdatedAt.now()`, creation invariants
  (business errors), records `<Aggregate>CreatedDomainEvent` and nothing else. The use case passes
  the id; `create` never generates nor derives it. Only exception: `create<ClosedState>`
  (`Invoice.createVoided`) for a closing fact that arrives before the creating one.
- **`fromPrimitives(PrimitiveTypes<X>)`** rebuilds every field, no events nor checks;
  **`toPrimitives`** returns plain data (VO → `.value`, composite → `.toPrimitives()`, child →
  literal). `PrimitiveTypes` sees only public non-method members: a private field without getter
  is silently lost, so every aggregate has a round-trip test.
- **Each state change is a business method** named after the action, VO params, `void`, updates
  `_updatedAt` (private `moveTo()`/`touch()`), records zero or more events; `record()` only from
  inside.
- **A command can be refused, a fact cannot**: user-requested methods throw business errors
  (never ignore an invalid state silently); methods reactions call (`markPaid`) return silently
  and never throw (events arrive twice or late). A broken invariant restores the state before
  rethrowing.
- Public queries and public `assert…()` preconditions for an operation that does not change it
  (`order.assertDiscardable()` before `remove`) are allowed. Authorization that depends on its
  state is an aggregate method (`order.cancel(requester)`).
- Never holds a repository, bus, logger, HTTP, version, setters, services, nor other aggregates
  (only their ids); loaded data and services come as method arguments.
- **Child entity** (`entity/`): `extends Entity<<IdVO>>` (`LineNumber extends
  Required(NumberType)`), local id, VO fields without dates, `super(id)` + assign; methods only
  its root calls; no setters, events, `create` nor own conversion. Only when something looks the
  part up by id; otherwise a composite. Rules over all children: private `assert…()` in the root.

## Domain events

`[Fuera de los libros: convención de @archi-code/ddd]`: `DomainEvent` suffix, dotted name, object
constructor.

- `<Aggregate><PastAction>DomainEvent extends EventBase`, `static readonly eventName =
  '<aggregate>.<past_action>'` (snake_case, past tense, unique); never `OrderUpdated` with the
  whole state.
- `readonly` primitive fields only (text, finite numbers, booleans, `null`, lists and plain
  objects; money `{ amount, currency }`, dates ISO); named id field (`orderId`), no
  `aggregateId`, no schema version, no `undefined`, no personal data nobody needs.
- Constructor takes one inline `{ …fields } & EventMetadata` (no interfaces nor type aliases in
  the file), calls `super({ eventId, occurredOn })`, assigns each field. No methods.
- Only its aggregate creates it; `eventId`/`occurredOn` are passed only when rebuilding a delivered
  event (the bus sets `occurredOn` on send). No union type of an aggregate's events nor event type
  parameters: everything works with `EventBase`.
- `pullDomainEvents()` returns them in order and empties the list: call it after `save`, to publish.
- An added optional field is compatible; an incompatible change is a new `eventName` (or a
  registry factory reading both shapes).

## Business errors, specifications, domain services, repositories

- **Business error**: `exception/<WhatWentWrong>.ts extends DomainException`, no `Exception`
  suffix, only a constructor with primitives calling `super('<English message>', ['<CTX><NNN>'])`
  (one prefix per context: `SAL`, `PAY`, `MNY`…). Thrown only by its context's domain.
- **Specification<T>**: a named yes/no business criterion [IDDD ch. 5]; params by constructor;
  composed with `and`/`or`/`not`; receives loaded data, never loads; never guards an invariant.
- **Domain service only when** (user rule, `[Fuera de los libros: convención de @archi-code/ddd]`)
  two or more use cases share business logic (`CourseFinder`), or one rule needs several
  aggregates or a domain port (`OrderPricing` with `CouponCatalog`). Otherwise: one aggregate's
  state → aggregate method; values → VO method; yes/no → `Specification`; load, authorize, save,
  publish → the use case. A bare port call is not a service: call the port.
- **Domain service how**: stateless, business name (never `…Manager`/`…Helper`/`…Utils`), throws
  business errors (never `AggregateNotFoundException`); never saves, publishes, logs, opens
  transactions nor authorizes. Dependencies, in order of preference: loaded aggregates as
  arguments; the **abstract** repository (only `findById`, and only when the use case does not
  already hold the aggregates); a domain port (`service/<Port>.ts`, speaks VOs). **Never injected
  nor built in `composition.ts`**: the use case receives the service's dependencies and does `new
  CourseFinder(this.courses)` in `handle`. Tests: real domain objects, deps stubbed with `vi.fn()`.
- **Repository contract**: one `abstract class <Aggregate>Repository extends
  AggregateRepository<X>` per aggregate in `domain/repository/`, declaring as `abstract` only the
  verbs the business needs, each implementing its role: `findById(id): Promise<X | null>`
  (`AggregateFinder`), `save(x)` (`AggregateSaver`), `remove(x)` (`AggregateRemover`),
  `search(criteria, options?): Promise<SearchResult<X>>` (`AggregateSearcher`). No interface,
  code, business names, query methods, `nextId()`, events nor DTOs; dependencies are always typed
  with it, never with roles. Nothing else about persistence lives in the domain.

## Use cases

| Kind              | Input        | Class                                                         | Run by         |
| ----------------- | ------------ | ------------------------------------------------------------- | -------------- |
| user use case     | request data | `<Action> extends UseCase<Input, Command, Output>`            | an entry point |
| reaction use case | an event     | `<Action>On<Event> extends EventListener<<Event>DomainEvent>` | the event bus  |

- **One thing**: one business action, one aggregate saved once; named after the action
  (`PlaceOrder`), never CRUD/technical. Flows are use cases chained by events, never flags or a
  `type` field. A multi-aggregate exception (IDDD ch. 10) is a decision record in
  `docs/decisions/<id>.md`, not only a code comment.
- **Never uses another use case** (user rule, no exception): never instantiates, receives,
  imports, extends nor calls one, nor a reaction; no base use case with helpers. Shared rule →
  aggregate method or domain service; shared technical step → a port; "B after A" → A records an
  event, a reaction does B.
- **The aggregate decides**: `handle` never branches on its state to pick an action; one method
  returns the outcome (`course.retire()` → `'discarded' | 'archived'`) and the use case acts on it.
- Constructor (`private readonly`, only what `handle` uses): the abstract repository, the domain
  services' dependencies, `EventBus`, `Logger`; body `super();`.
- No transactions, units of work, connections, HTTP, raw shape checks nor business rules; never
  `/infrastructure`.

### User use cases

- `application/<action>/<action>.ts` exports `<Action>Input` (primitives, data types,
  `actorId`/`actorRole`), `<Action>Command` (VOs, composites, `New<Child>[]`; never a class) and
  the class. Output `void` or the new id as `string`; never an aggregate.
- `toCommand` is exactly `return ValueObjectBuilder.build({ … })` (enums `new X(input.x as Enum)`,
  composites `X.fromPrimitives`, lists `buildList`).
- `handle`: authorization when the actor alone decides (`NotAllowedException`) → `Id.generate()` +
  `create`, or `findById` + `AggregateNotFoundException('<Aggregate>', id.value)` (or a shared
  domain service) → business method(s) → `save`/`remove` once → `publish(x.pullDomainEvents())` →
  log if the business wants a trace. Let errors propagate (`execute` wraps unknown ones in
  `UnexpectedErrorException`); never catch to rethrow.
- **Concurrency**: `ConcurrencyException` reaches the entry point (409). Only a repeat-safe command
  (set an address, mark paid) may retry the whole load→save→publish, a few times
  (`ATTEMPTS = 3`), never with the same loaded aggregate; a relative change (10% discount, add
  stock) never retries [IDDD ch. 10].
- **External side effects** (charge, email, another system) never run before `save`: the use case
  records the intent (`invoice.requestPayment()` → event) and saves; a reaction calls the port
  with an idempotency key (the `eventId` that asked for it: one per attempt and per effect; the
  aggregate id only for a once-in-a-lifetime effect) and records the outcome.
- **Uniqueness across aggregates** is the derived id (UUID v5 of the unique key), refused by the
  repository with `ConcurrencyException`; never a `search` before `create` (unless an accepted
  eventual-consistency decision record).
- A bulk `search` always pages with `limit`.

### Reaction use cases

`[Fuera de los libros: convención de @archi-code/ddd]`: the listener **is** the use case; never a
listener calling a `UseCase`.

- `application/<action>/<action>-on-<event>.ts` (read model:
  `application/<read-model>/<action>/…`), `<Action>On<Event>`, one event per class, one class per
  reaction.
- `@ListensTo(<Event>DomainEvent, { consumer: '<context>.<action>-on-<event>' })`: a stable,
  unique literal, never from the class name. Subscribed only in `composition.ts`.
- `handle`: `ValueObjectBuilder.build` → derived id → create (`return` if the id exists) or load
  (`return` if missing) → reaction method → save once → publish → log only if events were recorded.
- **Order-independent**: a closing fact (cancelled) finding no aggregate creates it already closed
  under the derived id; the late creating reaction then finds the id taken and returns.
- **Idempotent**: derived id on create, silent methods on change, projections skip applied
  `eventId`s.
- Never authorizes, throws `AggregateNotFoundException` or business errors (redelivered forever),
  catches, retries nor calls use cases. A failure is logged by `DomainEventBus` and rethrown; the
  channel redelivers or dead-letters (an event no VO accepts ends there).

### Events between contexts

- Never import another context's event: one **copy per foreign event and context**
  (`<event>-domain-event.ts`, same class name and `eventName`, only the fields its reactions read),
  in the folder of the first reaction that hears it, registered once.
- Input data types (`MoneyData`) are `export interface`s next to the first use case needing them;
  never in `domain/`, never shared between contexts. Registry factories cast with them, never
  `Event['field']`; no data type exists only for the registry.
- The event JSON is the contract: no incompatible change under the same `eventName`; events
  leaving the system go through the broker adapter as a versioned contract (`messageId` =
  `eventId`) [IDDD ch. 13].

### Read models

- `application/<read-model>/`: row interface of primitives (+ `<Row>Changes`), store port (`find`,
  `hasApplied`, `save(row, eventId)`), query port (`byId`, `ofCustomer`), projection, one subfolder
  per reaction. One infrastructure class implements both ports, returns `structuredClone` copies.
- The projection is not a use case: `apply({ eventId, id, occurredOn, changes })` skips applied
  `eventId`s, merges into the stored or default row, sets `lastEventAt`, saves with the `eventId`.
  Each reaction builds its values through VOs, never raw event fields.
- **Rows survive late or repeated events**: each reaction writes only the fields its event owns;
  one flag per fact (`published`, `archived`), never one overwritten `status`; a creation reaction
  never resets a later status.
- **Queries have no use case** (not even `FindCourse`): the entry point calls the query port. The
  port takes text and converts/validates it itself; a controller never does `Number(...)`. A query
  showing non-public data requires the actor. Read models never load aggregates.
- A business query (`pendingOlderThan`) is a read model when it only lists, a `Criteria` for
  `search` when a use case changes the aggregates.

## Infrastructure

- **One repository adapter per aggregate and technology**
  (`infrastructure/persistence/<technology>-<aggregate>-repository.ts`, `extends
  <Aggregate>Repository`, exactly its verbs; a test double may add `versionOf(id)`): constructor
  receives only its technology (never an aggregate class nor mapper), `fromPrimitives` on load,
  `toPrimitives` on save. It is the only place that touches the database: no DAO, storage helper,
  rows built by hand nor generic repository.
- **Version check in every repository** [IDDD ch. 10]: private `WeakMap<X, number>` set on load;
  on save/remove, stored version (`?? 0`) ≠ remembered (`?? 0`) → `ConcurrencyException('<Aggregate>',
  id, version)` (an existing id for a new aggregate conflicts too); store `version + 1` next to the
  primitives, never visible to domain or application. Driver errors → `InternalErrorException`
  with `{ cause }`.
- **The repository owns the transaction** `[Fuera de los libros: convención de @archi-code/ddd]`:
  each `save`/`remove` atomic (a DB transaction inside `save` for multi-table aggregates); events
  that must not be lost go to an outbox in the same write, relayed through an `EventChannel`.
- **In-memory**: `Map<string, { version, primitives }>` with `structuredClone` both ways; in
  `infrastructure/persistence/` when the app runs in memory, else `test/support/`.
- **IndexedDB** (`IndexedDb<Aggregate>Repository`): only over `IndexedDbTable` (never raw
  `indexedDB`, another library, `withStore` for CRUD nor `IndexedDbInspector`), declared once in a
  `private static readonly` field; row `{ ...x.toPrimitives(), version }`, key the aggregate `id`;
  version check + write in one `IndexedDbTable.transaction` awaiting only `tx` calls; `search` via
  `toIndexedDbQuery` → `find` → `fromPrimitives`. Read-model stores follow the same rules.
- **Port adapters** (`infrastructure/<area>/<technology>-<port>.ts`): their own class (never a
  repository nor read-model store; over a read model it wraps the query port), raw shapes as
  interfaces in the same file, answer in VOs; bad external data → `InternalErrorException` with
  `{ cause }`, never a business error.
- **Events**: one `DomainEventBus(channel, registry, logger)`; a new technology implements only
  `EventChannel` (never a second bus). `EventRegistry` registers each heard event once; its factory
  casts every field and passes `eventId` and `occurredOn`.

## Entry points and composition

- One protocol helper (`platform/http/http.ts`, shared, the only importer of
  `ExceptionClassifier`) maps `classify(error)`: `Malformed`/`Rejected` 400, `NotAllowed` 403,
  `NotFound` 404, `Conflict` 409, `Invalid` 422, `Internal` 500 (logged once as
  `http_request_failed`, message hidden). Body `{ code, message, errors }`. A business code that
  means 404 (`CourseNotFound`) goes in its `NOT_FOUND_CODES` table, the only code → status
  mapping. No `instanceof` chains.
- Controllers (`interfaces/http/<aggregates>-controller.ts`) receive use cases, query ports and
  `logger`; each endpoint returns `this.http.respond(async () => …)`: 401 without `request.auth`
  when an actor matters, 400 for a body of the wrong shape (never values), `execute({ actor…,
  …params, …body })`, then 201 `{ id }` / 204 / 200. They never catch, map statuses, check values,
  hold rules nor touch repositories or adapters.
- `composition.ts` (`<Context>Context`, `<Context>Settings { channel; logger; … }`) is the only
  place that builds classes and reads config, and nothing imports it: `start` builds the bus,
  repositories, adapters, projections, subscribes every reaction and builds controllers (never
  domain services); `stop` unsubscribes. One top-level file opens one channel and starts/stops
  every context.

## Time, logging and exceptions

- Current time only through `CreatedAt.now()`/`UpdatedAt.now()` in the aggregate; never `new
  Date()`/`Date.now()` for now, no time source anywhere. Tests never fix the time.
- Log through the `Logger` port (never a library) with a stable snake_case message and data in the
  context, after publishing; never from the domain; each error logged once where handled; no
  secrets nor unneeded personal data. Provider chosen in composition (`ConsoleLogger`,
  `InMemoryLogger` in tests, `SilentLogger` by default).
- Who throws what: domain → business errors (VO exceptions only from `filter`); user use cases →
  `AggregateNotFoundException`, `NotAllowedException`, `ApplicationException`; reactions → none;
  adapters → `InfrastructureException`s with `{ cause }`. Each exception from its layer subpath.
