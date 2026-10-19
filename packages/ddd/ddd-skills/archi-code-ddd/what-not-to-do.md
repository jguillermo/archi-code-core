# What not to do

Part of the `archi-code-ddd` skill: read it only when that skill routes here.

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
- Subscribing listeners by a text name or calling them from a use case: the composition root
  subscribes them with `bus.subscribe(listener)`, which reads their `@ListensTo`.
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
  (`(json) => new OrderShipped(json.aggregateId)`): the event gets a new `eventId`, a listener
  cannot skip a redelivery, and `fromJSON` throws.
- Subscribing a listener of an event the `EventRegistry` does not know: `bus.subscribe` refuses it
  with `UnknownEventException`; register every event a listener receives.
- Writing a second bus for a new technology (a `RabbitMqEventBus` with its own `publish` and
  subscriptions): implement only `EventChannel` and keep `DomainEventBus`, so listeners and use
  cases behave the same on every channel.
- A use case run by a listener that throws `AggregateNotFoundException` or a business error: the
  channel redelivers it forever; return, or record an event that compensates.
- Retrying a `ConcurrencyException` with the same loaded aggregate, inside the transaction that
  failed, without a limit, or for a command that is not safe to repeat: each attempt is a new
  `transactions.run` that loads again, and only for commands safe to repeat. A use case never
  calls itself nor another use case to retry, and one whose `run` joins an outer transaction
  never retries: the caller or the channel's redelivery tries again.
- A read query that loads aggregates through `AggregateFinder`, or a repository method that
  returns DTOs: reads go straight to the database through an application interface.
- Importing `@archi-code/ddd/infrastructure` from domain code, or `application` from the domain.
- Importing an exception from `@archi-code/ddd/domain`: exceptions live in
  `@archi-code/ddd/exceptions`.
- Catching errors inside `handle` just to rethrow them as `ApplicationException`: let them
  propagate; `execute` keeps package exceptions and wraps the rest.
- Calling `bus.publish` before `repository.save`, or publishing without `pullDomainEvents()`.
- Publishing after `transactions.run(...)` returns: publish inside the transaction, and when the
  events must be delivered only after the commit, use a durable `EventChannel` (an outbox table)
  instead of changing the use case.
- Opening transactions (`BEGIN`/`COMMIT`) in a repository or in the domain, or saving two
  aggregates in one `run` without one of the exceptions IDDD ch. 10 accepts, written down as a
  decision: the use case owns one transaction for one aggregate.
- Relying on `InMemoryEventChannel` delivering before the commit in production code: it delivers
  as soon as `publish` is called; a durable channel delivers after the commit.
- A listener that breaks when a channel delivers the same event twice: delivery is at least once;
  skip an `eventId` already processed.
- Sending `event.toJSON()` of a domain event to another context: translate it to a published,
  versioned contract.
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
  the input) or that saves more than one aggregate outside the IDDD ch. 10 exceptions written down
  as an explicit decision: split it into one use case per business action.
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
- Moving a value object's rule to the request schema or the controller (`isEmail` in a DTO
  validator instead of the `Email` value object): the adapter may check format for the user
  (empty, length) [IDDD ch. 4], but the value object owns the rule and always checks it.
- Catching the `ValidationException` of a value object to keep an invalid value, or creating
  `ValidationException` by hand from `validate()` results (a domain service that collects
  `ValidationIssue`s of an existing object may throw `new ValidationException(issues)`).
- Sending local date-times without a zone (`'2024-01-31T10:00:00'`) to `DateType`: they are rejected.
- Passing unconverted values with their static type (`new NumberType('1.5')`): type error; conversion
  is for `any`/`unknown` input.
- Using `Required(StringType)` directly as a property type instead of a named subclass.
- Declaring `private readonly _id` + `get id()` in an aggregate: the id goes to `super(id)`.
- An optional value object (`class Code extends StringType {}`) as the id of an entity or
  aggregate: an id is always required (`IdType` or `Required(...)`); an empty id throws
  `RequiredValueException`.
- Removing by id without loading the aggregate, or a `remove` with no version condition: `remove`
  receives the loaded aggregate and refuses a stale one with `ConcurrencyException`.
- Putting listeners or event ports under `application/ports/` or a separate listener folder of the
  package API: the event contract (`EventListener`, `@ListensTo`, `EventBus`, `EventSubscriber`,
  `EventChannel`, `DomainEventBus`, `EventRegistry`) is imported from `@archi-code/ddd/application`.
- A child entity as a plain class, with setters, or called from outside its aggregate: it extends
  `Entity<Id>`, holds value objects, and its business methods are called only by its root.
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
