# @archi-code/ddd

Domain-Driven Design building blocks for TypeScript, one entry point per layer:

| Entry point                      | Layer          | What it gives you                                                                                                                                     |
| -------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@archi-code/ddd/exceptions`     | Shared         | Exceptions of every layer with codes, causes and `instanceof` across builds                                                                           |
| `@archi-code/ddd/domain`         | Domain         | Value objects, `Required(...)`, `AggregateRoot`, `EventBase` and the repository contracts (`AggregateFinder`, `AggregateSaver`, `AggregateRemover`)   |
| `@archi-code/ddd/application`    | Application    | `UseCase`, `EventListener`, `@ListensTo` and the ports `EventBus` and `Clock`                                                                         |
| `@archi-code/ddd/infrastructure` | Infrastructure | `InMemoryRepository`, `AggregateMapper`, `EventDispatcher`, `InMemoryEventBus`, `DomainEventRegistry`, `HttpErrorMapper`, `SystemClock`, `FixedClock` |

The layers only depend inwards: `exceptions` imports nothing, `domain` imports only `exceptions`,
`application` imports `domain` and `exceptions`, and `infrastructure` imports all three. The
exceptions are a module of their own because every layer throws them: a use case wraps unknown
errors in an infrastructure exception, an adapter throws a domain `AggregateNotFoundException`. Import each file of your project from the layer it
belongs to and the same rule holds in your code (see [Architecture rules](#architecture-rules)). Conversions and validations come from
[`@archi-code/validation`](https://www.npmjs.com/package/@archi-code/validation). The package is
published with CJS and ESM builds.

## Installation

```bash
npm install @archi-code/ddd
```

- Node.js `>=24` (`engines` field).
- Runtime dependencies, installed by npm automatically: `@archi-code/validation` and `uuid`.
- To declare validations with `@Validations`, also install `@archi-code/validation` as a direct
  dependency of your project (the decorator is imported from it):

  ```bash
  npm install @archi-code/validation
  ```

### TypeScript decorators

`@Validations` and `@ListensTo` work with both TypeScript decorator modes:

- **Standard** (TypeScript 5+ without `experimentalDecorators`): no configuration needed.
- **Legacy**: `"experimentalDecorators": true` in `tsconfig.json`.

It does not need `emitDecoratorMetadata` or `reflect-metadata`. If you declare no validations, no
decorator setting is needed at all.

## Import

There is no root entry point: import from the layer.

```ts
// ESM
import { AggregateRoot, EventBase, IdType, Required, StringType } from '@archi-code/ddd/domain';
import { DomainException, ExceptionCode } from '@archi-code/ddd/exceptions';
import type { AggregateSaver } from '@archi-code/ddd/domain';
import { EventListener, ListensTo, UseCase } from '@archi-code/ddd/application';
import type { EventBus } from '@archi-code/ddd/application';
import { InMemoryRepository, HttpErrorMapper } from '@archi-code/ddd/infrastructure';
```

```js
// CommonJS
const { AggregateRoot, IdType } = require('@archi-code/ddd/domain');
const { UseCase } = require('@archi-code/ddd/application');
```

Types (`PrimitiveTypes`, `EventMetadata`, `AggregateSaver`…) are imported with `import type`. The
subpaths also resolve with `"moduleResolution": "node"` (through `typesVersions`).

Both builds can be loaded in the same process (for example a CommonJS application that uses an ESM
library built on this package): the exceptions of one build are `instanceof` the classes of the other
(see [Exceptions](#exceptions-archi-codedddexceptions)).

## Architecture rules

Every class of a project built on this package goes in exactly one layer. The table says where,
what it may import and what it must never do; the package itself is organized the same way.

| Class                                       | Layer          | Responsibility                                                                     | May depend on                                              | Never                                                                        |
| ------------------------------------------- | -------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Value object (`extends StringType`…)        | domain         | One concept of the business; converts and validates its own value                  | other value objects, `@archi-code/validation`, exceptions  | mutate, know about storage or transport                                      |
| Aggregate (`extends AggregateRoot`)         | domain         | Business rules and invariants; records an event for every fact                     | its value objects, child entities, events, domain services | read a repository, publish events, use `new Date()`                          |
| Composite value object (`Composite({...})`) | domain         | Several values that only make sense together (money, a date range, an order line)  | value objects, other composites                            | change, hold an id, be loaded or saved on its own                            |
| Child entity                                | domain         | A part of an aggregate with its own id and lifecycle                               | value objects                                              | be loaded or saved on its own                                                |
| Specification (`extends Specification`)     | domain         | A named business rule that validates, selects or builds; combinable                | value objects, aggregates, data already loaded             | read a repository, protect an aggregate invariant                            |
| Domain event (`extends EventBase`)          | domain         | A fact that happened, named in the past (`OrderPlaced`), with `static eventName`   | value objects (to validate its data)                       | carry behavior, reference infrastructure                                     |
| Repository contract (`AggregateFinder`…)    | domain         | What the domain needs to load, save or delete an aggregate, one role per interface | the aggregate                                              | be implemented in the domain, become an all-in-one `Repository`              |
| Domain service                              | domain         | A business rule that spans several aggregates or fits none                         | aggregates, value objects, repository contracts            | I/O, transactions, publishing events                                         |
| Use case (`extends UseCase`)                | application    | One business action: input → command of value objects → change one aggregate       | domain, application ports, exceptions                      | import another use case or a listener, persist or call the network by itself |
| Listener (`extends EventListener`)          | application    | What happens after an event: turns it into the input of one use case               | one use case (by constructor), the event                   | hold business rules, save aggregates, call several use cases                 |
| Port (`EventBus`, `Clock`)                  | application    | A technical capability the application needs, as a type                            | domain types                                               | contain code                                                                 |
| Adapter (repository, bus, mapper, clock…)   | infrastructure | Implements a contract with a database, a queue, a broker, HTTP or memory           | domain, application, exceptions, drivers                   | contain business rules                                                       |
| Wiring (controllers, workers, composition)  | infrastructure | Builds adapters, use cases and listeners and calls `execute`                       | everything                                                 | be imported by the domain or the application                                 |

Dependencies only point inwards: `domain` imports only `exceptions` (the shared module every layer
throws from), `application` imports `domain` and `exceptions`, and `infrastructure` imports all of
them. The application never imports infrastructure and the domain never imports the application.

Logic that two use cases share never goes in a use case: a business rule becomes a method of the
aggregate or a domain service, and a technical step becomes a port. Use cases never call each
other: when an action must follow another, the first records an event and a listener runs the
second.

Naming: use cases are a verb and a noun of the business (`PlaceOrder`, `ShipOrder`), never CRUD
or technical names (`UpdateOrder`, `OrderService`); events are facts in the past
(`OrderPlaced`, `PaymentCaptured`); listeners are `<Action>On<Event>`
(`ReserveStockOnOrderPlaced`), where `<Action>` names the use case they run.

# Domain layer: `@archi-code/ddd/domain`

## Value objects

Each value object wraps a value of one type and converts the input when it is constructed:

| Class             | Value     | Accepts                                                                                |
| ----------------- | --------- | -------------------------------------------------------------------------------------- |
| `StringType`      | `string`  | strings, finite numbers and booleans                                                   |
| `NumberType`      | `number`  | finite numbers and decimal strings (`'1.5'`, `' 2 '`, `'1e3'`)                         |
| `BooleanType`     | `boolean` | booleans, `1`/`0` and `'true'`/`'false'`/`'1'`/`'0'` (case-insensitive)                |
| `DateType`        | `Date`    | valid `Date` instances, ISO dates (UTC midnight) and ISO date-times with a zone        |
| `UuidType`        | `string`  | UUID strings, stored in lowercase                                                      |
| `EnumType<T>`     | `T`       | one option of the enum returned by `getEnum()` (abstract)                              |
| `JsonType<T>`     | `T`       | non-empty JSON objects and strings that contain one                                    |
| `ArrayType<Item>` | `Item[]`  | arrays (or strings with a JSON array); each item is built by `createItem()` (abstract) |
| `CreatedAt`       | `Date`    | like `DateType`, required; `CreatedAt.now()`                                           |
| `UpdatedAt`       | `Date`    | like `DateType`, required; `UpdatedAt.now()`                                           |
| `IdType`          | `string`  | like `UuidType`, required, and rejects the nil and max UUIDs                           |

The constructor is typed with the value's type (`new NumberType(1.5)`). The conversion acts at
runtime on data that arrives untyped, such as a JSON body:

```ts
import { BooleanType, DateType, NumberType, StringType } from '@archi-code/ddd/domain';

const body = JSON.parse(
  '{"price":"1.5","code":12,"active":"TRUE","at":"2024-01-31T10:00:00+02:00"}',
);

new NumberType(body.price).value; // 1.5
new StringType(body.code).value; // '12'
new BooleanType(body.active).value; // true
new DateType(body.at).toString(); // '2024-01-31T08:00:00.000Z'
new DateType('2018-03-23' as any).toString(); // '2018-03-23T00:00:00.000Z'
```

A value that cannot be converted throws `TypePrimitiveException`:

```ts
new NumberType('abc' as any);
// TypePrimitiveException: Validation Error: Expected a valid Number, but received "abc".
new NumberType(Infinity);
// TypePrimitiveException: Validation Error: Expected a valid Number, but received Infinity.
new BooleanType('yes' as any);
// TypePrimitiveException: Validation Error: Expected a valid Boolean, but received "yes".
new DateType('31/01/2024' as any);
// TypePrimitiveException: Validation Error: Expected a valid Date, but received "31/01/2024".
new DateType('2024-01-31T10:00:00' as any);
// TypePrimitiveException: Validation Error: Expected a valid Date, but received "2024-01-31T10:00:00".
```

A date-time without a zone is rejected because it does not say which instant it is (local time of
the browser? of the server?). Send it with `Z` or an offset, or send only the date.

### What each value object exposes

| Member          | Type                  | Description                                                                             |
| --------------- | --------------------- | --------------------------------------------------------------------------------------- |
| `value`         | `T \| null` (or `T`)  | The converted value; `T` if the type is required (`Required`)                           |
| `isNull`        | `boolean`             | `true` if there is no value                                                             |
| `toString()`    | `string`              | Text of the value; `''` if it is `null`. `DateType` gives ISO 8601, `JsonType` the JSON |
| `toJSON()`      | `T \| null` (or `T`)  | The value, so `JSON.stringify` writes the plain value                                   |
| `equals(other)` | `boolean`             | Same class and same value (dates by instant, arrays and objects by content)             |
| `validate()`    | `ValidationResult<T>` | Runs the `@Validations` rules again; never throws (always ok on a built value object)   |

```ts
class City extends StringType {}
class Country extends StringType {}

const city = new City('Huelva');
`Shipping to ${city}`; // 'Shipping to Huelva'
JSON.stringify({ city }); // '{"city":"Huelva"}'
city.equals(new City('Huelva')); // true
city.equals(new Country('Huelva')); // false: another concept, even with the same text
new NumberType().toString(); // ''
new StringType('   ').value; // null (blank strings count as empty)
new StringType(null).isNull; // true
```

### Optional by default, required with `Required(...)`

A value object is optional: it accepts the value, `null` or nothing, and holds `T | null`. Wrap it
with `Required(...)` to make it required: the constructor asks for exactly `T`, `value` is typed as
`T` and an empty value throws `RequiredValueException` on construction.

```ts
import { Required, StringType } from '@archi-code/ddd/domain';

class Name extends Required(StringType) {}
class Nickname extends StringType {}

const name: string = new Name('Ana').value; // 'Ana'
const nickname: string | null = new Nickname().value; // null

new Name(null); // type error and, at runtime:
// RequiredValueException: Validation Error: Name is required, but received null.
new Name('  ');
// RequiredValueException: Validation Error: Name is required, but received "  ".
```

`null`, `undefined` and blank strings count as empty in every type. A subclass of a required value
object is also required (`class FullName extends Name {}`). `Required(...)` accepts any subclass of
`AbstractType`, including your own and abstract ones (`Required(StatusType)`, `Required(Tags)`).

`Required(...)` also declares the `isRequired` validation, so the rules of a required type include
it too.

### Validations: always valid from the constructor

Validations are declared with `@Validations` from `@archi-code/validation` (that package's `is*`
validators or `custom` validations with their own function). The constructor runs them after the
conversion, so **a value object that exists is valid**: there is no invalid `Email` to pass around,
whether it was built by a use case, an aggregate, `fromPrimitives` or a test. When rules are broken
it throws `ValidationException` with **every** broken rule, each prefixed with the class name. An
optional, empty value object is built without running its rules.

```ts
import { Validations } from '@archi-code/validation';
import { NumberType, Required, StringType } from '@archi-code/ddd/domain';

@Validations([{ validator: 'isEmail' }])
class Email extends Required(StringType) {}

new Email('ana@example.com').value; // 'ana@example.com'
new Email('x');
// ValidationException: Validation failed, Email: Value does not satisfy isEmail
// error.errors: [{ field: null, message: 'Email: Value does not satisfy isEmail' }]

@Validations([{ validator: 'isLength', properties: { min: 3, max: 20 } }])
class Username extends StringType {}

new Username().value; // null: an optional, empty value runs no rule

@Validations([
  { validator: 'isInt', properties: { min: 0 } },
  { custom: 'isEven', fn: (v) => Number(v) % 2 === 0, message: 'Must be even' },
])
class Quantity extends NumberType {}

new Quantity(-3);
// ValidationException: Validation failed, Quantity: Value does not satisfy isInt, Quantity: Must be even
```

A subclass inherits its parent's validations; if it declares the same validation, it replaces it.
Validator names and their `properties` are in the `@archi-code/validation` documentation.
`validate()` runs the rules again and returns a frozen `{ ok, value, errors }` without throwing;
on a value object that was built it is always `ok`.

### Building every value object of an input at once: `ValueObjects.build`

The constructor of each value object stops at its own errors. To report **every field** of an
input (a form, a JSON body, a message) at once, build the value objects with
`ValueObjects.build`: it runs every factory, even after one fails, and throws one
`ValidationException` whose `errors` name the field of each problem. It collects the three ways a
value can be wrong: empty in a required type (`RequiredValueException`), not convertible
(`TypePrimitiveException`) and broken rules (`ValidationException`), plus any other
`DomainException` a factory throws. Any other error is a bug and goes through untouched.
`ValueObjects.buildList` does the same for a list and names each item by its position, so nested
inputs get paths such as `lines.1.units`.

```ts
import { IdType, NumberType, Required, StringType, ValueObjects } from '@archi-code/ddd/domain';

class OrderId extends IdType {}
class Sku extends Required(StringType) {}

@Validations([
  { validator: 'isInt', properties: { min: 1, max: 20 }, message: 'From 1 to 20 units' },
])
class Units extends Required(NumberType) {}

const command = ValueObjects.build({
  orderId: () => new OrderId(input.orderId),
  email: () => new Email(input.email),
  lines: () =>
    ValueObjects.buildList(input.lines, (line) =>
      ValueObjects.build({ sku: () => new Sku(line.sku), units: () => new Units(line.units) }),
    ),
});
// command: { orderId: OrderId; email: Email; lines: { sku: Sku; units: Units }[] }

// with input = { orderId: 'x', email: 'ana', lines: [{ sku: 'TORCH-01', units: 2 }, { sku: '', units: 0 }] }:
// ValidationException, error.errors:
// [
//   { field: 'orderId', message: 'Validation Error: Expected a valid UUID, but received "x".' },
//   { field: 'email', message: 'Email: Value does not satisfy isEmail' },
//   { field: 'lines.1.sku', message: 'Validation Error: Sku is required, but received "".' },
//   { field: 'lines.1.units', message: 'Units: From 1 to 20 units' },
// ]
```

`HttpErrorMapper` answers it with a 422 whose body carries the same `errors`, so a client can mark
each input.

### Which layer validates what

The input that reaches a use case is not validated yet, and that is on purpose: every adapter
(HTTP, a queue, a CLI, a test) goes through the use case, so the rules live in one place.

| What                                                      | Where                                                                       |
| --------------------------------------------------------- | --------------------------------------------------------------------------- |
| The shape of the request (it parses, a field is a string) | The input adapter (controller, consumer); no business rule                  |
| One value: required, convertible, its rules               | The value object's constructor, through `ValueObjects.build` in `toCommand` |
| Rules over several values of one aggregate (invariants)   | The aggregate's methods, with a `DomainException`                           |
| Rules over several aggregates                             | A domain service                                                            |
| Whether the caller may run the action                     | The use case (application)                                                  |

Do not repeat a value object's rule in the request schema: the adapter checks that the email is a
string, `Email` checks that it is an email. Invariants run after the fields are valid, because they
need valid value objects to be evaluated.

### Immutability

A value object never changes after construction (`_value` is `readonly`); to change it, build a new
one:

- `DateType` (and `CreatedAt`/`UpdatedAt`) holds a date whose setters throw:

  ```ts
  new DateType(new Date('2024-01-31T10:00:00Z')).value!.setFullYear(2000);
  // TypeError: Cannot call setFullYear: the date is immutable
  ```

- `JsonType` and `ArrayType` hold deeply frozen copies (`Object.isFrozen(vo.value)` is `true`).
- `ArrayType.withItem()` and `withoutItem()` return a **new** instance and leave the original
  untouched, so a value object shared by two aggregates never changes under one of them.
- To touch an `UpdatedAt`, replace it: `this._updatedAt = UpdatedAt.now()`.

### `UuidType` and `IdType`

```ts
import { IdType, UuidType } from '@archi-code/ddd/domain';

UuidType.random(); // random UUID v4
UuidType.fromValue('ana@example.com'); // '4badeee4-791f-51e2-a027-2c59bc6f8144' (v5, deterministic)
UuidType.fromValue('ana@example.com', '6ba7b811-9dad-11d1-80b4-00c04fd430c8'); // v5 with another namespace

new UuidType('abc');
// TypePrimitiveException: Validation Error: Expected a valid UUID, but received "abc".

const id = new IdType(IdType.random()); // required
const orderId = OrderId.generate(); // class OrderId extends IdType {}: a new OrderId with a random id
new IdType('9B2F6C1E-4D3A-4F8B-A1C2-3E4D5F6A7B8C').value; // '9b2f6c1e-4d3a-4f8b-a1c2-3e4d5f6a7b8c'
new IdType('00000000-0000-0000-0000-000000000000');
// TypePrimitiveException: Validation Error: Expected a valid Id, but received "00000000-0000-0000-0000-000000000000".
```

`fromValue(value, namespace?)` uses the DNS namespace by default
(`6ba7b810-9dad-11d1-80b4-00c04fd430c8`). Both types store the UUID in lowercase, so an id typed in
capitals equals the stored one. `generate()` builds a value object of the class you call it on
(`OrderId.generate()` is an `OrderId`).

### `CreatedAt` and `UpdatedAt`

Required dates:

```ts
import { CreatedAt, UpdatedAt } from '@archi-code/ddd/domain';

const createdAt = CreatedAt.now();
let updatedAt = UpdatedAt.now();
updatedAt = UpdatedAt.now(); // a new timestamp is a new value object
createdAt.value; // Date

CreatedAt.now(clock); // takes the instant from any { now(): Date }, such as a Clock port
```

Pass a `Clock` (see the application layer) to `now(clock)` so use cases and tests get a known
time.

### `EnumType`

Abstract class: implement `getEnum()` returning the enum. It accepts exactly one of its options;
for a numeric enum it also accepts the option written as decimal text (`'1'` from a query string),
but not other spellings (`' 1'`, `'1e0'`) nor the key name.

```ts
import { EnumType } from '@archi-code/ddd/domain';

enum Status {
  ACTIVE = 'active',
  BLOCKED = 'blocked',
}

class StatusType extends EnumType<Status> {
  protected getEnum(): typeof Status {
    return Status;
  }
}

new StatusType(Status.ACTIVE).value; // 'active'
new StatusType('ACTIVE' as Status);
// TypePrimitiveException: Validation Error: Expected one of [active, blocked], but received "ACTIVE".

enum Level {
  LOW = 1,
  HIGH = 2,
}

class LevelType extends EnumType<Level> {
  protected getEnum(): typeof Level {
    return Level;
  }
}

new LevelType(Level.HIGH).value; // 2
new LevelType('1' as any).value; // 1
new LevelType('3' as any);
// TypePrimitiveException: Validation Error: Expected one of [1, 2], but received "3".
```

### `JsonType`

Holds a non-empty JSON object (frozen copy). `T` must extend `JsonTypeValue`
(`Record<string, any>`).

```ts
import { JsonType } from '@archi-code/ddd/domain';
import type { JsonTypeValue } from '@archi-code/ddd/domain';

interface Address extends JsonTypeValue {
  city: string;
  zip: string;
}

class AddressType extends JsonType<Address> {}

const address = new AddressType({ city: 'Huelva', zip: '21001' });
address.value; // { city: 'Huelva', zip: '21001' }
address.toString(); // '{"city":"Huelva","zip":"21001"}'
address.equals(new AddressType({ zip: '21001', city: 'Huelva' })); // true (key order does not matter)
new AddressType('{"city":"Huelva","zip":"21001"}' as any).value; // { city: 'Huelva', zip: '21001' }

new JsonType({});
// TypePrimitiveException: Validation Error: Expected a valid Json, but received {}.
new JsonType([1] as any);
// TypePrimitiveException: Validation Error: Expected a valid Json, but received [1].
```

### `ArrayType`

Abstract class: implement `createItem(value)` returning the value object of each item. The array
holds the values already converted by each item; `items` rebuilds the value objects. Items are
compared by value (`hasItem`, `withoutItem`), also for dates and JSON items. `withItem` and
`withoutItem` return a new instance of the same class (built with `new YourClass(values)`, so keep the
single-value constructor).

```ts
import { Validations } from '@archi-code/validation';
import { ArrayType, Required, StringType } from '@archi-code/ddd/domain';

@Validations([{ validator: 'isLength', properties: { min: 2 } }])
class Tag extends Required(StringType) {}

class Tags extends ArrayType<Tag> {
  protected createItem(value: unknown): Tag {
    return new Tag(value as string);
  }
}

const tags = new Tags(['ddd', 'ts']);
tags.value; // ['ddd', 'ts']
tags.items; // [Tag, Tag]
tags.hasItem('ts'); // true
const more = tags.withItem('node'); // Tags ['ddd', 'ts', 'node']
const fewer = more.withoutItem('ts'); // Tags ['ddd', 'node']
tags.value; // ['ddd', 'ts'] (unchanged)
fewer.toString(); // 'ddd, node'
const unique = tags.hasItem('ddd') ? tags : tags.withItem('ddd'); // add only if missing

new Tags('["a1","b2"]' as any).value; // ['a1', 'b2']
new Tags('abc' as any);
// TypePrimitiveException: Validation Error: Expected a valid Array, but received "abc".
```

An `ArrayType` builds every item and reports, at once, the rules of the list (`field: null`) and
the errors of each item with its position (`field: '1'`, from 0):

```ts
new Tags(['ok', 'x', '']);
// ValidationException, error.errors:
// [
//   { field: '1', message: 'Tag: Value does not satisfy isLength' },
//   { field: '2', message: 'Validation Error: Tag is required, but received "".' },
// ]
```

### Custom value objects with `AbstractType`

For a new type, extend `AbstractType<T>` and implement `filter(value)`: it receives the input
already known to be non-empty, returns the converted value and throws `TypePrimitiveException` if it
is not valid. Empty input (`null`, `undefined`, blanks) and `Required(...)` are handled by the base
class.

```ts
import { AbstractType, Required } from '@archi-code/ddd/domain';
import { TypePrimitiveException } from '@archi-code/ddd/exceptions';

class Percentage extends AbstractType<number> {
  protected filter(value: unknown): number {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      throw new TypePrimitiveException('Percentage', value);
    }
    return n;
  }
}

new Percentage(40).value; // 40
new Percentage(140);
// TypePrimitiveException: Validation Error: Expected a valid Percentage, but received 140.

class Discount extends Required(Percentage) {}
```

To restrict an existing type, it is enough to extend it and declare `@Validations`, like `Email`.

### Composite value objects: `Composite({...})`

A concept made of several values that only make sense together (an amount and its currency, a
date range, an address, an order line) is one value object, not loose fields of an aggregate nor a
child entity [IDDD ch. 6]. `Composite(schema)` builds its base class from a schema that names the
class of each field:

| Field in the schema  | Holds                      | Primitive            |
| -------------------- | -------------------------- | -------------------- |
| A value object class | An instance of that class  | Its value            |
| A composite class    | An instance of that class  | Its primitives       |
| `[ItemClass]`        | A frozen list of instances | A list of primitives |

```ts
import { Validations } from '@archi-code/validation';
import { Composite, DateType, NumberType, Required, StringType } from '@archi-code/ddd/domain';

class Cents extends Required(NumberType) {}

@Validations([{ validator: 'isIn', properties: { values: ['EUR', 'USD'] } }])
class Currency extends Required(StringType) {}

class Money extends Composite({ amount: Cents, currency: Currency }) {
  add(other: Money): Money {
    return new Money({
      amount: new Cents(this.amount.value + other.amount.value),
      currency: this.currency,
    });
  }
}

const price = new Money({ amount: new Cents(1250), currency: new Currency('EUR') });
price.amount; // Cents (read-only)
price.add(price).toPrimitives(); // { amount: 2500, currency: 'EUR' }
price.equals(Money.fromPrimitives({ amount: 1250, currency: 'EUR' })); // true
JSON.stringify(price); // '{"amount":1250,"currency":"EUR"}'
```

- **The constructor** takes value objects only. A missing field throws `RequiredValueException`
  (`Money.currency is required`) and an instance of another class `TypePrimitiveException`, even
  when TypeScript accepts it because both classes have the same shape.
- **Rules over several fields** are `@Validations` `custom` rules on the composite class. They run
  in the constructor, once every field is valid, and `fn` receives the built composite. A broken
  rule throws `ValidationException` (`field: null`), like any value object:

  ```ts
  class StartDate extends Required(DateType) {}
  class EndDate extends Required(DateType) {}

  @Validations([
    {
      custom: 'endsAfterItStarts',
      fn: (range) => (range as Promotion).end.value >= (range as Promotion).start.value,
      message: 'A promotion cannot end before it starts',
    },
  ])
  class Promotion extends Composite({ start: StartDate, end: EndDate }) {}

  Promotion.fromPrimitives({ start: '2026-06-20', end: '2026-03-20' } as any);
  // ValidationException: Validation failed, Promotion: A promotion cannot end before it starts
  ```

- **It never changes**: the instance and its lists are frozen and its fields are read-only, so
  behavior returns a new instance. Do not add instance fields to the subclass.
- **`X.fromPrimitives(data)`** rebuilds it from stored or received data, converting each primitive
  like the value objects do, and reports every invalid field with its path, also nested ones. It
  works inside `ValueObjects.build`, so a command reports `price.amount`:

  ```ts
  class Sku extends Required(StringType) {}
  class Units extends Required(NumberType) {}
  class OrderLine extends Composite({ sku: Sku, units: Units, unitPrice: Money }) {}
  class Cart extends Composite({ lines: [OrderLine] }) {}

  Cart.fromPrimitives({
    lines: [{ sku: '', units: 'two', unitPrice: { amount: 1250, currency: 'GBP' } }],
  } as any);
  // ValidationException, error.errors:
  // [
  //   { field: 'lines.0.sku', message: 'Validation Error: Sku is required, but received "".' },
  //   { field: 'lines.0.units', message: 'Validation Error: Expected a valid Number, but received "two".' },
  //   { field: 'lines.0.unitPrice.currency', message: 'Currency: Value does not satisfy isIn' },
  // ]
  ```

- **`equals(other)`** compares the class and every field (dates by instant, lists in order):
  a `Price` and a `Money` with the same fields are different. **`toPrimitives()`** gives plain data
  for repositories (dates stay `Date`); `JSON.stringify` writes ISO dates.
- **In an aggregate**, a composite is a field like any value object: `AggregateMapper` accepts it,
  `PrimitiveTypes<Order>` types it as its primitives, and an optional one is a `Money | null`
  field. Write `this.price.toPrimitives()` in `toPrimitives()` and `Money.fromPrimitives(...)` in
  `fromPrimitives`. Fields inside a composite are always present.

## Specifications

A business rule with a name ("eligible for express shipping", "customer in arrears") that is used in
several places or combined with others is a `Specification<T>` [IDDD ch. 5]: it validates,
selects or builds, and combines with `and`, `or` and `not` (each returns a `Specification<T>`, so
they keep combining; `and`/`or` stop at the first answer that decides).

```ts
import { Specification } from '@archi-code/ddd/domain';

class ShipsToThePeninsula extends Specification<Order> {
  isSatisfiedBy(order: Order): boolean {
    return order.destination.zone.value === 'PENINSULA';
  }
}

class InCentralStock extends Specification<Order> {
  constructor(private readonly stock: StockSnapshot) {
    super();
  }

  isSatisfiedBy(order: Order): boolean {
    return order.lines.every((line) => this.stock.covers(line.sku, line.units));
  }
}

const expressShipping = new ShipsToThePeninsula().and(new InCentralStock(stock));
expressShipping.isSatisfiedBy(order); // validate
orders.filter((order) => expressShipping.isSatisfiedBy(order)); // select
```

A specification receives the data it needs already loaded (a snapshot of the stock), never a
repository. It does not protect the invariants of an aggregate: those stay in the aggregate.

## Aggregates and domain events

- `AggregateRoot<Id = IdType, Event = EventBase>`: abstract class for aggregates. `new (id)` stores
  `readonly id`; `equals(other)` is true for the same class and an equal id, whatever the other
  attributes are. `Id` may be any value object (`IdType`, a `Required(StringType)` code…); `record(event)` is `protected`; `pullDomainEvents()` returns the events typed as `Event[]`, in order, and empties
  the list. Pending events are not an enumerable property: they never show up in
  `JSON.stringify(aggregate)`, `{ ...aggregate }` or `Object.keys`.
- Every aggregate has a `version` for optimistic concurrency (see
  [Optimistic concurrency](#optimistic-concurrency)): `0` for a new one, the stored version for a
  loaded one, one more after each successful save. The aggregate does nothing with it: it keeps
  calling `super(id)`, and the version is neither a field, nor in its primitives, nor in its JSON.
  Only repositories touch it, with `restoreVersion(version)` when they load and `markPersisted()`
  after they save.
- Parts of an aggregate are composite value objects when nobody looks them up by an id of their
  own (the lines of an order). A child entity (a part with its own id and lifecycle inside the
  aggregate) is a plain class with a value object id: the aggregate root is the only one with a
  base class, and the only one repositories load and save.
- `EventBase`: abstract class for events; declare `static readonly eventName = '<context>.<fact>'`
  (listeners and registries refer to the event by its class, without an instance; `eventName()`
  returns it, and a subclass inherits it). Creating an event whose class has no non-blank
  `eventName` throws `InternalErrorException`. `new (aggregateId,
metadata?)` sets `aggregateId`, a new `eventId` (UUID v4) and an immutable `occurredOn`. Pass
  `{ clock }` (any `{ now(): Date }`, such as the `Clock` port) to take the moment from it; without
  a clock it is the system time. When you rebuild an event read from an outbox or a broker, pass
  `{ eventId, occurredOn }` (`Date` or ISO string with zone) to keep them; a stored `occurredOn`
  wins over a clock. The clock is not kept in the event nor in its JSON. `toJSON()` gives `{ eventName, eventId, aggregateId, occurredOn
(ISO), ...payload }`.

```ts
import { AggregateRoot, EventBase, IdType } from '@archi-code/ddd/domain';
import type { EventMetadata } from '@archi-code/ddd/domain';

class OrderId extends IdType {}

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

class Order extends AggregateRoot<OrderId, OrderPlaced> {
  static place(id: string, customer: string): Order {
    const order = new Order(new OrderId(id));
    order.record(new OrderPlaced(id, customer));
    return order;
  }
}

const order = Order.place('9b2f6c1e-4d3a-4f8b-a1c2-3e4d5f6a7b8c', 'Ana');
const [placed] = order.pullDomainEvents(); // OrderPlaced[]
order.pullDomainEvents(); // []
JSON.stringify(placed);
// {"eventName":"order.placed","eventId":"…","aggregateId":"9b2f6c1e-…","occurredOn":"2026-10-17T10:00:00.000Z","customer":"Ana"}
```

### Primitive types

Types to go from an aggregate (or any class with value objects) to its plain values:

| Type                       | Result                                                                                                                                                                                                                                |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PrimitiveType<T>`         | Value object → its value (`T['value']`); enum → `string`/`number`; arrays item by item; `null` → `null`; any other object (a child entity) → its `PrimitiveTypes`; raw `string`/`number`/`boolean`/`Date` and anything else → `never` |
| `PrimitiveTypes<T>`        | Object with each public non-method property of `T` as `PrimitiveType`, without the leading `_` of the name                                                                                                                            |
| `DataTypes<T>`             | `Partial<PrimitiveTypes<T>>`                                                                                                                                                                                                          |
| `Properties<T>`            | The public properties of `T` that are not methods                                                                                                                                                                                     |
| `PropertiesData<T>`        | `Required<Properties<T>>`                                                                                                                                                                                                             |
| `MutablePropertiesData<T>` | `PropertiesData<T>` without `readonly`                                                                                                                                                                                                |
| `Methods<T>`               | Union of the names of the methods of `T`                                                                                                                                                                                              |
| `MethodsAndProperties<T>`  | `{ [key in keyof T]: T[key] }`                                                                                                                                                                                                        |
| `RequiredType<C>`          | Type of the class returned by `Required(C)`                                                                                                                                                                                           |
| `JsonTypeValue`            | `Record<string, any>`                                                                                                                                                                                                                 |

`PrimitiveTypes` only sees **public** members (`keyof`): `private` or `protected` properties do not
appear. Expose the value objects with public `readonly` properties or with getters (see the full
example). For an aggregate it includes `id`, and child entities become their own primitives.

```ts
import type { DataTypes, PrimitiveTypes } from '@archi-code/ddd/domain';

class Person {
  constructor(
    readonly _name: Name,
    readonly nickname: Nickname,
  ) {}
}

type PersonPrimitives = PrimitiveTypes<Person>; // { name: string; nickname: string | null }
type PersonData = DataTypes<Person>; // { name?: string; nickname?: string | null }
```

## Repository contracts

The domain declares what it needs to load, save and delete aggregates; infrastructure implements
it (types only, nothing to instantiate). The repository is split by role, following the interface
segregation principle:

```ts
interface AggregateFinder<Aggregate extends AggregateRoot<any, any>> {
  findById(id: Aggregate['id']): Promise<Aggregate | null>;
}

interface AggregateSaver<Aggregate extends AggregateRoot<any, any>> {
  save(aggregate: Aggregate): Promise<void>;
}

interface AggregateRemover<Aggregate extends AggregateRoot<any, any>> {
  delete(id: Aggregate['id']): Promise<void>;
}
```

A use case asks only for the roles it uses: registering needs `AggregateSaver<User>`, a query needs
`AggregateFinder<User>`, renaming needs `AggregateFinder<User> & AggregateSaver<User>`. Its
dependencies then say what it can do, and a test double implements one method. There is no
all-in-one `Repository` contract: the adapter implements the roles it supports
(`class MongoUserRepository implements AggregateFinder<User>, AggregateSaver<User>, AggregateRemover<User>`)
and the same instance is passed to every use case.

### Optimistic concurrency

Two users load the same order, both change it and both save: without a check, the second save
silently erases the first. `AggregateRoot` carries the version that prevents it, and every
repository follows the same contract:

| Moment                       | The repository                                                                                            |
| ---------------------------- | --------------------------------------------------------------------------------------------------------- |
| Load                         | Rebuilds with `mapper.fromPrimitives(row, storedVersion)`, so `aggregate.version` is the version it read  |
| Save a new aggregate         | `aggregate.version` is `0`: inserts with version `1`; if the id already exists, it is a conflict          |
| Save an existing aggregate   | Writes only where the stored version still equals `aggregate.version`, and stores `aggregate.version + 1` |
| Nothing written (stale data) | Throws `ConcurrencyException(mapper.aggregateName, id, aggregate.version)` (HTTP 409)                     |
| Written                      | Calls `aggregate.markPersisted()`, so the same object can be changed and saved again                      |

The version lives next to the primitives (a `version` column or field), never inside them. After a
`ConcurrencyException`, reload the aggregate and run the command again (only if it is safe to
repeat against the new state), or tell the user that someone else changed it. If a transaction is
rolled back after `markPersisted()`, discard the object and load it again.

```ts
import type { AggregateFinder, AggregateSaver } from '@archi-code/ddd/domain';
import { ConcurrencyException, InternalErrorException } from '@archi-code/ddd/exceptions';
import { AggregateMapper } from '@archi-code/ddd/infrastructure';

class MongoOrderRepository implements AggregateFinder<Order>, AggregateSaver<Order> {
  private readonly mapper = AggregateMapper.of(Order);

  async findById(id: OrderId): Promise<Order | null> {
    const document = await this.collection.findOne({ _id: id.value });
    if (document === null) {
      return null;
    }
    const { _id, version, ...primitives } = document;
    return this.mapper.fromPrimitives(primitives, version);
  }

  async save(order: Order): Promise<void> {
    const data = { ...this.mapper.toPrimitives(order), version: order.version + 1 };
    const written =
      order.version === 0
        ? await this.insert(data)
        : (await this.collection.replaceOne({ _id: data.id, version: order.version }, data))
            .matchedCount === 1;
    if (!written) {
      throw new ConcurrencyException(this.mapper.aggregateName, order.id.value, order.version);
    }
    order.markPersisted();
  }

  private async insert(data: OrderDocument): Promise<boolean> {
    try {
      await this.collection.insertOne({ _id: data.id, ...data });
      return true;
    } catch (error) {
      if (isDuplicateKey(error)) {
        return false;
      }
      throw new InternalErrorException('saving order', { cause: error });
    }
  }
}
```

In SQL the same check is `UPDATE orders SET …, version = version + 1 WHERE id = $1 AND version = $2`
and zero updated rows means a conflict.

# Application layer: `@archi-code/ddd/application`

## `UseCase<Input, Command, Output>`

Two rules shape every use case:

- **It does one thing.** One business action per class and one `handle`: it changes one aggregate
  and saves it once. A flow with several actions is several use cases, chained by domain events or
  called in order by whoever orchestrates them, never one use case whose input switches between
  behaviors.
- **It has a business name.** A verb and a noun a domain expert would say: `PlaceOrder`,
  `ShipOrder`, `CancelSubscription`, `ApproveRefund`. Not `OrderService`, `UpdateOrder`,
  `SaveUser` or `ProcessData`.

A use case has two steps, and `execute(input)` (which always returns a promise) runs them in
order:

1. `protected toCommand(input: Input): Command` builds the value objects the action needs with
   `ValueObjects.build({ orderId: () => new OrderId(input.orderId), email: () => new Email(input.email) })`
   (one value object alone can be built with `new`). If any field is invalid it throws one
   `ValidationException` listing every field, and `handle` never runs.
2. `protected handle(command: Command)` (sync or async) coordinates the action with value objects
   only: load the aggregate, call its business method, save it, publish
   `aggregate.pullDomainEvents()`.

Errors of both steps are treated the same way:

- Exceptions of the package (`DomainException`, `ValidationException`, `ApplicationException`,
  `AggregateNotFoundException`…) pass through as they are, so the caller can map them.
- Anything else (a driver error, a `TypeError`, a thrown string) is wrapped in
  `InternalErrorException` with the original as `cause` and the use case name in the message:
  `Failed, internal error: PlaceOrder: connection reset`.

`UseCase` does nothing else: loading, checking, saving and publishing are written in `handle`,
so every step of the use case is visible in one place:

```ts
class ShipOrder extends UseCase<{ orderId: string }, OrderId, void> {
  constructor(
    private readonly orders: AggregateFinder<Order> & AggregateSaver<Order>,
    private readonly bus: EventBus<OrderEvent>,
  ) {
    super();
  }

  protected toCommand(input: { orderId: string }): OrderId {
    return new OrderId(input.orderId);
  }

  protected async handle(orderId: OrderId): Promise<void> {
    const order = await this.orders.findById(orderId);
    if (order === null) {
      throw new AggregateNotFoundException('Order', orderId.value);
    }
    order.ship();
    await this.orders.save(order);
    await this.bus.publish(order.pullDomainEvents());
  }
}
```

Save before publishing, and publish what `pullDomainEvents()` returns, so a failed save publishes
nothing and events are never sent twice. A command with several values is a small interface of
value objects (`interface PlaceOrderCommand { orderId: OrderId; customer: CustomerName }`); a
use case never imports another use case.

## Listeners: `EventListener` and `@ListensTo`

A listener is what the application does when an event happens. It extends
`EventListener<Event>`, implements `handle(event)` (sync or async) and is subscribed with
`@ListensTo(EventClass)`, which stores the event's `static eventName` on the listener class. A
listener listens to exactly one event (decorating it twice throws `ApplicationException`) and any
number of listeners may listen to the same event. A subclass does not inherit the subscription.

Its name is `<Action>On<Event>`, and its body only turns the event into the input of the one use
case it receives by constructor:

```ts
import { EventListener, ListensTo } from '@archi-code/ddd/application';

@ListensTo(OrderPlaced)
class ReserveStockOnOrderPlaced extends EventListener<OrderPlaced> {
  constructor(private readonly reserveStock: ReserveStock) {
    super();
  }

  async handle(event: OrderPlaced): Promise<void> {
    await this.reserveStock.execute({ orderId: event.aggregateId });
  }
}
```

`ListensTo.eventOf(listener)` returns the event name a listener instance is subscribed to (and
throws `ApplicationException` when its class has no `@ListensTo`). The mark is kept under a
`Symbol.for` key, so a listener decorated with one build (CJS or ESM) is read by the other.
Neither the aggregates nor the use cases know the listeners: only infrastructure (the
`EventDispatcher`) brings them together.

## Ports

Technical capabilities the application needs and infrastructure implements (types only):

```ts
interface EventBus<Event extends EventBase = EventBase> {
  publish(events: readonly Event[]): Promise<void>;
}

interface Clock {
  now(): Date;
}
```

The application only knows `EventBus.publish`: whether events go to memory, a queue, an outbox
table or a broker is decided in infrastructure.

# Infrastructure layer: `@archi-code/ddd/infrastructure`

Ready adapters for tests, prototypes and the edges of an API:

| Export                                          | What it is                                                                                            |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `InMemoryRepository(AggregateMapper.of(Order))` | Finder, saver and remover over a `Map` of primitives and versions; checks versions; adds `findAll()`  |
| `EventDispatcher(listeners?)`                   | Groups listeners by their `@ListensTo` event; `add(listener)`, `listenersOf(name)`, `dispatch(event)` |
| `InMemoryEventBus(dispatcher?)`                 | `EventBus` that records `published` and hands every event to its dispatcher, in the same process      |
| `DomainEventRegistry`                           | `register(EventClass, factory)` and `fromJSON(json)`: rebuilds events read from an outbox or a broker |
| `HttpErrorMapper(statusByCode?)`                | `map(error)` → `{ status, body: { code, message, errors? } }` (`errors`: `{ field, message }[]`)      |
| `SystemClock`, `FixedClock(at)`                 | `Clock` with the real time, and a test clock with `set(at)` and `advance(ms)`                         |

`InMemoryRepository` follows the [optimistic concurrency](#optimistic-concurrency) contract like a
real adapter: it stores a copy of the primitives with their version, rejects a stale save (or a new
aggregate whose id is already stored) with `ConcurrencyException`, and calls `markPersisted()` on
success. It finds ids whatever their case and returns copies, so changing a loaded aggregate does
not touch the store until you save it.

```ts
const orders = new InMemoryRepository(AggregateMapper.of(Order));
await orders.save(Order.place(new OrderId(id), new CustomerName('Ana')));

const byAna = await orders.findById(new OrderId(id)); // version 1
const byLuis = await orders.findById(new OrderId(id)); // version 1
byAna.ship();
await orders.save(byAna); // stored as version 2; byAna.version is 2
byLuis.addLine(new Sku('TORCH-01'), new Units(1));
await orders.save(byLuis);
// ConcurrencyException: Order with ID … was changed by someone else: expected version 1.
```

`HttpErrorMapper` statuses, overridable by code (`new HttpErrorMapper({ ORD001: 403 })`):

| Error                                               | Status |
| --------------------------------------------------- | ------ |
| `TypePrimitiveException`, `RequiredValueException`  | 400    |
| `AggregateNotFoundException`                        | 404    |
| `ConcurrencyException`, any other `DomainException` | 409    |
| `ValidationException` (body includes `errors`)      | 422    |
| any other `ApplicationException`                    | 400    |
| `InfrastructureException` and anything unknown      | 500    |

Every 5xx answer has the message `Internal server error`: messages of infrastructure errors (SQL,
hosts, secrets…) never reach the client. Unknown errors get the code `E000`.

`EventDispatcher` runs every listener of an event one after another, in the order they were
added, and rejects with the first error. It is the piece every distribution strategy shares:
`InMemoryEventBus` dispatches right after `publish`, and an outbox worker or a queue consumer
rebuilds each message with `DomainEventRegistry` and dispatches it:

```ts
import {
  DomainEventRegistry,
  EventDispatcher,
  InMemoryEventBus,
} from '@archi-code/ddd/infrastructure';

const listeners = new EventDispatcher([
  new ReserveStockOnOrderPlaced(reserveStock),
  new NotifyCustomerOnOrderPlaced(notifyCustomer),
]);

const bus = new InMemoryEventBus<OrderEvent>(listeners); // in-process delivery

queue.onMessage(async (body) => listeners.dispatch(events.fromJSON(body))); // queue delivery
```

`EventDispatcher` throws `ApplicationException` for a listener without `@ListensTo`, when the
application starts.

```ts
import { DomainEventRegistry, HttpErrorMapper } from '@archi-code/ddd/infrastructure';

const events = new DomainEventRegistry<OrderEvent>().register(
  OrderPlaced,
  (json) => new OrderPlaced(json.aggregateId, json.customer as string, json),
);
const event = events.fromJSON(outboxRow.payload); // OrderPlaced with the stored eventId and occurredOn

const errors = new HttpErrorMapper({ ORD001: 403 });
app.use((error, req, res, next) => {
  const { status, body } = errors.map(error);
  res.status(status).json(body);
});
```

`fromJSON` throws `UnknownEventException` for a name nobody registered and
`InternalErrorException` for text that is not a JSON object or has no `eventName`.

## Persisting aggregates with `AggregateMapper`

The domain knows nothing about persistence: a repository receives an aggregate and stores it.
`AggregateMapper` lives here, in infrastructure, next to the repositories that use it. It relies on
two things every aggregate has: everything it stores is a **value object** (no raw `string`,
`number`, `boolean` or `Date` fields in its state), and it exposes `toPrimitives()` and
`static fromPrimitives()`. The repository never reads the aggregate's fields: it only calls the
mapper. Follow these rules for every
aggregate:

1. **State is value objects.** Each persisted field is a value object, a list of value objects or a
   child entity (a plain class) whose fields are value objects too. A flag is
   `class Shipped extends Required(BooleanType) {}`, never `boolean`; a moment is a `DateType` /
   `CreatedAt`, never `Date`.
2. **Private field + public getter with the same name without `_`** (`private _customer` +
   `get customer()`), or a public `readonly customer`. No private state without its getter: the
   primitives use those names.
3. **Private constructor and two factories**: a business one (`Order.place(...)`) that validates
   its invariants and records events, and `static fromPrimitives(primitives: PrimitiveTypes<Order>)`
   that rebuilds it from stored data, building each value object from its primitive and recording no
   event. Because value objects validate in their constructor, a corrupt row fails right there
   instead of entering the model.
4. **`toPrimitives(): PrimitiveTypes<Order>`** returns only plain data: `vo.value` of each value
   object and the primitives of each child entity, never a value object.
5. **The repository receives `AggregateMapper.of(Order)`** and never touches the aggregate's fields.
6. **One round-trip test per aggregate**: `Order.fromPrimitives(order.toPrimitives()).toPrimitives()`
   equals `order.toPrimitives()`.

The compiler enforces rules 1 and 4 on what is public: a getter that returns a raw `boolean` makes
that key `never` in `PrimitiveTypes<Order>`, so `toPrimitives()` does not compile. `AggregateMapper`
checks the rest at runtime on every `toPrimitives`, throwing `InternalErrorException`:

| Mistake                                     | Message                                                                                |
| ------------------------------------------- | -------------------------------------------------------------------------------------- |
| A raw field, also inside a child entity     | `Order._shipped is a boolean, not a value object`                                      |
| A private field without its key in the data | `Order._status is not in its primitives` (it would be lost when saving)                |
| `toPrimitives()` returns a value object     | `Order.toPrimitives() returns a value object at primitives.customer; return its value` |

```ts
import {
  AggregateRoot,
  BooleanType,
  Composite,
  CreatedAt,
  IdType,
  NumberType,
  Required,
  StringType,
} from '@archi-code/ddd/domain';
import type { PrimitiveTypes } from '@archi-code/ddd/domain';
import { AggregateMapper } from '@archi-code/ddd/infrastructure';

class OrderId extends IdType {}
class CustomerName extends Required(StringType) {}
class Shipped extends Required(BooleanType) {}
class Sku extends Required(StringType) {}
class Units extends Required(NumberType) {}

class OrderLine extends Composite({ sku: Sku, units: Units }) {}

class Order extends AggregateRoot<OrderId> {
  private constructor(
    id: OrderId,
    private readonly _customer: CustomerName,
    private _shipped: Shipped,
    private _lines: OrderLine[],
    private readonly _placedAt: CreatedAt,
  ) {
    super(id);
  }

  static fromPrimitives(primitives: PrimitiveTypes<Order>): Order {
    return new Order(
      new OrderId(primitives.id),
      new CustomerName(primitives.customer),
      new Shipped(primitives.shipped),
      primitives.lines.map((line) => OrderLine.fromPrimitives(line)),
      new CreatedAt(primitives.placedAt),
    );
  }

  get customer(): CustomerName {
    return this._customer;
  }

  get shipped(): Shipped {
    return this._shipped;
  }

  get lines(): OrderLine[] {
    return [...this._lines];
  }

  get placedAt(): CreatedAt {
    return this._placedAt;
  }

  toPrimitives(): PrimitiveTypes<Order> {
    return {
      id: this.id.value,
      customer: this.customer.value,
      shipped: this.shipped.value,
      lines: this._lines.map((line) => line.toPrimitives()),
      placedAt: this.placedAt.value,
    };
  }
}

const orders = AggregateMapper.of(Order); // AggregateMapper<Order>
orders.aggregateName; // 'Order'
// new InMemoryRepository(orders), or your own adapter:
// write orders.toPrimitives(order) with order.version + 1, read orders.fromPrimitives(row, row.version)
```

# Exceptions: `@archi-code/ddd/exceptions`

All of them extend `AbstractException` (which extends `Error`) and have:

| Member        | Description                                                                              |
| ------------- | ---------------------------------------------------------------------------------------- |
| `name`        | Class name                                                                               |
| `message`     | Message                                                                                  |
| `code`        | The last code in the chain (`'DOM002'`, or yours if you pass one)                        |
| `description` | Every code in readable form: `'Domain Exception (DOM000), Aggregate Not Found (DOM002)'` |
| `timestamp`   | Creation `Date` (a new copy on every read, so it cannot be changed)                      |
| `cause`       | The error passed as `{ cause }`, if any                                                  |
| `print()`     | `'[<description>]: <message>, <ISO timestamp>'`                                          |
| `toJSON()`    | `{ name, message, code, description, timestamp }` (`timestamp` in ISO 8601)              |

| Class                        | Extends                   | Constructor                                | Codes              | Message                                                                           |
| ---------------------------- | ------------------------- | ------------------------------------------ | ------------------ | --------------------------------------------------------------------------------- |
| `DomainException`            | `AbstractException`       | `(message, exceptionCodes = [], options?)` | `DOM000` + yours   | `message`                                                                         |
| `ValidationException`        | `DomainException`         | `(errors: ValidationIssue[])`, keeps them  | `DOM000`, `DOM001` | `Validation failed, <field: message, joined with ", ">`                           |
| `AggregateNotFoundException` | `DomainException`         | `(entity: string, id: string)`             | `DOM000`, `DOM002` | `<entity> with ID <id> not found.`                                                |
| `TypePrimitiveException`     | `DomainException`         | `(expectedType, receivedValue, template?)` | `DOM000`, `DOM003` | `Validation Error: Expected a valid <expectedType>, but received <value>.`        |
| `RequiredValueException`     | `DomainException`         | `(typeName, receivedValue)`                | `DOM000`, `DOM004` | `Validation Error: <typeName> is required, but received <value>.`                 |
| `ApplicationException`       | `AbstractException`       | `(message, exceptionCodes = [], options?)` | `APP000` + yours   | `message`                                                                         |
| `InfrastructureException`    | `AbstractException`       | `(message, exceptionCodes = [], options?)` | `INF000` + yours   | `message`                                                                         |
| `InternalErrorException`     | `InfrastructureException` | `(message, options?)`                      | `INF000`, `INF001` | `Failed, internal error: <message>`                                               |
| `ConcurrencyException`       | `ApplicationException`    | `(aggregateName, id, expectedVersion)`     | `APP000`, `APP001` | `<aggregateName> with ID <id> was changed by someone else: expected version <n>.` |
| `UnknownEventException`      | `InfrastructureException` | `(eventName)`                              | `INF000`, `INF002` | `Unknown event "<eventName>": register it before reading it.`                     |

`options` is `{ cause }`: keep the original error when you wrap it. `TypePrimitiveException` and
`RequiredValueException` are the ones value objects throw; the `template` of
`TypePrimitiveException` replaces `'Expected a valid '`. The built-in codes are exported as the
`ExceptionCode` enum (`ExceptionCode.AggregateNotFound === 'DOM002'`).

The built-in classes recognize their instances across the CJS and ESM builds: an
`AggregateNotFoundException` thrown by the ESM build is `instanceof` the CJS `DomainException` and
`AggregateNotFoundException` (they match by code). Your own subclasses use the normal `instanceof`.

```ts
import {
  AggregateNotFoundException,
  DomainException,
  ExceptionCode,
  InternalErrorException,
} from '@archi-code/ddd/exceptions';

const notFound = new AggregateNotFoundException('User', '42');
notFound.code === ExceptionCode.AggregateNotFound; // true
notFound.message; // 'User with ID 42 not found.'
notFound.code; // 'DOM002'
notFound.description; // 'Domain Exception (DOM000), Aggregate Not Found (DOM002)'
notFound instanceof DomainException; // true

new InternalErrorException('timeout').toJSON();
// {
//   name: 'InternalErrorException',
//   message: 'Failed, internal error: timeout',
//   code: 'INF001',
//   description: 'Infrastructure Exception (INF000), Internal Error (INF001)',
//   timestamp: '2026-10-13T11:52:00.428Z'
// }

try {
  await collection.insertOne(document);
} catch (error) {
  throw new InternalErrorException('saving order', { cause: error });
}
```

Custom exceptions: extend the one for their layer and pass your codes. In `description` a custom
code appears with the class name:

```ts
class OrderCancelledException extends DomainException {
  constructor(orderId: string) {
    super(`Order ${orderId} is cancelled`, ['ORD001']);
  }
}

const error = new OrderCancelledException('7');
error.code; // 'ORD001'
error.description; // 'Domain Exception (DOM000), OrderCancelledException (ORD001)'
```

## Full example

```ts
import { Validations } from '@archi-code/validation';
import {
  AggregateRoot,
  BooleanType,
  CreatedAt,
  EventBase,
  IdType,
  Required,
  StringType,
  ValueObjects,
} from '@archi-code/ddd/domain';
import { AggregateNotFoundException, DomainException } from '@archi-code/ddd/exceptions';
import type {
  AggregateFinder,
  AggregateSaver,
  EventMetadata,
  PrimitiveTypes,
} from '@archi-code/ddd/domain';
import { EventListener, ListensTo, UseCase } from '@archi-code/ddd/application';
import type { Clock, EventBus } from '@archi-code/ddd/application';
import {
  AggregateMapper,
  EventDispatcher,
  FixedClock,
  HttpErrorMapper,
  InMemoryEventBus,
  InMemoryRepository,
} from '@archi-code/ddd/infrastructure';

class UserId extends IdType {}
class Name extends Required(StringType) {}
class Blocked extends Required(BooleanType) {}

@Validations([{ validator: 'isEmail' }])
class Email extends Required(StringType) {}

class UserRegistered extends EventBase {
  static readonly eventName = 'user.registered';

  constructor(
    userId: string,
    readonly email: string,
    metadata?: EventMetadata,
  ) {
    super(userId, metadata);
  }
}

class UserRenamed extends EventBase {
  static readonly eventName = 'user.renamed';

  constructor(
    userId: string,
    readonly name: string,
    metadata?: EventMetadata,
  ) {
    super(userId, metadata);
  }
}

type UserEvent = UserRegistered | UserRenamed;

class UserBlockedException extends DomainException {
  constructor(userId: string) {
    super(`User ${userId} is blocked`, ['USR001']);
  }
}

class User extends AggregateRoot<UserId, UserEvent> {
  private constructor(
    id: UserId,
    private _name: Name,
    readonly email: Email,
    private _blocked: Blocked,
    readonly createdAt: CreatedAt,
  ) {
    super(id);
  }

  static register(name: Name, email: Email, clock: Clock): User {
    const user = new User(UserId.generate(), name, email, new Blocked(false), CreatedAt.now(clock));
    user.record(new UserRegistered(user.id.value, email.value, { clock }));
    return user;
  }

  static fromPrimitives(primitives: PrimitiveTypes<User>): User {
    return new User(
      new UserId(primitives.id),
      new Name(primitives.name),
      new Email(primitives.email),
      new Blocked(primitives.blocked),
      new CreatedAt(primitives.createdAt),
    );
  }

  get name(): Name {
    return this._name;
  }

  get blocked(): Blocked {
    return this._blocked;
  }

  rename(name: Name, clock: Clock): void {
    if (this._blocked.value) {
      throw new UserBlockedException(this.id.value);
    }
    this._name = name;
    this.record(new UserRenamed(this.id.value, name.value, { clock }));
  }

  toPrimitives(): PrimitiveTypes<User> {
    return {
      id: this.id.value,
      name: this.name.value,
      email: this.email.value,
      blocked: this.blocked.value,
      createdAt: this.createdAt.value,
    };
  }
}

interface RegisterUserCommand {
  name: Name;
  email: Email;
}

class RegisterUser extends UseCase<{ name: string; email: string }, RegisterUserCommand, string> {
  constructor(
    private readonly users: AggregateSaver<User>,
    private readonly bus: EventBus<UserEvent>,
    private readonly clock: Clock,
  ) {
    super();
  }

  protected toCommand(input: { name: string; email: string }): RegisterUserCommand {
    return ValueObjects.build({
      name: () => new Name(input.name),
      email: () => new Email(input.email),
    });
  }

  protected async handle(command: RegisterUserCommand): Promise<string> {
    const user = User.register(command.name, command.email, this.clock);
    await this.users.save(user);
    await this.bus.publish(user.pullDomainEvents());
    return user.id.value;
  }
}

interface RenameUserCommand {
  id: UserId;
  name: Name;
}

class RenameUser extends UseCase<{ id: string; name: string }, RenameUserCommand, void> {
  constructor(
    private readonly users: AggregateFinder<User> & AggregateSaver<User>,
    private readonly bus: EventBus<UserEvent>,
    private readonly clock: Clock,
  ) {
    super();
  }

  protected toCommand(input: { id: string; name: string }): RenameUserCommand {
    return { id: new UserId(input.id), name: new Name(input.name) };
  }

  protected async handle(command: RenameUserCommand): Promise<void> {
    const user = await this.users.findById(command.id);
    if (user === null) {
      throw new AggregateNotFoundException('User', command.id.value);
    }
    user.rename(command.name, this.clock);
    await this.users.save(user);
    await this.bus.publish(user.pullDomainEvents());
  }
}

class SendWelcomeEmail extends UseCase<{ email: string }, Email, void> {
  constructor(private readonly outbox: string[]) {
    super();
  }

  protected toCommand(input: { email: string }): Email {
    return new Email(input.email);
  }

  protected handle(email: Email): void {
    this.outbox.push(`Welcome, ${email.value}`);
  }
}

@ListensTo(UserRegistered)
class SendWelcomeEmailOnUserRegistered extends EventListener<UserRegistered> {
  constructor(private readonly sendWelcomeEmail: SendWelcomeEmail) {
    super();
  }

  async handle(event: UserRegistered): Promise<void> {
    await this.sendWelcomeEmail.execute({ email: event.email });
  }
}

const emails: string[] = [];
const users = new InMemoryRepository(AggregateMapper.of(User));
const bus = new InMemoryEventBus<UserEvent>(
  new EventDispatcher([new SendWelcomeEmailOnUserRegistered(new SendWelcomeEmail(emails))]),
);
const clock = new FixedClock('2026-01-01T09:00:00Z');

const id = await new RegisterUser(users, bus, clock).execute({
  name: 'Ana',
  email: 'ana@example.com',
});
await new RenameUser(users, bus, clock).execute({ id, name: 'Ana María' });

bus.published.map((event) => event.eventName()); // ['user.registered', 'user.renamed']
emails; // ['Welcome, ana@example.com']
(await users.findById(new UserId(id)))?.toPrimitives();
// { id, name: 'Ana María', email: 'ana@example.com', blocked: false, createdAt: 2026-01-01T09:00:00.000Z }

const errors = new HttpErrorMapper();
await new RenameUser(users, bus, clock)
  .execute({ id: UserId.random(), name: 'Eva' })
  .catch((error) => errors.map(error));
// { status: 404, body: { code: 'DOM002', message: 'User with ID … not found.' } }
await new RegisterUser(users, bus, clock)
  .execute({ name: 'Eva', email: 'x' })
  .catch((error) => errors.map(error));
// { status: 422, body: { code: 'DOM001', message: 'Validation failed, email: Email: …', errors: [{ field: 'email', message: 'Email: Value does not satisfy isEmail' }] } }
```

## Exports

`@archi-code/ddd/exceptions`:

| Export                                                                                                                            | Kind           |
| --------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| `AbstractException`                                                                                                               | abstract class |
| `DomainException`, `ApplicationException`, `InfrastructureException`                                                              | classes        |
| `ValidationException`, `AggregateNotFoundException`, `TypePrimitiveException`, `RequiredValueException`, `InternalErrorException` | classes        |
| `ConcurrencyException`, `UnknownEventException`                                                                                   | classes        |
| `ExceptionCode`                                                                                                                   | enum           |
| `ExceptionOptions`, `ValidationIssue` (`{ field: string \| null; message }`)                                                      | types          |

`@archi-code/ddd/domain`:

| Export                                                                                        | Kind               |
| --------------------------------------------------------------------------------------------- | ------------------ |
| `AbstractType`                                                                                | abstract class     |
| `StringType`, `NumberType`, `BooleanType`, `DateType`, `UuidType`, `JsonType`                 | classes            |
| `EnumType`, `ArrayType`                                                                       | abstract classes   |
| `CreatedAt`, `UpdatedAt`, `IdType`                                                            | classes (required) |
| `Required`, `Composite`                                                                       | functions          |
| `Specification`                                                                               | abstract class     |
| `CompositeSchema`, `CompositeProps`, `CompositePrimitives`, `CompositeType`, `CompositeValue` | types              |
| `ValueObjects` (`build`, `buildList`)                                                         | class              |
| `AggregateRoot`, `EventBase`                                                                  | abstract classes   |
| `AggregateFinder`, `AggregateSaver`, `AggregateRemover`                                       | types (contracts)  |
| `RequiredType`, `JsonTypeValue`, `PrimitiveType`, `PrimitiveTypes`, `DataTypes`               | types              |
| `EventMetadata`, `SerializedEvent`, `EventClass`                                              | types              |
| `Properties`, `PropertiesData`, `MutablePropertiesData`, `Methods`, `MethodsAndProperties`    | types              |

`@archi-code/ddd/application`:

| Export                     | Kind             |
| -------------------------- | ---------------- |
| `UseCase`, `EventListener` | abstract classes |
| `ListensTo`                | decorator        |
| `EventBus`, `Clock`        | types (ports)    |

`@archi-code/ddd/infrastructure`:

| Export                                                                                                                                                | Kind    |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| `InMemoryRepository`, `AggregateMapper`, `EventDispatcher`, `InMemoryEventBus`, `DomainEventRegistry`, `HttpErrorMapper`, `SystemClock`, `FixedClock` | classes |
| `AggregateClass`, `EventFactory`, `HttpError`, `HttpErrorBody`                                                                                        | types   |

## AI assistant skill

The package includes `SKILL.md`, a Claude Code skill with the rules, patterns and common mistakes of
`@archi-code/ddd`. For the full API it points to this README inside
`node_modules/@archi-code/ddd`, so it stays valid when you update the package. To install it in
your project:

```bash
mkdir -p .claude/skills/archi-code-ddd && cp node_modules/@archi-code/ddd/SKILL.md .claude/skills/archi-code-ddd/SKILL.md
```

### How to use

Invoke it with a request:

```text
/archi-code-ddd create a required Email value object that validates the format
```

Or ask for the task without naming it, and Claude loads it on its own because it matches its
description:

```text
Add a ChangeEmail use case that loads the User, records an EmailChanged event and saves it
```

It also works for reviewing code that already uses the package:

```text
/archi-code-ddd review src/domain and fix whatever breaks the package rules
```

With the skill loaded, Claude follows its rules, avoids the mistakes in its "What not to do" list
and, before using anything the skill does not show, reads this README in `node_modules`.

### Keeping it up to date

- The copy does not update itself: after updating `@archi-code/ddd`, run the command above again.
- Commit `.claude/skills/archi-code-ddd/` to the repository so the whole team uses it.

## License

MIT
