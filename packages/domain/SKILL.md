---
name: archi-code-domain
description: Rules, patterns and common mistakes for writing TypeScript code with @archi-code/domain (archi-code DDD - immutable value objects compared by value, Required(...), Entity and AggregateRoot with id, version and domain events, EventBase with metadata and exceptions with codes and causes). Use it when creating or changing value objects, declaring validations with @Validations, modeling entities, aggregates, repositories and events, throwing or defining domain exceptions, or whenever the code imports @archi-code/domain.
---

# archi-code-domain

`@archi-code/domain` is archi-code's Domain-Driven Design package for TypeScript: value objects that
convert, validate, compare by value and are immutable; entities and aggregates with identity,
version and domain events; and exceptions with codes and causes.

## Full API

Before using a class, function, option or type that does not appear in this skill, read
`node_modules/@archi-code/domain/README.md`: it matches the installed version. Do not assume
signatures, options or exports. If the package is not installed: `npm install @archi-code/domain`
(and `npm install @archi-code/validation` if validations are declared with `@Validations`).

If that path does not exist (monorepo with workspaces, pnpm…), locate the package with
`node -p "require.resolve('@archi-code/domain/package.json')"` and read the `README.md` in that
folder.

## Related skills

If they are installed in the project, use them together with this one:

- `archi-code-validation`: available validators, their options and `@Validations` rules.

## Import

```ts
import {
  AggregateRoot,
  CreatedAt,
  DomainException,
  Entity,
  EventBase,
  ExceptionCode,
  IdType,
  InternalErrorException,
  NumberType,
  Required,
  StringType,
  UpdatedAt,
} from '@archi-code/domain';
import type { EventMetadata, PrimitiveTypes } from '@archi-code/domain';
import { Validations } from '@archi-code/validation';
```

```js
const { Required, StringType } = require('@archi-code/domain');
```

## Rules

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
  `UuidType`/`IdType` store lowercase.
- A custom type extends `AbstractType<T>` and implements only `protected filter(value: unknown): T`
  (it receives input already known to be non-empty; it returns the value or throws
  `TypePrimitiveException`). If restricting an existing type is enough, extend it and use
  `@Validations`.
- Entities extend `Entity<Id>` and pass the id to `super(id)`; it is exposed as `readonly id`.
  Do not redeclare `id` (no `_id` + getter). `equals` compares class and id only.
- Aggregates extend `AggregateRoot<Id, Event>` and call `super(id, version)`: `0` for a new one,
  the stored version when loading it. The repository saves with optimistic concurrency (update only
  where the stored version is `aggregate.version`, write `version + 1`).
- `record(event)` is `protected`; `pullDomainEvents()` returns the events (typed `Event[]`) in order
  and empties the list. Pull them after persisting, to publish.
- Events extend `EventBase`, implement `eventName()` and call `super(aggregateId, metadata)`. The
  base sets `eventId` (UUID v4) and `occurredOn` (immutable `Date`); pass `{ eventId, occurredOn }`
  only when rebuilding an event read from an outbox or a broker. Serialize with `JSON.stringify` /
  `toJSON()` (`eventName`, `eventId`, `aggregateId`, ISO `occurredOn` and the payload).
- `PrimitiveTypes<T>` only sees **public** non-method members (it strips the leading `_`): expose
  VOs with public getters or public `readonly` properties. For an aggregate it includes `id` and
  `version`; child entities become their primitives; plain `string`/`number`/`boolean`/`Date`
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
- Map errors to HTTP or logs by `error.code` and the exported `ExceptionCode` enum
  (`ExceptionCode.AggregateNotFound`), or by `instanceof`: the built-in exceptions are recognized
  across the CJS and ESM builds.

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

Aggregate with typed id, version, child entities and events:

```ts
class OrderId extends IdType {}
class Sku extends Required(StringType) {}
class Units extends Required(NumberType) {}
class CustomerName extends Required(StringType) {}

class OrderLine extends Entity {
  constructor(
    id: IdType,
    readonly sku: Sku,
    readonly units: Units,
  ) {
    super(id);
  }
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
    version: number,
  ) {
    super(id, version);
  }

  static place(id: string, customer: string): Order {
    const order = new Order(
      new OrderId(id),
      new CustomerName(customer),
      [],
      false,
      UpdatedAt.now(),
      CreatedAt.now(),
      0,
    );
    order.record(new OrderPlaced(id, customer));
    return order;
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
      version: this.version,
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

Repository: wrap driver errors with their cause and save with optimistic concurrency:

```ts
async save(order: Order): Promise<void> {
  const { version, ...data } = order.toPrimitives();
  try {
    const result = await this.collection.updateOne(
      { _id: data.id, version },
      { $set: { ...data, version: version + 1 } },
      { upsert: version === 0 },
    );
    if (result.matchedCount === 0 && version > 0) {
      throw new OrderConcurrencyException(data.id);
    }
  } catch (error) {
    if (error instanceof DomainException) throw error;
    throw new InternalErrorException('saving order', { cause: error });
  }
  await this.bus.publish(order.pullDomainEvents());
}
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
      version: 0,
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

- Do not invent API: there is no `toPrimitives()` in the base classes, no generic `ValueObject`,
  no `setNow()`, `addItem()`, `setItem()` or `removeItem()`. When in doubt, check the installed
  README.
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
- Declaring `private readonly _id` + `get id()` in an entity or aggregate: the id goes to
  `super(id)`.
- Forgetting `version` when loading an aggregate (`super(id)` resets it to `0`) or not checking it
  when saving.
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
  constructor of an entity, aggregate or event.
- Importing `@Validations` from `@archi-code/domain`: it is imported from `@archi-code/validation`.
