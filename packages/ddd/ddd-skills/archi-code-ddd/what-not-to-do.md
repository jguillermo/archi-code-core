# What not to do

Part of the `archi-code-ddd` skill: read it only when that skill routes here.

## Layers and structure

- Putting a class in the wrong layer: a repository implementation, a mapper or a driver in the
  domain; an event bus implementation in the domain; a use case importing `/infrastructure`;
  business rules in an adapter or a controller.
- Importing another context (its value objects, events, data types or use cases): only
  `shared-kernel/` is shared; data crosses contexts only as events, and each context declares its
  own value objects and its own copy of every foreign event it hears.
- Importing `@archi-code/ddd/infrastructure` or `/application` from domain code, or
  `ExceptionClassifier` anywhere but the protocol helper (and the composition root).
- Importing through a folder or an `index.ts`, or mixing values and types of one module in one
  `import` statement: import each symbol from its declaring file and use `import type` for types.
- Importing an exception from another layer's subpath: each layer exports its own
  (`ValidationException` from `/domain`, `AggregateNotFoundException` from `/application`,
  `InternalErrorException` from `/infrastructure`); there is no `/exceptions` subpath and the
  common base class is not exported.
- Importing the repository contracts from `@archi-code/ddd/application`: they live in `/domain`.
- Application folders named after patterns (`use-cases/`, `listeners/`, `commands/`, `dtos/`):
  one folder per business action, holding its use case, its data types and its event copies.
- Data types of the input (`MoneyData`) in `domain/`, or shared between contexts.
- A controller, consumer or CLI importing a repository or an adapter: entry points only call use
  cases and query ports; the composition root wires everything.
- Building classes of the context anywhere but `composition.ts`, or importing `composition.ts`
  from a layer.
- Do not invent API: there is no root `@archi-code/ddd` import, no `toPrimitives()` in the base
  classes, no generic `ValueObject` (a value object of several fields is `Composite({...})`), no
  `setNow()`, `addItem()`, `setItem()` or `removeItem()`, no `findOrFail` nor `saveAndPublish` in
  `UseCase`. When in doubt, check the installed README.
- Writing the suite's base classes in the project (`domain/shared/AggregateRoot.ts`,
  `DomainEvent.ts`, `ValueObject.ts`, an `EventPublisher` port): they come from the package.

## Value objects

- Using `Required(StringType)` directly as a property type instead of a named subclass, or two
  value objects in one file.
- `ensure…()`/`validate…()` methods of your own, or calling `assertValid()` (it does not exist):
  the constructor already throws `ValidationException`.
- Building the value objects of an input one after another with `new` in `toCommand` (or at the
  start of a reaction): the first invalid field hides the rest. Use `ValueObjectBuilder.build`.
- Building value objects inside `handle` from raw input, or passing raw strings to aggregates.
- Moving a value object's rule to the request schema or the controller (`isEmail` in a DTO
  validator instead of the `Email` value object): the controller checks only the shape.
- Catching the `ValidationException` of a value object to keep an invalid value, or creating
  `ValidationException` by hand from `validate()` results.
- An enum split over several files, or named against the convention: one `<Enum>Type.ts` with
  `enum <Enum>`, `<Enum>Option` and `<Enum>Type`.
- Using another context's id class for a reference: declare `<Other>Reference extends
  Required(UuidType)` in the context that holds it.
- An id class without its brand (`class OrderId extends IdType {}`): a `CustomerId` is then
  accepted where an `OrderId` is expected. Write `class OrderId extends IdType<'OrderId'> {}`.
- An optional value object (`class Code extends StringType {}`) as the id of an entity or
  aggregate: an id is always required.
- `IdType` with `00000000-0000-0000-0000-000000000000` or `ffffffff-ffff-ffff-ffff-ffffffffffff`:
  throws `TypePrimitiveException`.
- Mutating a VO or its value (`vo.value.setFullYear(...)`, pushing to `vo.value`): values are
  frozen and date setters throw. Build a new VO; for arrays keep what `withItem`/`withoutItem`
  return.
- Comparing VOs or entities with `===`: use `equals()`.
- `vo.toString` without parentheses: it is a method.
- Sending local date-times without a zone (`'2024-01-31T10:00:00'`) to `DateType`.
- Passing unconverted values with their static type (`new NumberType('1.5')`): type error;
  conversion is for `any`/`unknown` input.
- `JsonType` with `{}` or with an array: throws `TypePrimitiveException` (it must be a non-empty
  object).
- Modeling an amount with its currency, a date range or an address as loose fields of the
  aggregate, as a `JsonType`, or as a child entity with an id nobody looks up: use `Composite`.
  And never turn a free-form JSON value into a composite, nor the other way round.
- `ArrayType<OrderLine>` with a composite item: a list of composites is a `Composite` list field
  (`Composite({ items: [ShipmentItem] })`) or an array of child entities in the aggregate.
- `Required(Composite(...))`, or `Composite({ amount: Required(NumberType) })` without a named
  class: every field class is a named subclass; an optional composite is a `Money | null` field.
- Mutating a composite or adding state to it: it is frozen; return a new instance.
- A computed getter (`get total()`) on an aggregate, a child entity or a composite:
  `PrimitiveTypes` takes it for a field and `toPrimitives()` stops compiling; write a method.
- Importing `@Validations` from `@archi-code/ddd/domain`: it comes from `@archi-code/validation`.

## Aggregates and entities

- A private constructor, or a constructor that checks, defaults or records events: it is public
  and only assigns; `create` and `fromPrimitives` call it.
- Generating or computing the id inside `create` (`OrderId.generate()`,
  `PaymentId.forOrder(...)` in the aggregate): the use case passes the id.
- A business factory with another name than `create`, or one that records anything but
  `<Aggregate>CreatedDomainEvent` and skips the creation invariants.
- Importing `Clock` from `@archi-code/ddd/application` in the domain: declare
  `interface Clock { now(): Date }` above the aggregate.
- Raw state in an aggregate (`private _shipped: boolean`, `private _at: Date`, a `string` field):
  wrap it in a value object.
- A private field without its public getter, or left out of `toPrimitives()`: it compiles and is
  lost when saving; the round-trip test of each aggregate must cover every field.
- Declaring `private readonly _id` + `get id()`: the id goes to `super(id)`.
- `toPrimitives()` returning value objects or composites instead of `vo.value` /
  `composite.toPrimitives()`; `fromPrimitives` that records events or checks invariants.
- A method a user asks for that silently ignores a state where it does not apply: it throws a
  business error.
- A reaction method (called by a reaction use case) that throws a business error when the fact
  does not apply: it returns without changes; events arrive twice or late.
- Leaving the aggregate half changed when an invariant breaks after a change: restore the
  previous state before rethrowing.
- A domain service or a repository received by the constructor of an aggregate: pass the service
  or the loaded data as a method argument.
- Authorization checks in the aggregate (only the actor decides): they are the use case's
  (`NotAllowedException`); rules over the aggregate's state stay in the aggregate.
- Declaring a `version` field in an aggregate, or putting it in `toPrimitives()`.
- Calling `record()` from outside the aggregate (it is `protected`) or forgetting `super(...)`.
- A child entity as a plain class, with setters, a clock, events, `create` or its own
  `toPrimitives`, or called from outside its aggregate.
- A specification that loads data through a repository, a generic one without a business name
  (`FieldEquals`), or one used instead of the aggregate to protect an invariant.
- Using `new Date()` or `Date.now()` in domain or application code: use the `Clock`.
- Logging from the domain: it records events or throws.

## Events

- An event class named without the `DomainEvent` suffix, or an `eventName` that is the class name
  or not `'<aggregate>.<past_action>'` in snake_case.
- Events named `OrderUpdated` carrying the whole state, named in present tense, carrying value
  objects, `Date`s, `undefined`, class instances, `toPrimitives()` or personal data that
  consumers do not need.
- Interfaces, type aliases or imported data types in an event file, or positional constructor
  parameters: the constructor takes one object typed inline as `{ …fields } & EventMetadata`.
- An `aggregateId` field or a schema version: the id is a named field (`orderId`).
- Declaring `eventName` as a method or an instance field, or adding methods to an event.
- Creating an event outside its aggregate, or without the clock the method received.
- Declaring a union type of an aggregate's events (`type OrderEvent = …`) or passing an event type
  to `AggregateRoot`, `EventBus`, `DomainEventBus` or `EventRegistry`: they take no event type and
  work with `EventBase`.
- Generating `eventId`/`occurredOn` yourself for a new event: the base does it.
- A registry factory that does not pass `eventId: json.eventId` and `occurredOn: json.occurredOn`:
  the event gets a new `eventId`, a reaction cannot skip a redelivery, and `fromJSON` throws.
- Registering an event twice, or subscribing a reaction to an event the registry does not know
  (`UnknownEventException`).
- Importing the producer's event class in a consumer context, or one copy shared by two
  reactions: each reaction folder keeps its own copy with the same name and `eventName`.
- Changing the data of a published event incompatibly under the same `eventName` when no factory
  can read both shapes: publish a new event instead.
- Writing a second bus for a new technology (a `RabbitMqEventBus`): implement only `EventChannel`
  and keep `DomainEventBus`.

## Use cases and reactions

- A listener that calls a `UseCase`, or a `UseCase` class next to a listener for the same
  reaction: the reaction use case is the listener, one class whose `handle` builds the value
  objects, decides and saves.
- A use case that imports, extends or calls another use case or a reaction, or a base use case
  with shared helpers: move the rule to the aggregate or a domain service, or chain them with an
  event.
- A use case that does several things (`UpdateOrder` that ships, cancels or renames depending on
  the input) or saves more than one aggregate outside the IDDD ch. 10 exceptions written down as
  an explicit decision.
- Technical or CRUD names (`OrderService`, `UpdateUser`, `SaveOrder`, `ProcessPayment` when the
  business says `CapturePayment`).
- `Input`/`Command` interfaces in another file than their use case, or a command class.
- Constructor dependencies the use case does not use, or a repository typed with roles it does
  not use: ask for exactly the roles it needs.
- A reaction without `@ListensTo`, decorated with two events, or with a consumer that is not
  `'<context>.<file name without .ts>'`: taken from the class (`this.name`), shared by two
  reactions or renamed casually (it is its queue in a broker).
- A reaction that checks authorization, throws `AggregateNotFoundException` or a business error,
  catches errors or retries: it returns when the aggregate is missing or the fact does not apply,
  and the channel's redelivery is its retry.
- A reaction that creates without checking that the derived id is free: a redelivery would
  create a second aggregate or a conflict.
- Subscribing reactions by a text name or calling them from a use case: the composition root
  subscribes them with `bus.subscribe(listener)`.
- Calling `bus.publish` before `repository.save`, or publishing without `pullDomainEvents()`.
- Catching errors inside `handle` just to rethrow them as `ApplicationException`: let them
  propagate; `execute` keeps package exceptions and wraps the rest.
- Retrying a `ConcurrencyException` with the same loaded aggregate, without a limit, or for a
  command that is not safe to repeat.
- Opening, joining or closing transactions in a use case, a reaction or the domain, or passing a
  transaction runner, unit of work, session or connection to them.
- Changing the use case so events are not lost between `save` and `publish`: the repository
  stores them in the same atomic write (an outbox) and a relay delivers them.
- Returning an aggregate from a use case: return an id, a DTO or nothing.
- A query use case: queries go from the entry point to the read model's query port.
- A projection that does not skip an `eventId` it already applied, or a read model that loads
  aggregates through `AggregateFinder`.

## Repositories and adapters

- A repository interface of your own (`OrderRepository`) or an all-in-one `Repository`: the
  domain contracts are the package roles.
- Repository methods with business names or rules (`pendingOlderThan`), `nextId()`, events, or
  methods that return DTOs.
- Throwing `AggregateNotFoundException` from the domain or a repository: the user use case throws
  it when `findById` returns `null`.
- A repository that reads aggregate fields or builds rows by hand, or whose constructor receives
  an aggregate class, a mapper or `{ toPrimitives, fromPrimitives }`.
- A generic repository shared by several aggregates: write one per aggregate.
- A repository (also the in-memory one) that saves with no version condition or "last save
  wins", forgets to remember `version + 1` after a write or the stored version on load, removes
  by id without the loaded aggregate, or exposes the version to domain or application code.
- An in-memory repository that stores or returns the same objects it received: store and return
  `structuredClone` copies.
- A port adapter that throws a business error for bad external data: wrap it in
  `InternalErrorException` with `{ cause }`.
- Wrapping or translating an error without `{ cause: error }`.

## Entry points and logging

- A controller that catches errors, maps statuses by hand, checks values instead of shape, or
  holds business rules: the protocol helper translates every error with `ExceptionClassifier`.
- Classifying exceptions with hand-written `instanceof` chains.
- Sending the message of an `Internal` failure to the client.
- Importing a logging library (pino, winston, `console`) in a use case: inject the `Logger` port.
- Logging an error and rethrowing it in every layer: the edge that handles it logs it once
  (`DomainEventBus` with a logger already does; the protocol helper logs an `Internal` failure).
- Interpolating data into the message (`` `order ${id} failed` ``) or logging passwords, tokens or
  personal data the entry does not need.
