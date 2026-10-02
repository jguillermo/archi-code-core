# @archi-code/domain

Building blocks for Domain-Driven Design in TypeScript: value objects that convert, validate and
stay immutable, a required/optional marker that the type system enforces, aggregate roots with
domain events, and typed domain exceptions. Conversions and validations come from
[`@archi-code/validation`](../validation). The package ships dual CJS and ESM builds.

```bash
npm install @archi-code/domain
```

## Value objects

Every value object wraps one value of a type and converts its input on construction:

| Class             | Value     | Accepts                                                                      |
| ----------------- | --------- | ---------------------------------------------------------------------------- |
| `StringType`      | `string`  | strings, finite numbers and booleans                                         |
| `NumberType`      | `number`  | finite numbers and decimal strings (`'1.5'`, `' 2 '`, `'1e3'`)               |
| `BooleanType`     | `boolean` | booleans, `1`/`0` and `'true'`/`'false'`/`'1'`/`'0'` (any case)              |
| `DateType`        | `Date`    | valid `Date` instances and ISO 8601 strings (no zone = UTC)                  |
| `UuidType`        | `string`  | UUID strings                                                                 |
| `EnumType<T>`     | `T`       | an option of the enum returned by `getEnum()` (abstract)                     |
| `JsonType<T>`     | `T`       | non-empty JSON objects and strings holding one                               |
| `ArrayType<Item>` | `Item[]`  | arrays (or JSON array strings), each item built by `createItem()` (abstract) |

`CreatedAt` and `UpdatedAt` are required dates with `now()`; `IdType` is a required UUID that also
rejects the nil and max UUIDs.

A value that cannot be converted throws `TypePrimitiveException`:

```ts
new NumberType('abc'); // TypePrimitiveException: Expected a valid Number, but received "abc".
```

### Optional by default, required with `Required(...)`

A value object is optional: it takes the value, `null` or nothing, and holds `T | null`. Wrap it
with `Required(...)` to make it required: the constructor then asks for exactly `T`, the value is
typed `T`, and an empty value throws `RequiredValueException` on construction.

```ts
import { Required, StringType } from '@archi-code/domain';

class Name extends Required(StringType) {}
class Nickname extends StringType {}

new Name('Ana').value; // string
new Nickname().value; // string | null
new Name(null); // type error, and RequiredValueException at runtime
```

`null`, `undefined` and blank strings count as empty for every type. A subclass of a required
value object is required too.

### Validations

Declare validations with `@Validations` from `@archi-code/validation`. `validate()` returns
`{ ok, value, errors }` and reuses its result while the value does not change. An optional value
object that is empty is valid without running its validations.

```ts
import { Validations } from '@archi-code/validation';

@Validations([{ validator: 'isEmail' }])
class Email extends Required(StringType) {}

new Email('x').validate();
// { ok: false, value: 'x', errors: [{ validator: 'isEmail', message: 'Value does not satisfy isEmail' }] }
```

`ArrayType` also reports the errors of each item with its position (`Item 2: …`).

### Immutability

Values cannot be changed after construction: `DateType` holds a date whose setters throw,
`JsonType` and `ArrayType` hold deep-frozen copies of their input. `ArrayType` changes its items
only through `addItem`, `setItem` and `removeItem`, which replace the array.

## Aggregates and events

```ts
import { AggregateRoot, EventBase, IdType } from '@archi-code/domain';

class UserCreated extends EventBase {
  eventName(): string {
    return 'user.created';
  }
}

class User extends AggregateRoot {
  constructor(readonly id: IdType) {
    super();
    this.record(new UserCreated());
  }
}

new User(new IdType(IdType.random())).pullDomainEvents(); // [UserCreated]
```

`PrimitiveTypes<T>` maps an aggregate to the plain values of its value objects (a leading `_` is
removed from property names).

## Exceptions

`DomainException`, `ApplicationException` and `InfrastructureException` extend
`AbstractException`, which carries a `code`, a readable `description`, a `timestamp` and
`toJSON()`. The domain ones include `ValidationException`, `AggregateNotFoundException`,
`TypePrimitiveException` and `RequiredValueException`.

## License

MIT
