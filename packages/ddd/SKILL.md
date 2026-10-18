---
name: archi-code-ddd
description: Rules, patterns and common mistakes for writing TypeScript code with @archi-code/ddd (archi-code DDD by layer - domain value objects, Required(...), AggregateRoot with identity and events, EventBase and exceptions; application UseCase and ports Repository/EventBus/Clock; infrastructure InMemoryRepository, InMemoryEventBus, DomainEventRegistry, HttpErrorMapper and clocks). Use it when creating or changing value objects, entities, aggregates, events, use cases, repositories or adapters, mapping errors to HTTP, or whenever the code imports @archi-code/ddd.
---

# archi-code-ddd

`@archi-code/ddd` is archi-code's Domain-Driven Design package for TypeScript, one entry point per
layer: `@archi-code/ddd/exceptions` (the exceptions every layer throws), `@archi-code/ddd/domain` (value objects, aggregates, events),
`@archi-code/ddd/application` (`UseCase` and the ports `AggregateFinder`, `AggregateSaver`, `AggregateRemover`, `EventBus`, `Clock`) and
`@archi-code/ddd/infrastructure` (in-memory adapters, event registry, HTTP error mapper, clocks).

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
import type { EventMetadata, PrimitiveTypes } from '@archi-code/ddd/domain';
import { UseCase } from '@archi-code/ddd/application';
import type {
  AggregateFinder,
  AggregateRemover,
  AggregateSaver,
  Clock,
  EventBus,
} from '@archi-code/ddd/application';
import {
  DomainEventRegistry,
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

- Import from the layer, never from the package root (there is none): exceptions always come from
  `@archi-code/ddd/exceptions` (never from `/domain`); domain code imports `/domain` and
  `/exceptions`, use cases add `/application`, adapters and wiring add `/infrastructure`. Keep the
  same direction in the project's folders.

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
- Aggregates extend `AggregateRoot<Id, Event>` and call `super(id)`. The base carries no version:
  an aggregate that needs optimistic concurrency declares its own `version`, exposes it in its
  primitives, and its adapter throws `ConcurrencyException(name, id, expectedVersion)` on a stale
  save.
- `record(event)` is `protected`; `pullDomainEvents()` returns the events (typed `Event[]`) in order
  and empties the list. Pull them after persisting, to publish.
- Events extend `EventBase`, implement `eventName()` and call `super(aggregateId, metadata)`. The
  base sets `eventId` (UUID v4) and `occurredOn` (immutable `Date`, from `metadata.clock` when
  given, otherwise the system time); pass `{ eventId, occurredOn }` only when rebuilding an event
  read from an outbox or a broker. Serialize with `JSON.stringify` /
  `toJSON()` (`eventName`, `eventId`, `aggregateId`, ISO `occurredOn` and the payload).
- `PrimitiveTypes<T>` only sees **public** non-method members (it strips the leading `_`): expose
  VOs with public getters or public `readonly` properties. For an aggregate it includes `id`;
  child entities become their primitives; plain `string`/`number`/`boolean`/`Date`
  members pass through.
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
- Interface segregation: a use case depends only on the repository roles it uses —
  `AggregateFinder<A>` (`findById`), `AggregateSaver<A>` (`save`), `AggregateRemover<A>`
  (`delete`), combined with `&` when it needs several. There is no all-in-one `Repository` port:
  an adapter implements each role it supports.
- Use cases extend `UseCase<Input, Output>`, receive ports by constructor (`AggregateSaver<Order>`,
  `EventBus<OrderEvent>`, `Clock`), implement `protected handle(input)` and are called with
  `execute(input)`. `UseCase` has no helpers: write every step in `handle` (load with
  `findById` and throw `AggregateNotFoundException` when it is `null`, change the aggregate, `save`,
  then `publish(aggregate.pullDomainEvents())`). Let errors propagate: `execute` keeps package
  exceptions and wraps any other error in `InternalErrorException` with `cause`.
- A real repository implements the roles it supports (`AggregateFinder<A>`, `AggregateSaver<A>`,
  `AggregateRemover<A>`) and wraps driver errors in `InternalErrorException` with `cause`.
  `InMemoryRepository(mapper)` is the reference for tests: it stores copies of the primitives (the
  last save wins).
- Consumers of an outbox or broker rebuild events with `DomainEventRegistry`: register a factory per
  `eventName` that passes the JSON as metadata (`new OrderPlaced(json.aggregateId, …, json)`).

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

class OrderLine {
  constructor(
    readonly id: IdType,
    readonly sku: Sku,
    readonly units: Units,
  ) {}
}

class OrderPlaced extends EventBase {
  constructor(
    orderId: string,
    readonly customer: string,
    metadata?: EventMetadata,
  ) {
    super(orderId, metadata);
  }

  eventName(): string {
    return 'order.placed';
  }
}

class OrderLineAdded extends EventBase {
  constructor(
    orderId: string,
    readonly sku: string,
    readonly units: number,
  ) {
    super(orderId);
  }

  eventName(): string {
    return 'order.line_added';
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
    private _shipped: boolean,
    private _updatedAt: UpdatedAt,
    readonly createdAt: CreatedAt,
  ) {
    super(id);
  }

  static place(id: string, customer: string): Order {
    const order = new Order(
      new OrderId(id),
      new CustomerName(customer),
      [],
      false,
      UpdatedAt.now(),
      CreatedAt.now(),
    );
    order.record(new OrderPlaced(id, customer));
    return order;
  }

  static fromPrimitives(primitives: PrimitiveTypes<Order>): Order {
    return new Order(
      new OrderId(primitives.id),
      new CustomerName(primitives.customer),
      primitives.lines.map(
        (line) => new OrderLine(new IdType(line.id), new Sku(line.sku), new Units(line.units)),
      ),
      primitives.shipped,
      new UpdatedAt(primitives.updatedAt),
      new CreatedAt(primitives.createdAt),
    );
  }

  get lines(): OrderLine[] {
    return [...this._lines];
  }

  get shipped(): boolean {
    return this._shipped;
  }

  get updatedAt(): UpdatedAt {
    return this._updatedAt;
  }

  addLine(sku: string, units: number): void {
    if (this._shipped) {
      throw new OrderShippedException(this.id.value);
    }
    const line = new OrderLine(new IdType(IdType.random()), new Sku(sku), new Units(units));
    this._lines = [...this._lines, line];
    this._updatedAt = UpdatedAt.now();
    this.record(new OrderLineAdded(this.id.value, sku, units));
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
      shipped: this.shipped,
      updatedAt: this.updatedAt.value,
      createdAt: this.createdAt.value,
    };
  }
}
```

Use case with ports, loading, saving and publishing:

```ts
class AddOrderLine extends UseCase<{ orderId: string; sku: string; units: number }, void> {
  constructor(
    private readonly orders: AggregateFinder<Order> & AggregateSaver<Order>,
    private readonly bus: EventBus<OrderEvent>,
  ) {
    super();
  }

  protected async handle(input: { orderId: string; sku: string; units: number }): Promise<void> {
    const order = await this.orders.findById(new OrderId(input.orderId));
    if (order === null) {
      throw new AggregateNotFoundException('Order', input.orderId);
    }
    order.addLine(input.sku, input.units);
    await this.orders.save(order);
    await this.bus.publish(order.pullDomainEvents());
  }
}
```

A real repository implements only the roles it supports and wraps driver errors with their cause:

```ts
class MongoOrderRepository implements AggregateSaver<Order> {
  async save(order: Order): Promise<void> {
    const data = order.toPrimitives();
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
const orders = new InMemoryRepository({
  toPrimitives: (order: Order) => order.toPrimitives(),
  fromPrimitives: Order.fromPrimitives,
});
const bus = new InMemoryEventBus<OrderEvent>();
await orders.save(Order.place(orderId, 'Ana'));
await new AddOrderLine(orders, bus).execute({ orderId, sku: 'TORCH-01', units: 2 });
bus.published; // events in order

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
    const order = Order.place(orderId, 'Ana');
    order.addLine('TORCH-01', 2);
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
