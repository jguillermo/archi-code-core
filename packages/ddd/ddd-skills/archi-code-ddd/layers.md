# Domain, application and infrastructure

Part of the `archi-code-ddd` skill: read it only when that skill routes here.

- Value objects are **optional by default** (`value: T | null`) `[Fuera de los libros: convención
  de @archi-code/ddd]`: the books build every value object with a value and model an optional one
  as a field that may be `null` (`reservation: ReservationId | null`) [IDDD ch. 5 and 6]; both
  forms work here. `Required(XType)` makes them
  required: the constructor demands `T` and, if it receives an empty value (`null` or `undefined`),
  throws `RequiredValueException` with the class name. A blank text is a value: `StringType` keeps
  it and the other types refuse it with `TypePrimitiveException`. `Required(...)` also declares
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
  `ValueObjectBuilder.build({ field: () => new X(input.field), … })`: it runs every factory and throws one
  `ValidationException` whose `errors` carry the `field` and `code` of each problem (required
  `DOM004`, conversion `DOM003`, a rule name, or the code of any `DomainException`, such as your
  `ORD003`); `ValueObjectBuilder.buildList(list, (item) => …)` names list items by position
  (`lines.1.quantity`). It returns the command typed field by field. Factories are synchronous (one
  that returns a Promise does not compile and is refused at run time with
  `InternalErrorException`), and an error that is not a `DomainException` is a bug that wins over the
  validation errors already collected.
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
- `toString()` is a method, `equals(other)` compares class and
  value (dates by instant, arrays and objects by content). Template literals work on VOs;
  `JSON.stringify` does not unwrap them: serialize `value` or the aggregate's `toPrimitives()`.
- Dates: `DateType` accepts `Date`, ISO dates (`'2024-01-31'`, UTC midnight) and ISO date-times
  **with** a zone (`Z` or offset); a date-time without a zone throws `TypePrimitiveException`.
  `UuidType`/`IdType` store lowercase. New ids: `OrderId.generate()` (an `OrderId`). Every id class
  passes its own name as the brand (`class OrderId extends IdType<'OrderId'> {}`) so the compiler never
  takes a `CustomerId` for an `OrderId`.
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
  (`lines.1.quantity`). Rules over several fields (end ≥ start, one currency) are `@Validations`
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
  domain code; a repository receives an aggregate and stores it, calling the aggregate's own
  `toPrimitives()` / `fromPrimitives()`.
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
  5. Repositories only call `order.toPrimitives()` and `Order.fromPrimitives(row)`; they never
     read the aggregate's fields. There is no mapper.
  6. One round-trip test per aggregate: `Order.fromPrimitives(order.toPrimitives()).toPrimitives()`
     equals `order.toPrimitives()`.
     The compiler rejects public raw state (`PrimitiveTypes` gives `never`); nothing checks private
     state at run time: a private field left out of `toPrimitives()` compiles and is lost when
     saving, so rule 2 and the round-trip test of rule 6 are the aggregate's responsibility. An enum value object stores its option (`PrimitiveType` is the enum type),
     so `new OrderStatus(primitives.status)` needs no cast.
- Aggregates extend `AggregateRoot<Id, Event>` and call `super(id)`. The aggregate carries **no
  version**: it never declares, stores nor maps one; optimistic concurrency is the repository's.
- **Every repository checks the version** (contract): it remembers the version of each aggregate
  object it loaded or saved in a private `WeakMap<Order, number>` (`versions`); load with
  `Order.fromPrimitives(row)` and `versions.set(order, row.version)`; on save take
  `versions.get(order) ?? 0`, save a new aggregate (`0`) as version 1 and treat an existing id as a
  conflict; save an existing one only where the stored version still equals the remembered one,
  storing one more next to (never inside) the primitives; when nothing was written throw
  `ConcurrencyException('Order', id, version)` (`ExceptionKind.Conflict`); after a write
  remember `version + 1`. Keep the driver error: `ConcurrencyException(…, { cause })`.
  Removing is a change too: `remove(aggregate)` receives the loaded aggregate and deletes only
  where the stored version still equals the remembered one, or throws `ConcurrencyException`
  (someone changed or removed it after it was loaded) [IDDD ch. 10].
  After a conflict, the use case may repeat its own work when the command is safe against the new
  state [IDDD ch. 10; IDDD appendix A]: a loop in `handle` where each attempt loads the aggregate
  again and saves it again (a few attempts, then rethrow); otherwise the conflict reaches the user
  (409). A use case run by a listener does not retry by itself: the channel's redelivery tries
  again.
- `record(event)` is `protected` and keeps the event as it is (facts never change [IDDD ch. 8]: the
  event declares its fields `readonly`); `pullDomainEvents()` returns the events (typed `Event[]`) in order
  and empties the list. Pull them after persisting, to publish. `DomainEventBus.publish` only sends a
  plain copy of each event (`{ ...event }`) to the channel.
- Events extend `EventBase`, declare `static readonly eventName` with their class name, a fact in
  the past tense (`'OrderPlaced'`) [IDDD ch. 8] (a published contract is named
  `<context>.<module>.<Event>`, `sales.order.OrderPlaced` [IDDD ch. 13]) and
  call `super(metadata)`; the base copies the name into the event's `eventName` field. An event
  is plain data with no methods. The id of the aggregate is a field the event declares like any
  other (`readonly orderId: string`). Rule (not checked at run time): each event declares as
  `readonly` constructor fields only the primitive data it needs (text, finite numbers, booleans,
  `null`, lists and plain objects of them), taken from value objects (`id.value`,
  `customer.value`, money as `{ amount, currency }`, dates as ISO text): never value objects,
  `Date`s, `toPrimitives()` nor personal data nobody needs. Listeners and registries refer to
  the event by its class (`@ListensTo(OrderPlaced, { consumer: 'reserve-stock-on-order-placed' })`, `register(OrderPlaced, …)`). The
  base sets `eventId` (UUID v4) and `occurredOn` (ISO text in UTC, from `metadata.clock` when
  given, otherwise the system time); pass `{ eventId, occurredOn }` only when rebuilding an event
  a channel delivered. Inside an aggregate method, always pass the clock it received:
  `new OrderPlaced(id.value, customer.value, { clock })`. The event is its own JSON:
  `{ ...event }` / `JSON.stringify(event)` give `eventName`, `eventId`, `occurredOn` and the
  fields, in that order.
- `PrimitiveTypes<T>` only sees **public** non-method members (it strips the leading `_`): expose
  VOs with public getters or public `readonly` properties. For an aggregate it includes `id`;
  child entities become their primitives; raw `string`/`number`/`boolean`/`Date`
  members become `never`.
- Where to throw each exception:
  - Domain (aggregates, VOs, business rules): `DomainException` or a custom subclass with its own
    code; `ValidationException` (thrown by value objects and `ValueObjectBuilder.build`).
  - Use cases: `AggregateNotFoundException` when a repository returns `null` (except a use case
    run by a listener to register a fact: it returns, so the listener is not retried forever),
    `NotAllowedException` when the requester may not run the action (authorization belongs to the
    use case), `ApplicationException` for other application errors.
  - Adapters (DB, network…): `InfrastructureException` / `InternalErrorException`, always with
    `{ cause: error }` when wrapping another error.
  - `TypePrimitiveException` and `RequiredValueException` are thrown by the VOs; throw them yourself
    only inside the `filter` of a custom type.
- The package speaks no protocol: each entry point (HTTP, gRPC, queue consumer, CLI) translates
  errors itself from `ExceptionClassifier.classify(error)` (`/exceptions`), which returns the
  `ExceptionKind`: `Malformed` for a conversion or required error thrown alone (a value object
  built with `new` outside `ValueObjectBuilder.build`; inside it they become a `ValidationException` with
  `DOM003`/`DOM004` in `errors`), `NotAllowed` for `NotAllowedException`, `NotFound` for
  `AggregateNotFoundException`, `Conflict` for `ConcurrencyException`, `Invalid` for
  `ValidationException` and any other `DomainException` (a broken business rule), `Rejected` for
  any other `ApplicationException`, `Internal` otherwise. The entry point maps the kind to its
  protocol (HTTP: 400, 403, 404, 409, 422, 400, 500), handles your own codes with `error.code`,
  returns the `errors` of a `ValidationException`, never sends the message of an `Internal`
  failure and logs it once; never classify exceptions with hand-written `instanceof` chains. For logs or messages use `error.code` and the exported `ExceptionCode` enum, or
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
  (`AggregateSaver<Order>`, `EventBus<OrderEvent>`, `Clock`) and are called
  with `execute(input)`.
  They implement two steps: `protected toCommand(input)` builds the value objects with
  `ValueObjectBuilder.build` and returns the command (a small interface of value objects, or one value
  object built with `new`); `protected handle(command)` works only with value objects. `UseCase` has no helpers:
  write every step in `handle` (load with `findById` and throw `AggregateNotFoundException` when it
  is `null` — or return, in a use case a listener runs —, change the aggregate, `save`, then
  `publish(aggregate.pullDomainEvents())`); it never opens a transaction. Let errors
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
  (`OrderId.generate()`). A `findAll()` exists only in the in-memory repository of the tests, if
  they need it (`[Fuera de los libros: convención de @archi-code/ddd]`; a real repository has no
  `findAll()`).
- **One repository per aggregate and technology** (user rule): it implements the roles it supports,
  knows the aggregate it rebuilds, and its constructor receives only its technology (a collection,
  a pool), never an aggregate class nor a mapper; aggregates only go in and out through its
  methods. The aggregate converts itself (`toPrimitives()` / `static fromPrimitives()`), never a
  domain service nor a mapper; the repository calls those methods directly
  (`Order.fromPrimitives(row)` on load, `order.toPrimitives()` on save, with the version it keeps
  in its own `WeakMap`, `ConcurrencyException('Order', …)` on a conflict) and maps the primitives
  to its storage.
  The package ships no repository: the in-memory one is written in the project's `test/support/`.
- **Another aggregate is referenced by its id** (`customerId: CustomerId`), never by the object.
- **A command can be refused, a fact cannot**: a method that registers something that already
  happened elsewhere (`registerStockReservation`, called by a listener) is idempotent and never
  throws a business error; if the fact does not fit, it records an event so another listener
  compensates.
- **Money is a composite with whole minor units** (`Money({ amount: Cents, currency })`, `Cents` a
  `Required(NumberType)` with `isInt`), never a decimal amount; it is exact up to
  `Number.MAX_SAFE_INTEGER` cents (the books use `bigint`, `[Fuera de los libros: convención de
  @archi-code/ddd]`); rounding is explicit.
- **The repository owns the transaction and everything about persistence** (`[Fuera de los
  libros: convención de @archi-code/ddd]`; IDDD ch. 14 gives it to the application service): there
  is no transaction port, and neither the domain nor the application opens, joins or closes a
  transaction. Each `save`/`remove` is atomic: one document per aggregate is one write; an
  aggregate over several tables is written in a database transaction the repository opens and
  commits inside `save`. The repository also checks the version, manages connections and sessions
  and wraps driver errors. When events must not be lost between `save` and `publish` [Destilado
  ch. 6; IDDD ch. 8], the repository stores them in the same atomic write (an outbox) and a relay
  delivers them through an `EventChannel`: use cases do not change.
- **Events carry no schema version.** Adding an optional field old readers can ignore is
  compatible; a change they cannot follow is a new event with its own `eventName`
  (`CustomerRenamedV2`), or the `EventRegistry` factory reads both shapes from the stored JSON
  (`typeof json.name === 'string' ? … : …`).
- **The application holds only the event contract, in `application/event`**: to publish, the
  port `EventBus` (`publish`, the only thing use cases see); to listen, `EventListener` and
  `@ListensTo` (`ListensTo.subscriptionOf(listener)` → `{ eventName, consumer }`). What moves the
  events is infrastructure, used only by the wiring (composition root), and is imported from
  `@archi-code/ddd/infrastructure`: `DomainEventBus(channel, registry)` (implements `EventBus`;
  `subscribe(listener)` → `Subscription { unsubscribe() }`, both async), `EventRegistry` and the
  port `EventChannel` (`send(serialized)`, `receive(eventName, consumer, handler)` →
  `ChannelSubscription { close() }`, with `ChannelHandler`). A messaging technology implements only
  `EventChannel` (`InMemoryEventChannel` in the package; RabbitMQ, a table or Kafka in your
  infrastructure); swapping it changes one line of the wiring.
- **Consumers are idempotent**: delivery is at least once, so a listener ignores an `eventId` it
  already processed. Listeners always receive the event rebuilt from its JSON (equal field
  by field), also in memory, so nothing changes when the channel does.
- **Other contexts never receive domain classes**: translate the serialized event to a published,
  versioned contract (`sales.order.OrderPlaced`, only what consumers need, `messageId` = `eventId`)
  in the adapter that talks to the broker [IDDD ch. 13]; expose a new contract version next to the
  old one while consumers move.
- Event Sourcing and CQRS are optional, only for a concrete need (full history, read models very
  different from the model); read queries straight to the database come first. A projection is
  an `EventListener` that writes a read table and skips an `eventId` it already applied; a read query is an application
  interface implemented in infrastructure that returns DTOs or ids.
- Logging goes through the `Logger` port of `/application` (`debug`, `info`, `warn`, `error`,
  each `(message, context?)`): the message is a stable snake_case name (`order_shipped`) and the
  data goes in the context. Use cases, listeners and adapters that need it receive it by
  constructor; the domain never logs (it records events or throws). The composition root picks the
  provider: `ConsoleLogger({ level })` (one JSON line per entry), an adapter over pino or winston,
  `InMemoryLogger` in tests (`entries`), `SilentLogger` by default. Pass it to
  `new DomainEventBus(channel, registry, logger)` (listener failures, subscriptions, what was
  published) and to the entry points, which log an `Internal` failure as `error`:
  each error is logged once, where it is handled, never logged and rethrown in every layer.
- Tests use the project's `InMemoryOrderRepository` (in `test/support/`) and
  `new DomainEventBus(new InMemoryEventChannel(), registry)` (`channel.sent` lists
  what was published; `{ delivery: 'parallel' }` runs the listeners of an event together).
- Listeners extend `EventListener<Event>`, are decorated with `@ListensTo(EventClass, { consumer })`
  (one event per listener, any number of listeners per event; `consumer` is a stable name, unique
  per listener, that the channel uses as its identity, such as its queue; never derived from the
  class name, which a minifier changes), receive the one use case they run by
  constructor and their `handle(event)` only maps the event to that use case's input.
- The bus is built and connected in the composition root:
  `const bus = new DomainEventBus(channel, registry)`, then `await bus.subscribe(listener)` for
  each listener; `subscribe` refuses a listener without `@ListensTo` and an event the registry
  cannot rebuild. The use cases only receive `EventBus`.
- A real repository implements the roles it supports (`AggregateFinder<A>`, `AggregateSaver<A>`,
  `AggregateRemover<A>`) and wraps driver errors in `InternalErrorException` with `cause`.
  The in-memory repository of the tests (`InMemoryOrderRepository`, see `patterns.md`) stores copies
  of the primitives with their version and follows the same concurrency contract.
- `DomainEventBus` rebuilds events with `EventRegistry`: register a factory per
  event class that passes the JSON as metadata
  (`register(OrderPlaced, (json) => new OrderPlaced(json.orderId as string, …, json))`); `fromJSON`
  throws `InternalErrorException` when the rebuilt event lost its `eventId` or `occurredOn`, which
  listeners need to skip a redelivery.
