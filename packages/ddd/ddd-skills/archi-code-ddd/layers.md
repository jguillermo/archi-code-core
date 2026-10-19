# Domain, application and infrastructure

Part of the `archi-code-ddd` skill: read it only when that skill routes here.

- Value objects are **optional by default** (`value: T | null`) `[Fuera de los libros: convención
  de @archi-code/ddd]`: the books build every value object with a value and model an optional one
  as a field that may be `null` (`reservation: ReservationId | null`) [IDDD ch. 5 and 6]; both
  forms work here. `Required(XType)` makes them
  required: the constructor demands `T` and, if it receives an empty value (`null`, `undefined` or a
  blank string), throws `RequiredValueException` with the class name. `Required(...)` also declares
  the `isRequired` validation. An id is always required (see the aggregate root below).
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
- **Which layer validates what:** the input adapter checks the shape and format of the request (it
  parses, a field is a string, an empty field or a length for a good user experience [IDDD ch. 4]),
  never a business rule, and that never replaces the value object; value objects check each value (built in
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
  (no `_id` + getter). `equals` compares class and id only. The id is a required value object
  (`EntityId`: `IdType` or a `Required(...)` type); an optional type does not compile as `Id`, and an
  id that holds no value throws `RequiredValueException`, so two new entities are never equal by an
  empty id [IDDD ch. 5]. A child entity (a part with an identity
  of its own inside the aggregate) extends `Entity<Id>` (`super(id)`, `equals` by class and id)
  and holds its id and value objects; it may have business methods named after the language
  (`seat.relabel(label)`) with the rules of that part, never setters, and only its root calls them
  (Tell, Don't Ask: `room.relabelSeat(id, label)` finds the seat and tells it) [IDDD ch. 5 and
  10]; rules over several parts stay in the root. Its identity is local: unique only inside its
  aggregate, never used from outside [IDDD ch. 10] (`class SeatNumber extends Required(NumberType)`). `AggregateRoot` extends `Entity` too.
- **Derived values are methods, never getters** (`total()`, `isEditable()`), on aggregates, child
  entities and composites: `PrimitiveTypes` sees every getter as a field, so a computed getter
  breaks `toPrimitives()` at compile time.
- **A named business rule that selects, validates or combines is a `Specification<T>`**:
  `class EligibleForExpressShipping extends Specification<Order> { isSatisfiedBy(order) {…} }`,
  combined with `and`, `or` and `not`; `and`/`or` accept any `SatisfiedBy<T>` (an object with
  `isSatisfiedBy`), the books' `Specification` interface [IDDD ch. 5]. It receives data already loaded (never a repository) and is
  never used to protect an invariant of an aggregate: invariants stay inside the aggregate.
- **The domain knows nothing about persistence**: no mapper, repository nor storage concern in
  domain code; a repository receives an aggregate and stores it. `AggregateMapper` is imported from
  `@archi-code/ddd/infrastructure`.
- **Aggregates and their primitives** (every aggregate follows these six rules so infrastructure can
  store it; rules 1, 2, 4 and 5, and the name `fromPrimitives` of rule 3, are package conventions, `[Fuera de los libros: convención de
  @archi-code/ddd]`: the books allow a primitive without behavior [IDDD ch. 6], getters only where
  needed [Destilado ch. 5] and a mapper in infrastructure [IDDD ch. 6]):
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
  Removing is a change too: `remove(aggregate)` receives the loaded aggregate and deletes only
  where the stored version still equals `aggregate.version`, or throws `ConcurrencyException`
  (someone changed or removed it after it was loaded) [IDDD ch. 10].
  After a conflict, the use case may repeat its own work when the command is safe against the new
  state [IDDD ch. 10; IDDD appendix A]: a loop in `handle` around the whole `transactions.run`, so
  each attempt is a new transaction that loads the aggregate again (a few attempts, then rethrow);
  otherwise the conflict reaches the user (409). A nested `run` joins the outer transaction, so a
  use case run by a listener with an inbox does not retry: the relay delivers the event again.
- `record(event)` is `protected` and deep-freezes the event (facts never change [IDDD ch. 8]); `pullDomainEvents()` returns the events (typed `Event[]`) in order
  and empties the list. Pull them after persisting, to publish. `InMemoryOutbox`,
  `InMemoryEventBus` and `EventDispatcher` freeze every event they receive too, also one that
  never went through an aggregate.
- Events extend `EventBase`, declare `static readonly eventName` with their class name, a fact in
  the past tense (`'OrderPlaced'`) [IDDD ch. 8] (a published contract is named
  `<context>.<module>.<Event>`, `sales.order.OrderPlaced` [IDDD ch. 13]) and
  call `super(aggregateId, metadata)`; `event.eventName()` returns it. The payload is primitives
  taken from value objects (`customer.value`, money as `{ amount, currency }`), only what
  consumers need: never value objects, `toPrimitives()` nor personal data nobody needs. Listeners and registries refer to
  the event by its class (`@ListensTo(OrderPlaced)`, `register(OrderPlaced, …)`). The
  base sets `eventId` (UUID v4) and `occurredOn` (immutable `Date`, from `metadata.clock` when
  given, otherwise the system time); pass `{ eventId, occurredOn }` only when rebuilding an event
  read from an outbox or a broker. Inside an aggregate method, always pass the clock it received:
  `new OrderPlaced(id.value, customer.value, { clock })`. Serialize with `JSON.stringify` /
  `toJSON()` (`eventName`, `eventVersion`, `eventId`, `aggregateId`, ISO `occurredOn` and the
  payload).
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
- Map errors to HTTP with `HttpErrorMapper` (overrides by code for your own codes): 400 for a
  conversion or required error thrown alone (a value object built with `new` outside
  `ValueObjects.build`; inside it they become a `ValidationException`, 422, with `DOM003`/`DOM004`
  in `errors`), 403 `NotAllowedException`, 404 `AggregateNotFoundException`, 409
  `ConcurrencyException`, 422 `ValidationException` and any other `DomainException` (a broken
  business rule), 400 any other `ApplicationException`, 500 otherwise; never hand-write status tables that leak infrastructure
  messages. For logs or messages use `error.code` and the exported `ExceptionCode` enum, or
  `instanceof`: the built-in exceptions are recognized across the CJS and ESM builds.
- A use case does **one thing**: one business action, one class, one `handle`. It changes one
  aggregate and saves it once [Destilado ch. 5; IDDD ch. 10] (the exceptions IDDD ch. 10 accepts, such
  as creating several aggregates in one batch that changes nothing semantically, are written down
  as an explicit decision); a flow that needs several actions is several use cases (chained by
  domain events or called one after another by whoever orchestrates them), never one use case with
  flags or a `type` field in its input that switch between behaviors.
- A use case is **named after the business action**, a verb and a noun from the ubiquitous language
  that a domain expert would say: `PlaceOrder`, `ShipOrder`, `CancelSubscription`,
  `RegisterUser`, `ApproveRefund`. Never technical or CRUD names (`CreateOrder` when the business
  says "place", `UpdateOrder`, `SaveUser`, `OrderService`, `OrderManager`, `ProcessOrder`,
  `HandleData`, `OrderUseCase`).
- The repository contracts belong to the domain
  (`import type { AggregateSaver } from '@archi-code/ddd/domain'`). Interface segregation: a use case depends only on the repository roles it uses —
  `AggregateFinder<A>` (`findById`), `AggregateSaver<A>` (`save`), `AggregateRemover<A>`
  (`remove`), combined with `&` when it needs several. There is no all-in-one `Repository` port:
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
  operation; they receive aggregates and loaded data, and may read other aggregates through an
  `AggregateFinder` to validate or calculate over several of them [IDDD ch. 5 and 7]; they never
  save, open transactions nor publish. A
  technical one (`ExchangeRates`) is an interface in `domain/` implemented in infrastructure.
- **Repositories only get and persist** (`findById`, `save`, `remove`): no business logic, no
  business queries (`pendingOlderThan`), no `nextId()`; new ids come from the value object
  (`OrderId.generate()`). `InMemoryRepository.findAll()` is a convenience of the test adapter only
  (`[Fuera de los libros: convención de @archi-code/ddd]`; a real repository has no `findAll()`).
- **Another aggregate is referenced by its id** (`customerId: CustomerId`), never by the object.
- **A command can be refused, a fact cannot**: a method that registers something that already
  happened elsewhere (`registerStockReservation`, called by a listener) is idempotent and never
  throws a business error; if the fact does not fit, it records an event so another listener
  compensates.
- **Money is a composite with whole minor units** (`Money({ amount: Cents, currency })`, `Cents` a
  `Required(NumberType)` with `isInt`), never a decimal amount; it is exact up to
  `Number.MAX_SAFE_INTEGER` cents (the books use `bigint`, `[Fuera de los libros: convención de
  @archi-code/ddd]`); rounding is explicit.
- **Transactions belong to the application, events to the outbox** [IDDD ch. 12; Destilado ch. 6]:
  the use case opens the transaction with the `TransactionRunner` port (`run(work)`; a nested run
  joins the outer one; `inTransaction()` tells whether one is open) and publishes inside it, so the aggregate and its events are committed
  together. `EventBus` is then an outbox: it stores the events; an `OutboxRelay(store, deliver)`
  run by a worker after the commit (`forward()`) delivers them in order to the dispatcher or a
  broker, at least once, so listeners must tolerate an `eventId` they already processed. Neither
  the domain nor a repository opens a transaction. The relay stops at the first failure, counts
  it (`OutboxStore.markFailed`) and retries it on the next run, up to a limit [IDDD ch. 10]: after
  `maxAttempts` failures (5 by default) it parks the entry (`OutboxStore.park`), calls
  `onParked(event, error, sequence)` so someone is told or a compensation starts, and goes on with
  the next ones: `new OutboxRelay(outbox, deliver, { maxAttempts, onParked })`. Each event
  arrives with its outbox `sequence` (`deliver(json, sequence)`) for consumers that keep order.
- **Events have a schema version** (`static readonly eventVersion = 2` when their data changes
  incompatibly; 1 by default, written in `toJSON()`); a `DomainEventRegistry` factory reads older
  stored versions from `json.eventVersion`.
- **Consumers are idempotent**: wire `new EventDispatcher(listeners, { inbox, transactions })`;
  each listener runs in its own transaction that marks `eventId` for that listener in the inbox
  (`InMemoryInbox` or a table implementing `InboxStore`) and skips an event already processed. The
  inbox must be written in that same transaction: in tests pass it to the runner
  (`new InMemoryTransactionRunner([orders, outbox, inbox])`), in production write the mark through
  the runner's connection. Otherwise a listener that fails leaves the mark, the redelivery is
  skipped and the event is lost [IDDD ch. 8]. A dispatcher with an inbox refuses to run inside an
  open transaction (`InfrastructureException`): listeners run after the commit, never inside the
  transaction of the use case that recorded the event [IDDD ch. 8].
- **Other contexts never receive domain classes**:
  `new PublishedLanguage().expose(OrderPlaced, { name: 'sales.order.OrderPlaced', version: 1, data: (json) => ({ … }) })`
  and, in the relay,
  `published.translate(json, sequence)` (one message per exposed version, `[]` for internal
  events; each message carries `messageId` = `eventId` and the outbox `sequence`, IDDD's
  `notificationId` [IDDD ch. 13], so consumers deduplicate and keep the causal order) before
  sending to the broker. Publish only what consumers need; a new contract version for incompatible
  changes, exposed next to the old one while consumers move.
- Event Sourcing and CQRS are optional, only for a concrete need (full history, read models very
  different from the model); read queries straight to the database come first. A projection is
  an `EventListener` with the inbox that writes a read table; a read query is an application
  interface implemented in infrastructure that returns DTOs or ids.
- Tests use `InMemoryTransactionRunner([repository, outbox, inbox])` (restores them when the work throws;
  `committed`/`rolledBack`; a run inside another joins it, and runs that overlap in time wait
  their turn),
  `InMemoryOutbox` (events stored as JSON, `pending(limit)`, `parked()`) and
  `OutboxRelay`. `InMemoryEventBus` dispatches immediately: only for a quick test without
  transactions (the books deliver after the commit [IDDD ch. 8]; the package keeps this bus as a
  test convenience, `[Fuera de los libros: convención de @archi-code/ddd]`).
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
