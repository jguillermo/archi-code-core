---
name: archi-code-ddd
description: Rules, patterns and common mistakes for writing TypeScript code with @archi-code/ddd (archi-code DDD by layer - where each class goes and what it may import; domain value objects, Required(...), AggregateRoot with identity and events, EventBase, repository contracts and exceptions; application UseCase with toCommand/handle, EventListener with @ListensTo and the ports EventBus/Clock; infrastructure InMemoryRepository, EventDispatcher, InMemoryEventBus, DomainEventRegistry, HttpErrorMapper and clocks). Use it when creating or changing value objects, entities, aggregates, events, domain services, use cases, listeners, repositories or adapters, deciding in which layer a class goes, mapping errors to HTTP, or whenever the code imports @archi-code/ddd.
---

# archi-code-ddd

`@archi-code/ddd` is archi-code's Domain-Driven Design package for TypeScript, one entry point per
layer: `@archi-code/ddd/exceptions` (the exceptions every layer throws), `@archi-code/ddd/domain`
(value objects, aggregates, events and the repository contracts `AggregateFinder`,
`AggregateSaver`, `AggregateRemover`), `@archi-code/ddd/application` (`UseCase`,
`EventListener`, `@ListensTo` and the ports `EventBus`, `Clock`) and
`@archi-code/ddd/infrastructure` (in-memory adapters, event dispatcher and registry, HTTP error
mapper, clocks).

## Full API

Before using a class, function, option or type that does not appear in this skill, read
`node_modules/@archi-code/ddd/README.md`: it matches the installed version. Do not assume
signatures, options or exports. If the package is not installed: `npm install @archi-code/ddd`
(and `npm install @archi-code/validation` if validations are declared with `@Validations`).

If that path does not exist (monorepo with workspaces, pnpm…), locate the package with
`node -p "require.resolve('@archi-code/ddd/package.json')"` and read the `README.md` in that
folder.

## Related skills

If they are installed in the project, use them together with this one:

- `archi-code-validation`: available validators, their options and `@Validations` rules.

## Import

```ts
import {
  AggregateRoot,
  BooleanType,
  CreatedAt,
  EventBase,
  IdType,
  NumberType,
  Required,
  StringType,
  UpdatedAt,
} from '@archi-code/ddd/domain';
import {
  AggregateNotFoundException,
  DomainException,
  ExceptionCode,
  InternalErrorException,
} from '@archi-code/ddd/exceptions';
import type {
  AggregateFinder,
  AggregateRemover,
  AggregateSaver,
  EventMetadata,
  PrimitiveTypes,
} from '@archi-code/ddd/domain';
import { EventListener, ListensTo, UseCase } from '@archi-code/ddd/application';
import type { Clock, EventBus } from '@archi-code/ddd/application';
import {
  AggregateMapper,
  DomainEventRegistry,
  EventDispatcher,
  FixedClock,
  HttpErrorMapper,
  InMemoryEventBus,
  InMemoryRepository,
} from '@archi-code/ddd/infrastructure';
import { Validations } from '@archi-code/validation';
```

```js
const { Required, StringType } = require('@archi-code/ddd/domain');
```

## Rules

### Where each class goes

| Class                                    | Layer          | May depend on                                             | Never                                                            |
| ---------------------------------------- | -------------- | --------------------------------------------------------- | ---------------------------------------------------------------- |
| Value object                             | domain         | other value objects, `@archi-code/validation`, exceptions | mutate, know about storage or transport                          |
| Aggregate root, child entity             | domain         | value objects, child entities, events, domain services    | read a repository, publish, `new Date()`                         |
| Domain event (`OrderPlaced`)             | domain         | value objects                                             | behavior, infrastructure                                         |
| Repository contract (`AggregateFinder`…) | domain         | the aggregate                                             | an implementation in the domain, an all-in-one `Repository`      |
| Domain service                           | domain         | aggregates, value objects, repository contracts           | I/O, transactions, publishing                                    |
| Use case (`PlaceOrder`)                  | application    | domain, `EventBus`, `Clock`, exceptions                   | import another use case or a listener, persist or call a network |
| Listener (`ReserveStockOnOrderPlaced`)   | application    | one use case (by constructor), the event                  | business rules, saving aggregates, calling several use cases     |
| Port (`EventBus`, `Clock`)               | application    | domain types                                              | code                                                             |
| Adapter, dispatcher, mapper, clock       | infrastructure | domain, application, exceptions, drivers                  | business rules                                                   |
| Wiring (controllers, workers)            | infrastructure | everything                                                | being imported by the domain or the application                  |

- Dependencies only point inwards: the domain imports only `/domain` and `/exceptions`, the
  application adds `/application`, and only infrastructure imports `/infrastructure`. Keep the
  same folders (`domain/`, `application/`, `infrastructure/`) and the same direction in the
  project, and check them with an import test like the package's own.
- Import from the layer, never from the package root (there is none): exceptions always come from
  `@archi-code/ddd/exceptions` (never from `/domain`).
- Logic two use cases share never goes in a use case: a business rule becomes a method of the
  aggregate or a domain service; a technical step becomes a port. When an action must follow
  another, the first records an event and a listener runs the second.
- Names: use cases are business verbs (`PlaceOrder`), events are facts in the past
  (`OrderPlaced`), listeners are `<Action>On<Event>` (`ReserveStockOnOrderPlaced`, where
  `<Action>` is the use case it runs).

### Domain, application and infrastructure

- Value objects are **optional by default** (`value: T | null`). `Required(XType)` makes them
  required: the constructor demands `T` and, if it receives an empty value (`null`, `undefined` or a
  blank string), throws `RequiredValueException` with the class name. `Required(...)` also declares
  the `isRequired` validation.
- A domain VO is always a named subclass (`class Email extends ...`): the name appears in the error
  messages, and `equals` compares the class too (`BillingCountry('ES')` is not a
  `ShippingCountry('ES')`).
- Construction only converts (or throws `TypePrimitiveException`). `@Validations` rules are checked
  by `validate()` (never throws, returns `{ ok, value, errors }`) or by `assertValid()` (returns the
  same instance or throws `ValidationException` whose `errors` are `'<Class>: <message>'`). Use
  `new Email(input).assertValid()` where the domain needs an always-valid VO; use `validate()` to
  collect every error of a form.
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
  (`new OrderPlaced(id, …, { clock })`) from use cases; tests use `FixedClock`.
- A custom type extends `AbstractType<T>` and implements only `protected filter(value: unknown): T`
  (it receives input already known to be non-empty; it returns the value or throws
  `TypePrimitiveException`). If restricting an existing type is enough, extend it and use
  `@Validations`.
- Only the aggregate root has a base class: it passes the id to `super(id)`, exposed as
  `readonly id`; do not redeclare it (no `_id` + getter). `equals` compares class and id only.
  Child entities (the lines of an order) are plain classes with a value object id, created and
  changed only through their aggregate.
- **The domain knows nothing about persistence**: no mapper, repository nor storage concern in
  domain code; a repository receives an aggregate and stores it. `AggregateMapper` is imported from
  `@archi-code/ddd/infrastructure`.
- **Aggregates and their primitives** (every aggregate follows these six rules so infrastructure can
  store it):
  1. All its state is value objects: each persisted field is a value object, a list of them or a
     child entity (plain class) whose fields are value objects. A flag is
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
     primitives and value objects returned by `toPrimitives()`.
- Aggregates extend `AggregateRoot<Id, Event>` and call `super(id)`. The base carries no version:
  an aggregate that needs optimistic concurrency declares its own `version`, exposes it in its
  primitives, and its adapter throws `ConcurrencyException(name, id, expectedVersion)` on a stale
  save.
- `record(event)` is `protected`; `pullDomainEvents()` returns the events (typed `Event[]`) in order
  and empties the list. Pull them after persisting, to publish.
- Events extend `EventBase`, declare `static readonly eventName = '<context>.<fact>'` and call
  `super(aggregateId, metadata)`; `event.eventName()` returns it. Listeners and registries refer to
  the event by its class (`@ListensTo(OrderPlaced)`, `register(OrderPlaced, …)`). The
  base sets `eventId` (UUID v4) and `occurredOn` (immutable `Date`, from `metadata.clock` when
  given, otherwise the system time); pass `{ eventId, occurredOn }` only when rebuilding an event
  read from an outbox or a broker. Serialize with `JSON.stringify` /
  `toJSON()` (`eventName`, `eventId`, `aggregateId`, ISO `occurredOn` and the payload).
- `PrimitiveTypes<T>` only sees **public** non-method members (it strips the leading `_`): expose
  VOs with public getters or public `readonly` properties. For an aggregate it includes `id`;
  child entities become their primitives; raw `string`/`number`/`boolean`/`Date`
  members become `never`.
- Where to throw each exception:
  - Domain (aggregates, VOs, business rules): `DomainException` or a custom subclass with its own
    code; `ValidationException` (usually through `assertValid()`); `AggregateNotFoundException`
    when the repository does not find the aggregate.
  - Use cases: `ApplicationException`.
  - Adapters (DB, network…): `InfrastructureException` / `InternalErrorException`, always with
    `{ cause: error }` when wrapping another error.
  - `TypePrimitiveException` and `RequiredValueException` are thrown by the VOs; throw them yourself
    only inside the `filter` of a custom type.
- Map errors to HTTP with `HttpErrorMapper` (overrides by code for your own codes); never hand-write
  status tables that leak infrastructure messages. For logs or messages use `error.code` and the
  exported `ExceptionCode` enum, or `instanceof`: the built-in exceptions are recognized across the
  CJS and ESM builds.
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
  (`AggregateSaver<Order>`, `EventBus<OrderEvent>`, `Clock`) and are called with `execute(input)`.
  They implement two steps: `protected toCommand(input)` builds and validates the value objects
  (`assertValid()`) and returns the command (one value object, or a small interface of value
  objects); `protected handle(command)` works only with value objects. `UseCase` has no helpers:
  write every step in `handle` (load with `findById` and throw `AggregateNotFoundException` when it
  is `null`, change the aggregate, `save`, then `publish(aggregate.pullDomainEvents())`). Let errors
  propagate: `execute` keeps package exceptions and wraps any other error (also from `toCommand`)
  in `InternalErrorException` with `cause`.
- A use case never imports nor calls another use case.
- Listeners extend `EventListener<Event>`, are decorated with `@ListensTo(EventClass)` (one event
  per listener, any number of listeners per event), receive the one use case they run by
  constructor and their `handle(event)` only maps the event to that use case's input.
- Listeners are wired in infrastructure: `new EventDispatcher([...listeners])`, given to
  `new InMemoryEventBus(dispatcher)` for in-process delivery, or called with
  `dispatcher.dispatch(registry.fromJSON(message))` by a queue or outbox consumer. The application
  only knows `EventBus.publish`.
- A real repository implements the roles it supports (`AggregateFinder<A>`, `AggregateSaver<A>`,
  `AggregateRemover<A>`) and wraps driver errors in `InternalErrorException` with `cause`.
  `InMemoryRepository(AggregateMapper.of(Order))` is the reference for tests: it stores copies of the primitives (the
  last save wins).
- Consumers of an outbox or broker rebuild events with `DomainEventRegistry`: register a factory per
  event class that passes the JSON as metadata
  (`register(OrderPlaced, (json) => new OrderPlaced(json.aggregateId, …, json))`).

## Recommended patterns

Optional by default, required with `Required(XType)`:

```ts
class Nickname extends StringType {} // value: string | null; constructor accepts string | null | nothing
class Name extends Required(StringType) {} // value: string; constructor demands string
class FullName extends Name {} // still required
```

Always-valid value objects with `@Validations` + `assertValid()`:

```ts
@Validations([{ validator: 'isEmail' }])
class Email extends Required(StringType) {}

@Validations([
  { validator: 'isInt', properties: { min: 0 } },
  { custom: 'isEven', fn: (v) => Number(v) % 2 === 0, message: 'Must be even' },
])
class Quantity extends NumberType {}

const email = new Email(input).assertValid();
// ValidationException: Validation failed, Email: Value does not satisfy isEmail

new Quantity(3).validate();
// { ok: false, value: 3, errors: [{ custom: 'isEven', message: 'Must be even' }] }
```

Aggregate with typed id, child entities and events:

```ts
class OrderId extends IdType {}
class Sku extends Required(StringType) {}
class Units extends Required(NumberType) {}
class CustomerName extends Required(StringType) {}
class Shipped extends Required(BooleanType) {}

class OrderLine {
  constructor(
    readonly id: IdType,
    readonly sku: Sku,
    readonly units: Units,
  ) {}
}

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

  static place(id: OrderId, customer: CustomerName): Order {
    const order = new Order(id, customer, [], new Shipped(false), UpdatedAt.now(), CreatedAt.now());
    order.record(new OrderPlaced(id.value, customer.value));
    return order;
  }

  static fromPrimitives(primitives: PrimitiveTypes<Order>): Order {
    return new Order(
      new OrderId(primitives.id),
      new CustomerName(primitives.customer),
      primitives.lines.map(
        (line) => new OrderLine(new IdType(line.id), new Sku(line.sku), new Units(line.units)),
      ),
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

  addLine(sku: Sku, units: Units): void {
    if (this._shipped.value) {
      throw new OrderShippedException(this.id.value);
    }
    const line = new OrderLine(new IdType(IdType.random()), sku, units);
    this._lines = [...this._lines, line];
    this._updatedAt = UpdatedAt.now();
    this.record(new OrderLineAdded(this.id.value, sku.value, units.value));
  }

  toPrimitives(): PrimitiveTypes<Order> {
    return {
      id: this.id.value,
      customer: this.customer.value,
      lines: this._lines.map((line) => ({
        id: line.id.value,
        sku: line.sku.value,
        units: line.units.value,
      })),
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
    private readonly bus: EventBus<OrderEvent>,
  ) {
    super();
  }

  protected toCommand(input: AddOrderLineInput): AddOrderLineCommand {
    return {
      orderId: new OrderId(input.orderId),
      sku: new Sku(input.sku).assertValid(),
      units: new Units(input.units).assertValid(),
    };
  }

  protected async handle(command: AddOrderLineCommand): Promise<void> {
    const order = await this.orders.findById(command.orderId);
    if (order === null) {
      throw new AggregateNotFoundException('Order', command.orderId.value);
    }
    order.addLine(command.sku, command.units);
    await this.orders.save(order);
    await this.bus.publish(order.pullDomainEvents());
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
    return { orderId: new OrderId(input.orderId), sku: new Sku(input.sku) };
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

A real repository implements only the roles it supports and wraps driver errors with their cause:

```ts
class MongoOrderRepository implements AggregateSaver<Order> {
  private readonly mapper = AggregateMapper.of(Order);

  async save(order: Order): Promise<void> {
    const data = this.mapper.toPrimitives(order);
    try {
      await this.collection.replaceOne({ _id: data.id }, data, { upsert: true });
    } catch (error) {
      throw new InternalErrorException('saving order', { cause: error });
    }
  }
}
```

Wiring and tests with the in-memory adapters, a fixed clock and the HTTP mapper:

```ts
const orders = new InMemoryRepository(AggregateMapper.of(Order));
const listeners = new EventDispatcher([
  new PrepareShipmentOnOrderLineAdded(new PrepareShipment(warehouse)),
]);
const bus = new InMemoryEventBus<OrderEvent>(listeners);
await orders.save(Order.place(new OrderId(orderId), new CustomerName('Ana')));
await new AddOrderLine(orders, bus).execute({ orderId, sku: 'TORCH-01', units: 2 });
bus.published; // events in order; PrepareShipment already ran

const registry = new DomainEventRegistry<OrderEvent>().register(
  OrderLineAdded,
  (json) => new OrderLineAdded(json.aggregateId, json.sku as string, json.units as number, json),
);
await listeners.dispatch(registry.fromJSON(queueMessage)); // same listeners, fed by a queue

const errors = new HttpErrorMapper({ ORD001: 409 });
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
    const order = Order.place(new OrderId(orderId), new CustomerName('Ana'));
    order.addLine(new Sku('TORCH-01'), new Units(2));
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
  classes, no generic `ValueObject`, no `setNow()`, `addItem()`, `setItem()` or `removeItem()`.
  When in doubt, check the installed README.
- Importing `@archi-code/ddd/infrastructure` from domain code, or `application` from the domain.
- Importing an exception from `@archi-code/ddd/domain`: exceptions live in
  `@archi-code/ddd/exceptions`.
- Catching errors inside `handle` just to rethrow them as `ApplicationException`: let them
  propagate; `execute` keeps package exceptions and wraps the rest.
- Calling `bus.publish` before `repository.save`, or publishing without `pullDomainEvents()`.
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
- Expecting the constructor to fail because of an `@Validations` rule: it only fails on conversion or
  on an empty value in `Required`. Chain `assertValid()` or call `validate()`.
- Throwing `ValidationException` by hand from `validate()` errors when `assertValid()` does it.
- Sending local date-times without a zone (`'2024-01-31T10:00:00'`) to `DateType`: they are rejected.
- Passing unconverted values with their static type (`new NumberType('1.5')`): type error; conversion
  is for `any`/`unknown` input.
- Using `Required(StringType)` directly as a property type instead of a named subclass.
- Declaring `private readonly _id` + `get id()` in an aggregate: the id goes to `super(id)`.
- Looking for an `Entity` base class: there is none; child entities are plain classes.
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
- Looking for `version` in `AggregateRoot`: there is none; declare it in the aggregate that needs
  optimistic concurrency.
- Creating events without the aggregate id (`super()`), or generating `eventId`/`occurredOn`
  yourself for a new event: the base does it.
- Wrapping an error in `InternalErrorException` without `{ cause: error }`.
- `JsonType` with `{}` or with an array: throws `TypePrimitiveException` (it must be a non-empty
  object).
- `IdType` with `00000000-0000-0000-0000-000000000000` or `ffffffff-ffff-ffff-ffff-ffffffffffff`:
  throws `TypePrimitiveException`.
- Declaring an aggregate's VOs as `private` without getters and expecting `PrimitiveTypes` to see
  them.
- Calling `record()` from outside the aggregate (it is `protected`) or forgetting `super(...)` in the
  constructor of an aggregate or event.
- Importing `@Validations` from `@archi-code/ddd/domain`: it is imported from `@archi-code/validation`.
