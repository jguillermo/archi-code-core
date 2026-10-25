# Domain, application and infrastructure

Part of the `archi-code-ddd` skill: read it only when that skill routes here. The code to start
from is in `patterns.md`; the folders and names are in `where-each-class-goes.md`.

## Value objects

- Value objects are **optional by default** (`value: T | null`) `[Fuera de los libros: convención
  de @archi-code/ddd]`: the books build every value object with a value and model an optional one
  as a field that may be `null` (`reservation: ReservationId | null`) [IDDD ch. 5 and 6]; both
  forms work here. `Required(XType)` makes them required: the constructor demands `T` and, if it
  receives an empty value (`null` or `undefined`), throws `RequiredValueException` with the class
  name. An optional value object with no value is built with `null` (`new PaymentReference(null)`).
  A blank text is a value: `StringType` keeps it and the other types refuse it with
  `TypePrimitiveException`. `Required(...)` also declares the `isRequired` validation. An id is
  always required.
- A domain VO is always a named subclass (`class Email extends ...`), one per file: the name
  appears in the error messages, and `equals` compares the class too (`BillingCountry('ES')` is
  not a `ShippingCountry('ES')`). Each context declares its own, even when another context has a
  similar one.
- **A value object that exists is valid.** The constructor converts (or throws
  `TypePrimitiveException`), checks `Required` (or throws `RequiredValueException`) and runs every
  `@Validations` rule, throwing one `ValidationException` with all the broken rules
  (`errors: [{ field: null, code: 'isEmail', message: '<Class>: <message>' }]`; `code` is the
  validator or custom rule name, or the code of the exception). There is no `assertValid()` nor
  `ensure…()`; `validate()` only re-runs the rules and is always ok on a built VO.
- Rules are `@Validations([...])` from `@archi-code/validation` above the class:
  `{ validator: 'matches', properties: { pattern }, message? }` (a validator's parameters go in a
  single `properties` object) or `{ custom: '<camelCaseName>', fn, message }` for list and
  composite rules. Write an English `message` when the validator's own is not clear. Subclasses
  inherit validations, and one with the same name replaces the parent's.
- **Report every field, never only the first.** In `toCommand` (or at the start of a reaction
  use case), build the value objects with `ValueObjectBuilder.build({ field: () => new X(input.field), … })`
  from `@archi-code/ddd/application` (the domain never uses it): it runs every factory and throws
  one `ValidationException` whose `errors` carry the `field` and `code` of each problem (required
  `DOM004`, conversion `DOM003`, a rule name, or the code of any `DomainException`);
  `ValueObjectBuilder.buildList(list, (item) => …)` names list items by position
  (`lines.1.quantity`). It returns the value objects typed field by field. Factories are
  synchronous (one that returns a Promise does not compile and is refused at run time with
  `UnexpectedErrorException`), and an error that is not a `DomainException` is a bug that wins
  over the validation errors already collected.
- Kinds of value object and their base:
  - Text, number, boolean, date: `Required(StringType | NumberType | BooleanType | DateType)` or
    the bare base when optional.
  - Id of an aggregate: `class OrderId extends IdType<'OrderId'> {}`, the class name as brand so
    the compiler never takes a `CustomerId` for an `OrderId`. A new random id is
    `OrderId.generate()`, called by the use case. An id derived from other data is a static
    method of the id class over a UUID v5:
    `static forOrder(order: OrderReference): PaymentId { return new PaymentId(UuidType.fromValue(`payment-of-order:${order.value}`)); }`
    (one payment per order, found again by the same id). `UuidType`/`IdType` store lowercase.
  - Reference to an aggregate of another context: `<Other>Reference extends Required(UuidType)`
    (`OrderReference` in payments), never the other context's id class.
  - Enum: one file `<Enum>Type.ts` with `export enum <Enum>` (snake_case string values),
    `<Enum>Option extends EnumType<<Enum>>` (`protected getEnum()`) and
    `<Enum>Type extends Required(<Enum>Option)`; an optional enum is only
    `<Enum>Type extends EnumType<<Enum>>`. Its primitive is the enum option, so
    `new OrderStatusType(primitives.status)` needs no cast; from text input cast it
    (`new PaymentMethodType(input.paymentMethod as PaymentMethod)`).
  - List of simple values: `<Item>List extends ArrayType<<Item>>` (`createItem`, list rules as
    `custom` validations) plus `<Item>s extends Required(<Item>List)`. An `ArrayType` receives
    items that are already valid: it does not collect item errors and lets the error of the first
    invalid item through as the item throws it.
  - Custom conversion: `extends AbstractType<T>` implementing only
    `protected filter(value: unknown): T` (it receives input already known to be non-empty and
    returns the value or throws `TypePrimitiveException('<what>', value)`), paired with a
    `Required(...)` class in a second file (`CentsAmount` + `Cents`). To restrict an existing type
    extend it and use `@Validations`; to normalize (trim, lower case) override `filter` and call
    `super.filter(value)` first.
  - Several fields: a composite (below).
  - Free-form JSON stored as it is: three files, `interface <Name>Data extends JsonTypeValue`,
    `<Name>Json extends JsonType<<Name>Data>` and `<Name> extends Required(<Name>Json)`. A JSON
    value is never a composite and a composite is never a JSON value.
- Values are **immutable**: `_value` is `readonly`; behavior returns new instances
  (`money.add(other)`, `money.lessPercent(10)`); `ArrayType.withItem/withoutItem` return a new
  instance; `UpdatedAt` is replaced with `UpdatedAt.now(clock)`.
- `toString()` is a method, `equals(other)` compares class and value (dates by instant, arrays
  and objects by content). Template literals work on VOs; `JSON.stringify` does not unwrap them:
  serialize `value` or the aggregate's `toPrimitives()`.
- Dates: `DateType` accepts `Date`, ISO dates (`'2024-01-31'`, UTC midnight) and ISO date-times
  **with** a zone (`Z` or offset); a date-time without a zone throws `TypePrimitiveException`.
- **Concepts of several attributes are composite value objects**, not entities nor loose fields:
  `class Money extends Composite({ amount: Cents, currency: MoneyCurrency }) {}`. The schema names
  each field's class: a value object class, another composite, or a list `[ShipmentItem]`. Fields
  are exposed read-only with their value object type; the instance is frozen; `equals` compares
  class and every field; `toPrimitives()` gives plain data (dates stay `Date`);
  `X.fromPrimitives(data)` rebuilds it reporting every invalid field with its path
  (`items.1.quantity`), and `new X({ field: vo })` builds it from value objects. Rules over
  several fields are `custom` validations whose `fn` receives the built composite. A collection
  with rules of its own is a composite with a list field
  (`Composite({ items: [ShipmentItem] })` with an `atLeastOneItem` rule). A field of a composite
  may hold an optional value object whose value is `null`; only a missing instance is refused.
- **Money is a composite with whole minor units** (`Money({ amount: Cents, currency })`, `Cents`
  a whole number of cents ≥ 0), never a decimal amount; it is exact up to
  `Number.MAX_SAFE_INTEGER` cents (the books use `bigint`, `[Fuera de los libros: convención de
  @archi-code/ddd]`); rounding is explicit (discounts round down), and mixing currencies throws a
  business error (`CurrencyMismatch`). It lives in `shared-kernel/money/`.
- **Derived values are methods, never getters** (`total()`, `units()`), on aggregates, child
  entities and composites: `PrimitiveTypes` sees every getter as a field, so a computed getter
  breaks `toPrimitives()` at compile time.

## Aggregates

`[Fuera de los libros: convención de @archi-code/ddd]`: the public constructor, `create`, the
local `Clock`, the getters named like the fields and `fromPrimitives`/`toPrimitives` are package
conventions; the books allow a private constructor with a factory [IDDD ch. 11], getters only
where needed [Destilado ch. 5] and a mapper in infrastructure [IDDD ch. 6].

- Aggregates extend `AggregateRoot<<Aggregate>Id, <Aggregate>Event>` and call `super(id)`; the id
  is exposed as `readonly id` (no `_id` + getter), `equals` compares class and id, and an id that
  holds no value throws `RequiredValueException` [IDDD ch. 5].
- Member order: the local `interface Clock { now(): Date }` above the class (the domain never
  imports `Clock` from `/application`; the port matches it structurally) → `private static
  readonly` business constants → fields → public constructor → `static create` →
  `static fromPrimitives` → getters → public queries → business methods → `toPrimitives` →
  private helpers.
- Fields: a value that never changes is `readonly <name>`; one that changes is
  `private _<name>` with `get <name>()`. `readonly createdAt: CreatedAt` and
  `private _updatedAt: UpdatedAt` (with its getter) are the last two. Every field is a value
  object, a composite or an array of child entities; never a primitive, a `Date` nor a plain
  object (a flag is `class GiftWrap extends Required(BooleanType) {}`).
- **Constructor: public, and it only assigns.** It receives every field already built (id first,
  `createdAt` and `updatedAt` last), calls `super(id)` and assigns: no checks, no events, no
  defaults. `create` and `fromPrimitives` both call it.
- **`static create(id, ...valueObjects, clock: Clock)`** starts the aggregate: it receives the id
  and the value objects already built (the clock last), builds the child entities from
  `New<Child>` shapes and assigns their local ids (`new LineNumber(index + 1)`), sets the initial
  state (`new OrderStatusType(OrderStatus.PENDING_PAYMENT)`, `new PaymentReference(null)`,
  `CreatedAt.now(clock)`, `UpdatedAt.now(clock)`), checks the creation invariants (on the input
  before building, or with private `assert…()` after) throwing business errors, records
  `<Aggregate>CreatedDomainEvent` and returns. It never generates nor computes the id: the use
  case passes it (`OrderId.generate()`, `PaymentId.forOrder(order)`).
- **`static fromPrimitives(primitives: PrimitiveTypes<<Aggregate>>)`** rebuilds every field with
  its constructor (`new X(primitives.x)`) or `X.fromPrimitives(primitives.x)` for composites,
  rebuilds child entities with their constructor and calls the aggregate constructor. No events,
  no invariant checks.
- **`toPrimitives(): PrimitiveTypes<<Aggregate>>`** returns every field as plain data: VO →
  `.value`; composite → `.toPrimitives()`; child entity → an object literal
  `{ id: line.id.value, …fields }` written by the aggregate. `fromPrimitives(toPrimitives())`
  gives an equal aggregate, and each aggregate has a round-trip test. `PrimitiveTypes<T>` only
  sees **public** non-method members (it strips the leading `_`): nothing checks private state at
  run time, so a private field without its getter or left out of `toPrimitives()` compiles and is
  lost when saving.
- **Each state change is a business method** named after the business action (`cancel`,
  `markShipped`, `changeLineQuantity`): parameters are value objects, `clock: Clock` last; it
  returns `void`, changes the fields, updates `_updatedAt` (through private `moveTo(status, clock)`
  / `touch(clock)`) and records zero or more events.
- **A command can be refused, a fact cannot.** A method a user asks for (called by a user use
  case) throws a business error when it does not apply in the current state
  (`OrderNotCancellable`). A method that registers a fact that already happened elsewhere (called
  by a reaction use case: `markPaid`, `markShipped`, `cancelForRejectedPayment`) returns without
  changes when it does not apply and never throws a business error: events may arrive twice or
  late.
- A method that changes state and then finds a broken invariant restores the previous state
  before rethrowing (`changeLineQuantity` restores the line's quantity when `assertTotal` throws).
- Public queries may exist (`subtotal()`, `total()`, `isIn(status)`), and a public `assert…()`
  for a precondition a use case checks before an operation that does not change the aggregate
  (`order.assertDiscardable()` before `orders.remove(order)`).
- An aggregate never holds a repository, the event bus, a logger, HTTP, a version, setters nor
  ids derived from other data. Another aggregate is referenced by its id (`customerId:
  CustomerId`), never by the object. A domain service or loaded data comes as a method argument,
  never through the constructor.
- **Child entities** (`entity/<Entity>.ts`, a part with an identity of its own inside the
  aggregate) extend `Entity<<IdVO>>` (`LineNumber extends Required(NumberType)`); fields as the
  aggregate's without `createdAt`/`updatedAt`; the constructor receives value objects, calls
  `super(id)` and assigns. They may have queries (`subtotal()`) and business methods only their
  root calls (`changeQuantity(quantity)`; Tell, Don't Ask [IDDD ch. 5 and 10]), never setters, a
  clock, events, `create` nor `toPrimitives`/`fromPrimitives` (the aggregate converts them). Their
  identity is local to the aggregate [IDDD ch. 10]. Prefer a composite over a child entity when
  nobody looks the part up by id [IDDD ch. 6].
- The aggregate carries **no version**: optimistic concurrency is the repository's.

## Domain events

`[Fuera de los libros: convención de @archi-code/ddd]`: the `DomainEvent` suffix, the
`'<aggregate>.<past_action>'` name and the object constructor are package conventions; the books
name the event class and its type after the fact alone (`OrderPlaced`) [IDDD ch. 8].

- `event/<Aggregate><PastAction>DomainEvent.ts` extends `EventBase`; the creation event is
  `<Aggregate>CreatedDomainEvent`. It declares `static readonly eventName =
  '<aggregate>.<past_action>'` in snake_case (`'order.line_quantity_changed'`), a fact in the past
  tense, unique in the whole system; the base copies it into the event's `eventName` field, and
  a missing or blank one throws `InvalidEventDefinitionException`.
- Fields are `readonly` and primitive data only: text, finite numbers, booleans, `null`, lists
  and plain objects of them. Money is `{ amount: number; currency: string }`, dates ISO text.
  Never value objects, `Date`s, class instances nor personal data nobody needs.
- The id of the aggregate is a named field (`orderId`, `paymentId`, `shipmentId`), and so are
  references to other aggregates (`orderId` in payment events). There is no `aggregateId` and no
  schema version.
- No interfaces nor type aliases in an event file: the field types are inline and the
  constructor takes one object typed inline as `{ …fields } & EventMetadata`, destructures
  `eventId, occurredOn, clock`, calls `super({ eventId, occurredOn, clock })` and assigns each
  field.
- An event is plain data: no methods, no `toPrimitives`/`fromPrimitives`. It is its own JSON:
  `{ ...event }` / `JSON.stringify(event)` give `eventName`, `eventId`, `occurredOn` and the
  fields, in that order.
- Only its aggregate creates it: `this.record(new OrderPaidDomainEvent({ orderId: this.id.value, …, clock }))`,
  always with the clock the method received (`occurredOn` comes from it; without it, from the
  system time). Pass `eventId` and `occurredOn` only when rebuilding an event a channel delivered.
- `event/<Aggregate>Event.ts` holds `export type <Aggregate>Event = | …`, the union of every
  event of the aggregate (with `import type`); every new event is added to it.
- `record(event)` is `protected` and keeps the event as it is; `pullDomainEvents()` returns the
  events (typed `Event[]`) in order and empties the list. Pull them after saving, to publish.
- **Events carry no schema version.** Adding an optional field old readers can ignore is
  compatible; a change they cannot follow is a new event with its own `eventName`, or the
  `EventRegistry` factory reads both shapes from the stored JSON.

## Business errors and specifications

- A business error is `exception/<WhatWentWrong>.ts` (no `Exception` suffix) extending
  `DomainException`, with only a constructor that receives primitives for the message and calls
  `super('<English message>', ['<CTX><NNN>'])`: one prefix per context (`SAL`, `PAY`, `SHP`, `MNY`
  for money) and the next free number. Only the aggregates, entities, value objects and domain
  services of the same context throw it, never a reaction method. Money errors live in
  `shared-kernel/money/`.
- **A named business rule that selects, validates or combines is a `Specification<T>`**
  (`specification/<Rule>.ts`): it implements `isSatisfiedBy(x): boolean`, receives its parameters
  by constructor (then `super()`), and a composed rule keeps
  `private readonly rule = new A(…).or(new B(…)).and(new C().not())` and returns
  `this.rule.isSatisfiedBy(x)`; `and`/`or` accept any `SatisfiedBy<T>` [IDDD ch. 5]. It receives
  loaded data only, never a repository, and answers a question; it never guards an invariant (its
  answer is data, such as `freeShipping` in `OrderCreatedDomainEvent`).
- **Domain services** (`service/<Service>.ts`) are plain classes holding a business rule that
  does not belong to one aggregate, named after the business operation (`OrderPricing`); they
  receive domain ports by constructor, work with value objects and throw business errors; they
  never save, open transactions nor publish [IDDD ch. 7]. A **domain port**
  (`service/<Port>.ts`, `CouponCatalog`) is an interface whose methods speak value objects
  (`discountOf(code: CouponCode): Promise<DiscountPercent | null>`), implemented in
  infrastructure. Only the composition root builds them; they are injected into user use cases.
- **The domain knows nothing about persistence nor transport**: no mapper, repository,
  repository interface of its own (`OrderRepository`), command, logger nor `Date.now()`.

## Use cases

A use case is one business action. There are two kinds; the only difference is where the input
comes from.

| Kind              | Input        | Class                                                              | Run by        |
| ----------------- | ------------ | ------------------------------------------------------------------ | ------------- |
| user use case     | request data | `<Action> extends UseCase<<Action>Input, <Action>Command, Output>` | an entry point |
| reaction use case | an event     | `<Action>On<Event> extends EventListener<<Event>DomainEvent>`      | the event bus |

- A use case does **one thing**: one business action, one class, one aggregate saved once
  [Destilado ch. 5; IDDD ch. 10] (the exceptions IDDD ch. 10 accepts are written down as an
  explicit decision); a flow of several actions is several use cases chained by events, never one
  use case with flags or a `type` field that switch behaviors. It is **named after the business
  action**, a verb and a noun a domain expert would say (`PlaceOrder`, `ConfirmTransferReceived`,
  `MarkOrderPaid`), never technical or CRUD names (`UpdateOrder`, `OrderService`,
  `ProcessOrder`). It never imports nor calls another use case or a reaction, opens no
  transaction, handles no HTTP, checks no raw input shape and holds no business rule.
- Constructor parameters, `private readonly` and only what `handle` uses, in this order: the
  repository typed by the roles it uses (`AggregateFinder<X> & AggregateSaver<X>`;
  `AggregateSaver<X>` alone to create; `AggregateFinder<X> & AggregateRemover<X>` to remove),
  domain services, `EventBus<<Aggregate>Event>`, `Clock`, `Logger`; the body is `super();`.

### User use cases

- The file `application/<action>/<action>.ts` exports `interface <Action>Input` (primitives and
  data types; `actorId` or `actorRole` when an actor matters), `interface <Action>Command` (value
  objects, composites, `New<Child>[]`) and the class. `Output` is `void`, or the new id as
  `string`; never an aggregate.
- `protected toCommand(input)` is exactly `return ValueObjectBuilder.build({ … })`: enums
  `new <Enum>Type(input.x as <Enum>)`, composites `X.fromPrimitives(input.x)`, money
  `Money.fromPrimitives(input.x as { amount: number; currency: Currency })`, lists of shapes
  `ValueObjectBuilder.buildList(input.lines, (line) => ValueObjectBuilder.build({ … }))`.
- `protected async handle(command)`, in this order: (1) authorization → `throw new
  NotAllowedException('<English message>')`; (2) a new id, `<Aggregate>Id.generate()`; (3)
  `<Aggregate>.create(...)`, or `findById` and, when it is `null`, `throw new
  AggregateNotFoundException('<Aggregate>', id.value)`; (4) the business method(s) with
  `this.clock`; (5) `await repo.save(x)` once (or `await repo.remove(x)`), then
  `await this.events.publish(x.pullDomainEvents())`; (6) log if the business wants a trace; (7)
  return the output. `UseCase` has no helpers. `execute` keeps package exceptions and wraps any
  other error of either step in `UnexpectedErrorException` with `cause`: let errors propagate.
- **Authorization belongs to the use case**: the entry point puts the requester (`actorId`,
  `actorRole`) in the input, `toCommand` builds it as a value object and `handle` throws
  `NotAllowedException` when the actor alone decides it (only treasury confirms transfers). A rule
  that depends on the aggregate's state (only the buyer cancels the order) is a business error of
  the aggregate.
- **Concurrency**: by default let `ConcurrencyException` reach the entry point (409). A use case
  whose change is safe to repeat may retry the whole load → change → save → publish in `handle`
  with `private static readonly ATTEMPTS = 3`, rethrowing anything that is not a
  `ConcurrencyException` and the last conflict [IDDD ch. 10; IDDD appendix A]. Never retry with
  the same loaded aggregate.

### Reaction use cases

`[Fuera de los libros: convención de @archi-code/ddd]`: the books put an event subscriber in the
application layer that calls an application service [IDDD ch. 8]; here the listener **is** the
use case, one class, with no `UseCase` behind it.

- File `application/<action>/<action>-on-<event>.ts` (in a read model,
  `application/<read-model>/<action>/<action>-on-<event>.ts`), class `<Action>On<Event>`, where
  `<Event>` is the event class name without `DomainEvent`. One event per class, and one class per
  reaction, also when several events feed one read model.
- It extends `EventListener<<Event>DomainEvent>` and is decorated with
  `@ListensTo(<Event>DomainEvent, { consumer: '<context>.<action>-on-<event>' })`: the consumer
  is its identity in the channel (its queue in a broker), a stable literal unique in the system,
  never derived from the class name, which minifiers change. The event class is the local copy
  of another context's event, or the context's own event (read models).
- Constructor as a user use case (repository roles, services, `EventBus`, `Clock`, `Logger`); a
  read-model reaction receives only its projection.
- `async handle(event)`, in this order: (1) `const { a, b } = ValueObjectBuilder.build({ a: () =>
  new A(event.a), … })`; (2) a derived id (`PaymentId.forOrder(orderReference)`); (3a) to create:
  `if ((await repo.findById(id)) !== null) { return; }` then `<Aggregate>.create(...)`; (3b) to
  change: `const x = await repo.findById(id); if (x === null) { return; }`; (4) the reaction
  method, which returns silently when it does not apply; (5) `save` once and
  `publish(x.pullDomainEvents())`; (6) log if needed.
- It never checks authorization, throws `AggregateNotFoundException` nor a business error (the
  channel would redeliver it forever), calls a use case or another reaction, handles HTTP nor
  catches errors. There is no `UseCase` wrapper: `DomainEventBus` logs a failure (`warn` for
  domain and application exceptions, `error` otherwise) and rethrows it to the channel, whose
  redelivery is the retry.
- **Reactions are idempotent**: delivery is at least once. Creating checks that the derived id is
  not taken, changing relies on the reaction method returning when the fact is already applied,
  and a projection skips an `eventId` it already applied.

### Events between contexts

- A context never imports another context's event class. For each event of another context it
  reacts to, the consumer declares its own copy next to the reaction:
  `application/<action>/<event>-domain-event.ts`, with the same class name and `eventName` as the
  producer and only the fields `handle` reads, written like a domain event (inline types,
  `EventMetadata`). Two reactions of one context to the same foreign event keep one copy each.
- Plain shapes the application receives (`MoneyData`, `AddressData`) are `export interface` in
  kebab-case files in the folder of the use case that first needs them; the rest of the context
  imports them from there. They never live in `domain/` and are never shared between contexts.
- The event's JSON is the contract between contexts: never change its data incompatibly under
  the same `eventName`. When the events leave the system (a broker shared with other teams), the
  adapter that talks to the broker translates them to a published, versioned contract
  (`messageId` = `eventId`) [IDDD ch. 13].

### Read models

- Folder `application/<read-model>/` (`order-summaries/`) with `<row>.ts` (the row interface of
  primitives and `<Row>Changes = Partial<Pick<<Row>, …>>`), `<row>-store.ts` (write port:
  `find(id)`, `hasApplied(eventId)`, `save(row, eventId)`), `<rows>.ts` (query port: `byId`,
  `ofCustomer`), `<row>-projection.ts` and one subfolder per reaction.
- The projection (`OrderSummaryProjection`) is not a use case and hears no event: it receives the
  store port and `apply({ eventId, orderId, occurredOn, changes })` returns when the `eventId`
  was applied, merges the changes into the stored row (or a default row), sets `lastEventAt` and
  saves with the `eventId`.
- Each event that changes the row has its own reaction use case, which builds `eventId: new
  UuidType(event.eventId)`, the id, `occurredOn: new CreatedAt(event.occurredOn)` and what it
  needs, decides the change and calls `await this.projection.apply(...)`.
- Queries have no use case: the entry point receives the query port and calls it. One
  infrastructure class implements both ports and returns copies (`structuredClone`). A read model
  never loads aggregates nor uses a repository. Event Sourcing and CQRS beyond this are optional,
  only for a concrete need.

## Infrastructure

- **Repositories only get and persist** (`findById`, `save`, `remove`): no business logic, no
  business queries (`pendingOlderThan`), no `nextId()`, no events; they may expose read helpers
  (`versionOf(id)`). **One repository per aggregate and technology**
  (`infrastructure/persistence/<technology>-<aggregate>-repository.ts`): it implements the roles
  the use cases need (`AggregateFinder<X>`, `AggregateSaver<X>`, `AggregateRemover<X>`; there is
  no all-in-one `Repository` and no repository interface of its own), and its constructor
  receives only its technology (a collection, a pool; nothing in memory), never an aggregate
  class nor a mapper. It calls `X.fromPrimitives(row)` on load and `x.toPrimitives()` on save.
- The in-memory repository is an implementation like any other [IDDD ch. 12]. It lives in
  `infrastructure/persistence/in-memory-<aggregate>-repository.ts` when the application runs in
  memory, or in `test/support/` when it is only a test double; the package ships none.
- **Every repository checks the version**: it remembers the version of each aggregate object it
  loaded or saved in a private `WeakMap<X, number>` (`versions`); on load,
  `versions.set(x, row.version)`; on save, `version = versions.get(x) ?? 0`, a stored version
  (`?? 0`) different from it throws `ConcurrencyException('<Aggregate>', id, version)` (so an
  existing id for a new aggregate is a conflict too), it stores `version + 1` next to (never
  inside) the primitives and remembers `version + 1`. `remove(aggregate)` receives the loaded
  aggregate and does the same check before deleting [IDDD ch. 10]. In memory it stores
  `structuredClone` copies both ways in a `Map<string, { version, primitives }>`. A real one wraps
  driver errors in `InternalErrorException` with `{ cause }`.
- **The repository owns the transaction and everything about persistence** (`[Fuera de los
  libros: convención de @archi-code/ddd]`; IDDD ch. 14 gives it to the application service):
  there is no transaction port; each `save`/`remove` is atomic (one document, or a database
  transaction opened and committed inside `save`); when events must not be lost between `save`
  and `publish` [Destilado ch. 6; IDDD ch. 8], it stores them in the same write (an outbox) and a
  relay delivers them through an `EventChannel`.
- **Port adapters** (`infrastructure/<area>/<technology>-<port>.ts`, `InMemoryCouponCatalog
  implements CouponCatalog`) receive raw data or their technology by constructor (raw shapes are
  interfaces in the same file), answer in value objects, and turn bad external data into
  `InternalErrorException('<message>', { cause: error })`, never a business error.
- **Event wiring** is infrastructure, used only by the composition root:
  `DomainEventBus(channel, registry, logger)` implements `EventBus` (`publish` sends a plain copy
  of each event in one `send`; `subscribe(listener)` → `Subscription { unsubscribe() }` reads the
  `@ListensTo`, refuses an event the registry lacks with `UnknownEventException` and hands the
  listener the event rebuilt from its JSON, also in memory). A messaging technology implements
  only `EventChannel` (`send(serialized)`, `receive(eventName, consumer, handler)` →
  `ChannelSubscription { close() }`); swapping it changes one line.
- `EventRegistry` registers each event the context hears exactly once, with a factory that maps
  every field from the JSON with a cast and passes `eventId: json.eventId` and
  `occurredOn: json.occurredOn`; `fromJSON` throws `InternalErrorException` when the rebuilt event
  lost them, which reactions need to skip a redelivery.

## Entry points and composition

- The package speaks no protocol. One technical helper per protocol (`platform/http/http.ts`,
  shared by every context and holding no business rule) translates errors with
  `ExceptionClassifier.classify(error)` from `/infrastructure`: `Malformed` (a conversion or
  required error thrown alone) 400, `Rejected` (any other `ApplicationException`) 400,
  `NotAllowed` 403, `NotFound` 404, `Conflict` 409, `Invalid` (`ValidationException` and any other
  `DomainException`) 422, `Internal` (`UnexpectedErrorException`, `InvalidEventDefinitionException`,
  anything else) 500, logged once as `logger.error('http_request_failed', …)` with the message
  hidden. The error body is `{ code, message, errors }` (`errors` only for `ValidationException`).
  Never classify with hand-written `instanceof` chains.
- A controller (`interfaces/http/<aggregates>-controller.ts`) receives the user use cases (or one
  `<Aggregates>UseCases` interface when there are many), the query ports and `logger` last, and
  builds its `Http` helper. One method per endpoint returns `this.http.respond(async () => { … })`:
  (1) when an actor matters, missing `request.auth` → 401; (2) a body that is not a JSON object,
  or a list that is not an array → 400 with an English hint (shape only, never values); (3)
  `await useCase.execute({ actorId | actorRole, …params, …body })`; (4) 201 `{ id }` to create,
  204 for a command, 200 for a query (a missing row → 404). It never catches errors, maps statuses
  nor holds rules.
- The composition root (`composition.ts`, one class `<Context>Context` and
  `interface <Context>Settings { channel; clock; logger; …own data }`) is the only place that
  builds classes of the context and reads configuration: `static async start(settings)` builds
  `new DomainEventBus<EventBase>(channel, <Context>Context.registry(), logger)`, the repositories,
  stores, adapters, domain services and projections, every reaction use case with its
  dependencies (each subscribed with `await bus.subscribe(listener)`, its `Subscription` kept),
  then the controller with the user use cases; `async stop()` unsubscribes every subscription;
  `private static registry()` builds the `EventRegistry`. One top-level file opens one channel and
  starts every context with the same channel, clock and logger, and stops them in reverse order.

## Time and logging

- Business time comes only from a `Clock` (`clock.now()`, `CreatedAt.now(clock)`): never
  `Date.now()` nor `new Date()` without a clock value. Use cases receive the `Clock` port and pass
  it to every aggregate method; tests use `FixedClock`.
- Logging goes through the `Logger` port of `/application` (`debug`, `info`, `warn`, `error`,
  each `(message, context?)`): the message is a stable snake_case name and the data goes in the
  context (`this.logger.info('order_cancelled_for_rejected_payment', { orderId: orderId.value })`,
  after publishing). The domain never logs (it records events or throws). The composition root
  picks the provider: `ConsoleLogger({ level })`, an adapter over pino or winston,
  `InMemoryLogger` in tests (`entries`), `SilentLogger` by default. Each error is logged once,
  where it is handled.

## Where to throw each exception

- Domain (aggregates, VOs, domain services): a business error (`DomainException` subclass with its
  code); `ValidationException`, `TypePrimitiveException` and `RequiredValueException` come from
  the value objects (throw the last two yourself only inside the `filter` of a custom type).
- User use cases: `AggregateNotFoundException` when `findById` returns `null`,
  `NotAllowedException` for authorization, `ApplicationException` for other application errors.
  Reaction use cases throw none of them: they return.
- Adapters: `InternalErrorException` (or another `InfrastructureException`), always with
  `{ cause: error }` when wrapping another error.
- For logs or messages use `error.code` and the code enum of each layer (`DomainExceptionCode`,
  `ApplicationExceptionCode`, `InfrastructureExceptionCode`), or `instanceof`: the built-in
  exceptions are recognized across the CJS and ESM builds.
