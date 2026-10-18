# @archi-code/domain

Building blocks for Domain-Driven Design in TypeScript: value objects that convert, validate,
compare by value and are immutable; a required/optional marker enforced by the type system; entities
and aggregates with identity, version and domain events; and typed domain exceptions with codes. Conversions and validations come from
[`@archi-code/validation`](https://www.npmjs.com/package/@archi-code/validation). The package is
published with CJS and ESM builds.

## Installation

```bash
npm install @archi-code/domain
```

- Node.js `>=24` (`engines` field).
- Runtime dependencies, installed by npm automatically: `@archi-code/validation` and `uuid`.
- To declare validations with `@Validations`, also install `@archi-code/validation` as a direct
  dependency of your project (the decorator is imported from it):

  ```bash
  npm install @archi-code/validation
  ```

### TypeScript decorators

`@Validations` works with both TypeScript decorator modes:

- **Standard** (TypeScript 5+ without `experimentalDecorators`): no configuration needed.
- **Legacy**: `"experimentalDecorators": true` in `tsconfig.json`.

It does not need `emitDecoratorMetadata` or `reflect-metadata`. If you declare no validations, no
decorator setting is needed at all.

## Import

```ts
// ESM
import { AggregateRoot, Entity, EventBase, IdType, Required, StringType } from '@archi-code/domain';
```

```js
// CommonJS
const {
  AggregateRoot,
  Entity,
  EventBase,
  IdType,
  Required,
  StringType,
} = require('@archi-code/domain');
```

Types (`PrimitiveTypes`, `RequiredType`, `EventMetadata`…) are imported with `import type`.

Both builds can be loaded in the same process (for example a CommonJS application that uses an ESM
library built on this package): the exceptions of one build are `instanceof` the classes of the other
(see [Exceptions](#exceptions)).

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
import { BooleanType, DateType, NumberType, StringType } from '@archi-code/domain';

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
| `validate()`    | `ValidationResult<T>` | Runs the validations declared with `@Validations`; never throws                         |
| `assertValid()` | `this`                | Same instance if `validate()` is ok; otherwise throws `ValidationException`             |

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
import { Required, StringType } from '@archi-code/domain';

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

`Required(...)` also declares the `isRequired` validation, so `validate()` on a required type
includes it too.

### Validations

Validations are declared with `@Validations` from `@archi-code/validation` (that package's `is*`
validators or `custom` validations with their own function). `validate()` does not throw: it returns
a frozen `{ ok, value, errors }`. An optional, empty value object is valid without running its
validations.

```ts
import { Validations } from '@archi-code/validation';
import { NumberType, Required, StringType } from '@archi-code/domain';

@Validations([{ validator: 'isEmail' }])
class Email extends Required(StringType) {}

new Email('x').validate();
// { ok: false, value: 'x', errors: [{ validator: 'isEmail', message: 'Value does not satisfy isEmail' }] }
new Email('ana@example.com').validate();
// { ok: true, value: 'ana@example.com', errors: [] }

@Validations([{ validator: 'isLength', properties: { min: 3, max: 20 } }])
class Username extends StringType {}

new Username().validate(); // { ok: true, value: null, errors: [] }
new Username('ab').validate();
// { ok: false, value: 'ab', errors: [{ validator: 'isLength', message: 'Value does not satisfy isLength' }] }

@Validations([
  { validator: 'isInt', properties: { min: 0 } },
  { custom: 'isEven', fn: (v) => Number(v) % 2 === 0, message: 'Must be even' },
])
class Quantity extends NumberType {}

new Quantity(3).validate();
// { ok: false, value: 3, errors: [{ custom: 'isEven', message: 'Must be even' }] }
```

A subclass inherits its parent's validations; if it declares the same validation, it replaces it.
Validator names and their `properties` are in the `@archi-code/validation` documentation.

To build a value object that is always valid, chain `assertValid()`: it returns the same instance
or throws `ValidationException` with one entry per broken rule, prefixed with the class name:

```ts
const email = new Email('ana@example.com').assertValid(); // Email

new Email('x').assertValid();
// ValidationException: Validation failed, Email: Value does not satisfy isEmail
// error.errors: ['Email: Value does not satisfy isEmail']
```

`validate()` stays available to collect errors without throwing, for example to show every error of
a form at once.

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
import { IdType, UuidType } from '@archi-code/domain';

UuidType.random(); // random UUID v4
UuidType.fromValue('ana@example.com'); // '4badeee4-791f-51e2-a027-2c59bc6f8144' (v5, deterministic)
UuidType.fromValue('ana@example.com', '6ba7b811-9dad-11d1-80b4-00c04fd430c8'); // v5 with another namespace

new UuidType('abc');
// TypePrimitiveException: Validation Error: Expected a valid UUID, but received "abc".

const id = new IdType(IdType.random()); // required
new IdType('9B2F6C1E-4D3A-4F8B-A1C2-3E4D5F6A7B8C').value; // '9b2f6c1e-4d3a-4f8b-a1c2-3e4d5f6a7b8c'
new IdType('00000000-0000-0000-0000-000000000000');
// TypePrimitiveException: Validation Error: Expected a valid Id, but received "00000000-0000-0000-0000-000000000000".
```

`fromValue(value, namespace?)` uses the DNS namespace by default
(`6ba7b810-9dad-11d1-80b4-00c04fd430c8`). Both types store the UUID in lowercase, so an id typed in
capitals equals the stored one.

### `CreatedAt` and `UpdatedAt`

Required dates:

```ts
import { CreatedAt, UpdatedAt } from '@archi-code/domain';

const createdAt = CreatedAt.now();
let updatedAt = UpdatedAt.now();
updatedAt = UpdatedAt.now(); // a new timestamp is a new value object
createdAt.value; // Date
```

### `EnumType`

Abstract class: implement `getEnum()` returning the enum. It accepts exactly one of its options
(without conversion: `'1'` is not valid for a numeric enum).

```ts
import { EnumType } from '@archi-code/domain';

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
new LevelType('1' as any);
// TypePrimitiveException: Validation Error: Expected one of [1, 2], but received "1".
```

### `JsonType`

Holds a non-empty JSON object (frozen copy). `T` must extend `JsonTypeValue`
(`Record<string, any>`).

```ts
import { JsonType } from '@archi-code/domain';
import type { JsonTypeValue } from '@archi-code/domain';

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
import { ArrayType, Required, StringType } from '@archi-code/domain';

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
new Tags(['ok', '']);
// RequiredValueException: Validation Error: Tag is required, but received "".
new Tags('abc' as any);
// TypePrimitiveException: Validation Error: Expected a valid Array, but received "abc".
```

`validate()` on an `ArrayType` adds each item's errors with its position:

```ts
new Tags(['ok', 'x']).validate();
// { ok: false, value: ['ok', 'x'], errors: [{ validator: 'isLength', message: 'Item 2: Value does not satisfy isLength' }] }
```

### Custom value objects with `AbstractType`

For a new type, extend `AbstractType<T>` and implement `filter(value)`: it receives the input
already known to be non-empty, returns the converted value and throws `TypePrimitiveException` if it
is not valid. Empty input (`null`, `undefined`, blanks) and `Required(...)` are handled by the base
class.

```ts
import { AbstractType, Required, TypePrimitiveException } from '@archi-code/domain';

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

## Entities, aggregates and domain events

- `Entity<Id = IdType>`: abstract class for objects with identity. `new (id)` stores
  `readonly id`; `equals(other)` is true for the same class and an equal id, whatever the other
  attributes are. `Id` may be any value object (`IdType`, a `Required(StringType)` code…).
- `AggregateRoot<Id = IdType, Event = EventBase>`: an `Entity` with `readonly version` and domain
  events. `new (id, version = 0)`: pass the stored version when loading it from the database (a
  negative, fractional or unsafe version throws `TypePrimitiveException`). `record(event)` is
  `protected`; `pullDomainEvents()` returns the events typed as `Event[]`, in order, and empties
  the list.
- `EventBase`: abstract class for events; implement `eventName(): string`. `new (aggregateId,
metadata?)` sets `aggregateId`, a new `eventId` (UUID v4) and `occurredOn` (now, immutable). When
  you rebuild an event read from an outbox or a broker, pass `{ eventId, occurredOn }` (`Date` or ISO
  string with zone) to keep them. `toJSON()` gives `{ eventName, eventId, aggregateId, occurredOn
(ISO), ...payload }`.

```ts
import { AggregateRoot, EventBase, IdType } from '@archi-code/domain';
import type { EventMetadata } from '@archi-code/domain';

class OrderId extends IdType {}

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

class Order extends AggregateRoot<OrderId, OrderPlaced> {
  static place(id: string, customer: string): Order {
    const order = new Order(new OrderId(id));
    order.record(new OrderPlaced(id, customer));
    return order;
  }
}

const order = Order.place('9b2f6c1e-4d3a-4f8b-a1c2-3e4d5f6a7b8c', 'Ana');
order.version; // 0
const [placed] = order.pullDomainEvents(); // OrderPlaced[]
order.pullDomainEvents(); // []
JSON.stringify(placed);
// {"eventName":"order.placed","eventId":"…","aggregateId":"9b2f6c1e-…","occurredOn":"2026-10-17T10:00:00.000Z","customer":"Ana"}
```

Optimistic concurrency: the repository writes only if the stored version is still
`aggregate.version` and stores `aggregate.version + 1`; if no row matches, someone else saved the
aggregate first.

## Primitive types

Types to go from an aggregate (or any class with value objects) to its plain values:

| Type                       | Result                                                                                                                                                                                         |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PrimitiveType<T>`         | Value object → its value (`T['value']`); enum → `string`/`number`; `Entity` → its `PrimitiveTypes`; arrays item by item; `string`/`number`/`boolean`/`Date` as they are; anything else `never` |
| `PrimitiveTypes<T>`        | Object with each public non-method property of `T` as `PrimitiveType`, without the leading `_` of the name                                                                                     |
| `DataTypes<T>`             | `Partial<PrimitiveTypes<T>>`                                                                                                                                                                   |
| `Properties<T>`            | The public properties of `T` that are not methods                                                                                                                                              |
| `PropertiesData<T>`        | `Required<Properties<T>>`                                                                                                                                                                      |
| `MutablePropertiesData<T>` | `PropertiesData<T>` without `readonly`                                                                                                                                                         |
| `Methods<T>`               | Union of the names of the methods of `T`                                                                                                                                                       |
| `MethodsAndProperties<T>`  | `{ [key in keyof T]: T[key] }`                                                                                                                                                                 |
| `RequiredType<C>`          | Type of the class returned by `Required(C)`                                                                                                                                                    |
| `JsonTypeValue`            | `Record<string, any>`                                                                                                                                                                          |

`PrimitiveTypes` only sees **public** members (`keyof`): `private` or `protected` properties do not
appear. Expose the value objects with public `readonly` properties or with getters (see the full
example). For an aggregate it includes `id` and `version`, and child entities become their own
primitives.

```ts
import type { DataTypes, PrimitiveTypes } from '@archi-code/domain';

class Person {
  constructor(
    readonly _name: Name,
    readonly nickname: Nickname,
  ) {}
}

type PersonPrimitives = PrimitiveTypes<Person>; // { name: string; nickname: string | null }
type PersonData = DataTypes<Person>; // { name?: string; nickname?: string | null }
```

## Exceptions

All of them extend `AbstractException` (which extends `Error`) and have:

| Member        | Description                                                                              |
| ------------- | ---------------------------------------------------------------------------------------- |
| `name`        | Class name                                                                               |
| `message`     | Message                                                                                  |
| `code`        | The last code in the chain (`'DOM002'`, or yours if you pass one)                        |
| `description` | Every code in readable form: `'Domain Exception (DOM000), Aggregate Not Found (DOM002)'` |
| `timestamp`   | Creation `Date` (immutable)                                                              |
| `cause`       | The error passed as `{ cause }`, if any                                                  |
| `print()`     | `'[<description>]: <message>, <ISO timestamp>'`                                          |
| `toJSON()`    | `{ name, message, code, description, timestamp }` (`timestamp` in ISO 8601)              |

| Class                        | Extends                   | Constructor                                | Codes              | Message                                                                    |
| ---------------------------- | ------------------------- | ------------------------------------------ | ------------------ | -------------------------------------------------------------------------- |
| `DomainException`            | `AbstractException`       | `(message, exceptionCodes = [], options?)` | `DOM000` + yours   | `message`                                                                  |
| `ValidationException`        | `DomainException`         | `(errors: string[])`, keeps `errors`       | `DOM000`, `DOM001` | `Validation failed, <errors joined with ", ">`                             |
| `AggregateNotFoundException` | `DomainException`         | `(entity: string, id: string)`             | `DOM000`, `DOM002` | `<entity> with ID <id> not found.`                                         |
| `TypePrimitiveException`     | `DomainException`         | `(expectedType, receivedValue, template?)` | `DOM000`, `DOM003` | `Validation Error: Expected a valid <expectedType>, but received <value>.` |
| `RequiredValueException`     | `DomainException`         | `(typeName, receivedValue)`                | `DOM000`, `DOM004` | `Validation Error: <typeName> is required, but received <value>.`          |
| `ApplicationException`       | `AbstractException`       | `(message, exceptionCodes = [], options?)` | `APP000` + yours   | `message`                                                                  |
| `InfrastructureException`    | `AbstractException`       | `(message, exceptionCodes = [], options?)` | `INF000` + yours   | `message`                                                                  |
| `InternalErrorException`     | `InfrastructureException` | `(message, options?)`                      | `INF000`, `INF001` | `Failed, internal error: <message>`                                        |

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
} from '@archi-code/domain';

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
  CreatedAt,
  DomainException,
  EventBase,
  IdType,
  Required,
  StringType,
  UpdatedAt,
} from '@archi-code/domain';
import type { EventMetadata, PrimitiveTypes } from '@archi-code/domain';

class UserId extends IdType {}
class Name extends Required(StringType) {}

@Validations([{ validator: 'isEmail' }])
class Email extends Required(StringType) {}

class UserCreated extends EventBase {
  constructor(
    userId: string,
    readonly email: string,
    metadata?: EventMetadata,
  ) {
    super(userId, metadata);
  }

  eventName(): string {
    return 'user.created';
  }
}

class UserRenamed extends EventBase {
  constructor(
    userId: string,
    readonly name: string,
  ) {
    super(userId);
  }

  eventName(): string {
    return 'user.renamed';
  }
}

type UserEvent = UserCreated | UserRenamed;

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
    private _blocked: boolean,
    readonly createdAt: CreatedAt,
    private _updatedAt: UpdatedAt,
    version: number,
  ) {
    super(id, version);
  }

  static create(id: string, name: string, email: string): User {
    const user = new User(
      new UserId(id),
      new Name(name),
      new Email(email).assertValid(),
      false,
      CreatedAt.now(),
      UpdatedAt.now(),
      0,
    );
    user.record(new UserCreated(id, email));
    return user;
  }

  static fromPrimitives(primitives: PrimitiveTypes<User>): User {
    return new User(
      new UserId(primitives.id),
      new Name(primitives.name),
      new Email(primitives.email),
      primitives.blocked,
      new CreatedAt(primitives.createdAt),
      new UpdatedAt(primitives.updatedAt),
      primitives.version,
    );
  }

  get name(): Name {
    return this._name;
  }

  get blocked(): boolean {
    return this._blocked;
  }

  get updatedAt(): UpdatedAt {
    return this._updatedAt;
  }

  rename(name: string): void {
    if (this._blocked) {
      throw new UserBlockedException(this.id.value);
    }
    this._name = new Name(name);
    this._updatedAt = UpdatedAt.now();
    this.record(new UserRenamed(this.id.value, name));
  }

  toPrimitives(): PrimitiveTypes<User> {
    return {
      id: this.id.value,
      version: this.version,
      name: this.name.value,
      email: this.email.value,
      blocked: this.blocked,
      createdAt: this.createdAt.value,
      updatedAt: this.updatedAt.value,
    };
  }
}

const user = User.create(IdType.random(), 'Ana', 'ana@example.com');
user.rename('Ana María');

user.pullDomainEvents().map((event) => event.eventName()); // ['user.created', 'user.renamed']
user.pullDomainEvents(); // []
user.toPrimitives(); // { id, version: 0, name: 'Ana María', email: 'ana@example.com', blocked: false, createdAt, updatedAt }
User.fromPrimitives(user.toPrimitives()).equals(user); // true (same id)

User.create(IdType.random(), 'Ana', 'x');
// ValidationException: Validation failed, Email: Value does not satisfy isEmail
```

## Exports

| Export                                                                                                                            | Kind               |
| --------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| `AbstractType`                                                                                                                    | abstract class     |
| `StringType`, `NumberType`, `BooleanType`, `DateType`, `UuidType`, `JsonType`                                                     | classes            |
| `EnumType`, `ArrayType`                                                                                                           | abstract classes   |
| `CreatedAt`, `UpdatedAt`, `IdType`                                                                                                | classes (required) |
| `Required`                                                                                                                        | function           |
| `Entity`, `AggregateRoot`, `EventBase`                                                                                            | abstract classes   |
| `AbstractException`                                                                                                               | abstract class     |
| `DomainException`, `ApplicationException`, `InfrastructureException`                                                              | classes            |
| `ValidationException`, `AggregateNotFoundException`, `TypePrimitiveException`, `RequiredValueException`, `InternalErrorException` | classes            |
| `ExceptionCode`                                                                                                                   | enum               |
| `RequiredType`, `JsonTypeValue`, `PrimitiveType`, `PrimitiveTypes`, `DataTypes`                                                   | types              |
| `EventMetadata`, `SerializedEvent`, `ExceptionOptions`                                                                            | types              |
| `Properties`, `PropertiesData`, `MutablePropertiesData`, `Methods`, `MethodsAndProperties`                                        | types              |

## AI assistant skill

The package includes `SKILL.md`, a Claude Code skill with the rules, patterns and common mistakes of
`@archi-code/domain`. For the full API it points to this README inside
`node_modules/@archi-code/domain`, so it stays valid when you update the package. To install it in
your project:

```bash
mkdir -p .claude/skills/archi-code-domain && cp node_modules/@archi-code/domain/SKILL.md .claude/skills/archi-code-domain/SKILL.md
```

### How to use

Invoke it with a request:

```text
/archi-code-domain create a required Email value object that validates the format
```

Or ask for the task without naming it, and Claude loads it on its own because it matches its
description:

```text
Add a changeEmail method to the User aggregate that records an EmailChanged event
```

It also works for reviewing code that already uses the package:

```text
/archi-code-domain review src/domain and fix whatever breaks the package rules
```

With the skill loaded, Claude follows its rules, avoids the mistakes in its "What not to do" list
and, before using anything the skill does not show, reads this README in `node_modules`.

### Keeping it up to date

- The copy does not update itself: after updating `@archi-code/domain`, run the command above again.
- Commit `.claude/skills/archi-code-domain/` to the repository so the whole team uses it.

## License

MIT
