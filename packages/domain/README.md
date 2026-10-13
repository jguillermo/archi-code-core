# @archi-code/domain

Building blocks for Domain-Driven Design in TypeScript: value objects that convert, validate and are
immutable; a required/optional marker enforced by the type system; aggregates with domain events and
typed domain exceptions with codes. Conversions and validations come from
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
import { AggregateRoot, EventBase, IdType, Required, StringType } from '@archi-code/domain';
```

```js
// CommonJS
const { AggregateRoot, EventBase, IdType, Required, StringType } = require('@archi-code/domain');
```

Types (`PrimitiveTypes`, `RequiredType`…) are imported with `import type`.

## Value objects

Each value object wraps a value of one type and converts the input when it is constructed:

| Class             | Value     | Accepts                                                                                |
| ----------------- | --------- | -------------------------------------------------------------------------------------- |
| `StringType`      | `string`  | strings, finite numbers and booleans                                                   |
| `NumberType`      | `number`  | finite numbers and decimal strings (`'1.5'`, `' 2 '`, `'1e3'`)                         |
| `BooleanType`     | `boolean` | booleans, `1`/`0` and `'true'`/`'false'`/`'1'`/`'0'` (case-insensitive)                |
| `DateType`        | `Date`    | valid `Date` instances and ISO 8601 strings (no zone = UTC)                            |
| `UuidType`        | `string`  | UUID strings                                                                           |
| `EnumType<T>`     | `T`       | one option of the enum returned by `getEnum()` (abstract)                              |
| `JsonType<T>`     | `T`       | non-empty JSON objects and strings that contain one                                    |
| `ArrayType<Item>` | `Item[]`  | arrays (or strings with a JSON array); each item is built by `createItem()` (abstract) |
| `CreatedAt`       | `Date`    | like `DateType`, required; `CreatedAt.now()`                                           |
| `UpdatedAt`       | `Date`    | like `DateType`, required; `UpdatedAt.now()` and `setNow()`                            |
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
new DateType(body.at).toString; // '2024-01-31T08:00:00.000Z'
new DateType('2018-03-23' as any).toString; // '2018-03-23T00:00:00.000Z'
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
```

### What each value object exposes

| Member       | Type                  | Description                                                                             |
| ------------ | --------------------- | --------------------------------------------------------------------------------------- |
| `value`      | `T \| null` (or `T`)  | The converted value; `T` if the type is required (`Required`)                           |
| `isNull`     | `boolean`             | `true` if there is no value                                                             |
| `toString`   | `string` (getter)     | Text of the value; `''` if it is `null`. `DateType` gives ISO 8601, `JsonType` the JSON |
| `validate()` | `ValidationResult<T>` | Runs the validations declared with `@Validations`                                       |

`toString` is a **getter**, not a method: use `vo.toString`, not `vo.toString()`.

```ts
new NumberType(3.5).toString; // '3.5'
new NumberType().toString; // ''
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

To turn validation errors into an exception, use `ValidationException`:

```ts
const result = new Email('x').validate();
if (!result.ok) {
  throw new ValidationException(result.errors.map((error) => error.message));
  // ValidationException: Validation failed, Value does not satisfy isEmail
}
```

### Immutability

Values do not change after construction:

- `DateType` (and `CreatedAt`/`UpdatedAt`) holds a date whose setters throw:

  ```ts
  new DateType(new Date('2024-01-31T10:00:00Z')).value!.setFullYear(2000);
  // TypeError: Cannot call setFullYear: the date is immutable
  ```

- `JsonType` and `ArrayType` hold deeply frozen copies (`Object.isFrozen(vo.value)` is `true`).
- `ArrayType` only changes its items with `addItem`, `setItem` and `removeItem`, which replace the
  array with another frozen one. `UpdatedAt.setNow()` replaces the date.

### `UuidType` and `IdType`

```ts
import { IdType, UuidType } from '@archi-code/domain';

UuidType.random(); // random UUID v4
UuidType.fromValue('ana@example.com'); // '4badeee4-791f-51e2-a027-2c59bc6f8144' (v5, deterministic)
UuidType.fromValue('ana@example.com', '6ba7b811-9dad-11d1-80b4-00c04fd430c8'); // v5 with another namespace

new UuidType('abc');
// TypePrimitiveException: Validation Error: Expected a valid UUID, but received "abc".

const id = new IdType(IdType.random()); // required
new IdType('00000000-0000-0000-0000-000000000000');
// TypePrimitiveException: Validation Error: Expected a valid Id, but received "00000000-0000-0000-0000-000000000000".
```

`fromValue(value, namespace?)` uses the DNS namespace by default
(`6ba7b810-9dad-11d1-80b4-00c04fd430c8`).

### `CreatedAt` and `UpdatedAt`

Required dates:

```ts
import { CreatedAt, UpdatedAt } from '@archi-code/domain';

const createdAt = CreatedAt.now();
const updatedAt = UpdatedAt.now();
updatedAt.setNow(); // replaces the date with the current one (UpdatedAt only)
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
address.toString; // '{"city":"Huelva","zip":"21001"}'
new AddressType('{"city":"Huelva","zip":"21001"}' as any).value; // { city: 'Huelva', zip: '21001' }

new JsonType({});
// TypePrimitiveException: Validation Error: Expected a valid Json, but received {}.
new JsonType([1] as any);
// TypePrimitiveException: Validation Error: Expected a valid Json, but received [1].
```

### `ArrayType`

Abstract class: implement `createItem(value)` returning the value object of each item. The array
holds the values already converted by each item; `items` rebuilds the value objects.

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
tags.addItem('node'); // ['ddd', 'ts', 'node']
tags.setItem('ddd'); // adds only if missing: ['ddd', 'ts', 'node']
tags.removeItem('ts'); // ['ddd', 'node']
tags.toString; // 'ddd, node'

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

## Aggregates and domain events

- `EventBase`: abstract class for events; implement `eventName(): string`.
- `AggregateRoot`: abstract class for aggregates. `record(event)` (protected) stores an event and
  `pullDomainEvents()` returns the stored ones in order and empties the list.

```ts
import { AggregateRoot, EventBase, IdType } from '@archi-code/domain';

class UserCreated extends EventBase {
  constructor(readonly userId: string) {
    super();
  }

  eventName(): string {
    return 'user.created';
  }
}

class User extends AggregateRoot {
  constructor(readonly id: IdType) {
    super();
    this.record(new UserCreated(id.value));
  }
}

const user = new User(new IdType(IdType.random()));
user.pullDomainEvents(); // [UserCreated]
user.pullDomainEvents(); // []
```

## Primitive types

Types to go from an aggregate (or any class with value objects) to its plain values:

| Type                       | Result                                                                                                     |
| -------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `PrimitiveType<T>`         | The value of a value object (`T['value']`); enums as `string`/`number`; arrays item by item                |
| `PrimitiveTypes<T>`        | Object with each public non-method property of `T` as `PrimitiveType`, without the leading `_` of the name |
| `DataTypes<T>`             | `Partial<PrimitiveTypes<T>>`                                                                               |
| `Properties<T>`            | The public properties of `T` that are not methods                                                          |
| `PropertiesData<T>`        | `Required<Properties<T>>`                                                                                  |
| `MutablePropertiesData<T>` | `PropertiesData<T>` without `readonly`                                                                     |
| `Methods<T>`               | Union of the names of the methods of `T`                                                                   |
| `MethodsAndProperties<T>`  | `{ [key in keyof T]: T[key] }`                                                                             |
| `RequiredType<C>`          | Type of the class returned by `Required(C)`                                                                |
| `JsonTypeValue`            | `Record<string, any>`                                                                                      |

`PrimitiveTypes` only sees **public** members (`keyof`): `private` or `protected` properties do not
appear. Expose the value objects with public `readonly` properties or with getters (see the full
example).

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
| `timestamp`   | Creation `Date`                                                                          |
| `print()`     | `'[<description>]: <message>, <timestamp>'`                                              |
| `toJSON()`    | `{ name, message, code, description, timestamp }` (`timestamp` in ISO 8601)              |

| Class                        | Extends                   | Constructor                                | Codes              | Message                                                                    |
| ---------------------------- | ------------------------- | ------------------------------------------ | ------------------ | -------------------------------------------------------------------------- |
| `DomainException`            | `AbstractException`       | `(message, exceptionCodes = [])`           | `DOM000` + yours   | `message`                                                                  |
| `ValidationException`        | `DomainException`         | `(errors: string[])`                       | `DOM000`, `DOM001` | `Validation failed, <errors joined with ", ">`                             |
| `AggregateNotFoundException` | `DomainException`         | `(entity: string, id: string)`             | `DOM000`, `DOM002` | `<entity> with ID <id> not found.`                                         |
| `TypePrimitiveException`     | `DomainException`         | `(expectedType, receivedValue, template?)` | `DOM000`, `DOM003` | `Validation Error: Expected a valid <expectedType>, but received <value>.` |
| `RequiredValueException`     | `DomainException`         | `(typeName, receivedValue)`                | `DOM000`, `DOM004` | `Validation Error: <typeName> is required, but received <value>.`          |
| `ApplicationException`       | `AbstractException`       | `(message, exceptionCodes = [])`           | `APP000` + yours   | `message`                                                                  |
| `InfrastructureException`    | `AbstractException`       | `(message, exceptionCodes = [])`           | `INF000` + yours   | `message`                                                                  |
| `InternalErrorException`     | `InfrastructureException` | `(message)`                                | `INF000`, `INF001` | `Failed, internal error: <message>`                                        |

`TypePrimitiveException` and `RequiredValueException` are the ones value objects throw; the
`template` of `TypePrimitiveException` replaces `'Expected a valid '`.

```ts
import {
  AggregateNotFoundException,
  DomainException,
  InternalErrorException,
} from '@archi-code/domain';

const notFound = new AggregateNotFoundException('User', '42');
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
  EventBase,
  IdType,
  Required,
  StringType,
  UpdatedAt,
  ValidationException,
} from '@archi-code/domain';
import type { PrimitiveTypes } from '@archi-code/domain';

class Name extends Required(StringType) {}

@Validations([{ validator: 'isEmail' }])
class Email extends Required(StringType) {}

class UserCreated extends EventBase {
  constructor(
    readonly userId: string,
    readonly email: string,
  ) {
    super();
  }

  eventName(): string {
    return 'user.created';
  }
}

class UserRenamed extends EventBase {
  constructor(
    readonly userId: string,
    readonly name: string,
  ) {
    super();
  }

  eventName(): string {
    return 'user.renamed';
  }
}

class User extends AggregateRoot {
  private constructor(
    private readonly _id: IdType,
    private _name: Name,
    private readonly _email: Email,
    private readonly _createdAt: CreatedAt,
    private readonly _updatedAt: UpdatedAt,
  ) {
    super();
  }

  static create(id: string, name: string, email: string): User {
    const emailValue = new Email(email);
    const result = emailValue.validate();
    if (!result.ok) {
      throw new ValidationException(result.errors.map((error) => error.message));
    }
    const user = new User(
      new IdType(id),
      new Name(name),
      emailValue,
      CreatedAt.now(),
      UpdatedAt.now(),
    );
    user.record(new UserCreated(id, email));
    return user;
  }

  get id(): IdType {
    return this._id;
  }

  get name(): Name {
    return this._name;
  }

  get email(): Email {
    return this._email;
  }

  get createdAt(): CreatedAt {
    return this._createdAt;
  }

  get updatedAt(): UpdatedAt {
    return this._updatedAt;
  }

  rename(name: string): void {
    this._name = new Name(name);
    this._updatedAt.setNow();
    this.record(new UserRenamed(this._id.value, name));
  }

  toPrimitives(): PrimitiveTypes<User> {
    return {
      id: this.id.value,
      name: this.name.value,
      email: this.email.value,
      createdAt: this.createdAt.value,
      updatedAt: this.updatedAt.value,
    };
  }
}

const user = User.create(IdType.random(), 'Ana', 'ana@example.com');
user.rename('Ana María');

user.pullDomainEvents().map((event) => event.eventName()); // ['user.created', 'user.renamed']
user.pullDomainEvents(); // []
user.toPrimitives(); // { id, name: 'Ana María', email: 'ana@example.com', createdAt, updatedAt }

User.create(IdType.random(), 'Ana', 'x');
// ValidationException: Validation failed, Value does not satisfy isEmail
```

## Exports

| Export                                                                                                                            | Kind               |
| --------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| `AbstractType`                                                                                                                    | abstract class     |
| `StringType`, `NumberType`, `BooleanType`, `DateType`, `UuidType`, `JsonType`                                                     | classes            |
| `EnumType`, `ArrayType`                                                                                                           | abstract classes   |
| `CreatedAt`, `UpdatedAt`, `IdType`                                                                                                | classes (required) |
| `Required`                                                                                                                        | function           |
| `AggregateRoot`, `EventBase`                                                                                                      | abstract classes   |
| `AbstractException`                                                                                                               | abstract class     |
| `DomainException`, `ApplicationException`, `InfrastructureException`                                                              | classes            |
| `ValidationException`, `AggregateNotFoundException`, `TypePrimitiveException`, `RequiredValueException`, `InternalErrorException` | classes            |
| `RequiredType`, `JsonTypeValue`, `PrimitiveType`, `PrimitiveTypes`, `DataTypes`                                                   | types              |
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
