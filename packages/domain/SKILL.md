---
name: archi-code-domain
description: Rules, patterns and common mistakes for writing TypeScript code with @archi-code/domain (archi-code DDD - immutable value objects, Required(...), AggregateRoot with domain events, EventBase and exceptions with codes). Use it when creating or changing value objects, declaring validations with @Validations, modeling aggregates and events, throwing or defining domain exceptions, or whenever the code imports @archi-code/domain.
---

# archi-code-domain

`@archi-code/domain` is archi-code's Domain-Driven Design package for TypeScript: value objects that
convert, validate and are immutable, aggregates with domain events, and exceptions with codes.

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
- `archi-code-ephemeradb`: in-memory repositories for aggregate tests.
- `archi-code-test`: comparing JSON and creating object mothers in tests.

## Import

```ts
import {
  AggregateRoot,
  DomainException,
  EventBase,
  IdType,
  NumberType,
  Required,
  StringType,
  UpdatedAt,
  ValidationException,
} from '@archi-code/domain';
import type { PrimitiveTypes } from '@archi-code/domain';
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
  messages.
- Construction only converts (or throws `TypePrimitiveException` if it cannot). `@Validations` rules
  are checked when calling `validate()`, which keeps no state, never throws and returns
  `{ ok, value, errors }`. An empty optional VO is valid without running validations.
- `@Validations` is imported from `@archi-code/validation`; a validator's parameters go in a single
  `properties` object. Subclasses inherit validations, and one with the same name replaces the
  parent's.
- Values are **immutable**: to change a value, replace the whole VO. `toString` is a **getter**
  (`vo.toString`).
- A custom type extends `AbstractType<T>` and implements only `protected filter(value: unknown): T`
  (it receives input already known to be non-empty; it returns the value or throws
  `TypePrimitiveException`). If restricting an existing type is enough, extend it and use
  `@Validations`.
- Aggregates: `record(event)` is `protected` (only the aggregate itself records events);
  `pullDomainEvents()` returns the events in order and empties the list. Call it after persisting, to
  publish. `EventBase` only requires `eventName(): string`.
- `PrimitiveTypes<T>` only sees **public** non-method members (it strips the leading `_`): expose the
  VOs with public getters or public `readonly` properties.
- Where to throw each exception:
  - Domain (aggregates, VOs, business rules): `DomainException` or a custom subclass with its own
    code; `ValidationException` after a failed `validate()`; `AggregateNotFoundException` when the
    repository does not find the aggregate.
  - Use cases: `ApplicationException`.
  - Adapters (DB, network…): `InfrastructureException` / `InternalErrorException`.
  - `TypePrimitiveException` and `RequiredValueException` are thrown by the VOs; throw them yourself
    only inside the `filter` of a custom type.

## Recommended patterns

Optional by default, required with `Required(XType)`:

```ts
class Nickname extends StringType {} // value: string | null; constructor accepts string | null | nothing
class Name extends Required(StringType) {} // value: string; constructor demands string
class FullName extends Name {} // still required
```

Validations with `@Validations` and an explicit failure with `ValidationException`:

```ts
import { Validations } from '@archi-code/validation';

@Validations([{ validator: 'isEmail' }])
class Email extends Required(StringType) {}

@Validations([
  { validator: 'isInt', properties: { min: 0 } },
  { custom: 'isEven', fn: (v) => Number(v) % 2 === 0, message: 'Must be even' },
])
class Quantity extends NumberType {}

new Email('x').validate();
// { ok: false, value: 'x', errors: [{ validator: 'isEmail', message: 'Value does not satisfy isEmail' }] }
```

```ts
const result = email.validate();
if (!result.ok) {
  throw new ValidationException(result.errors.map((error) => error.message));
}
```

Aggregate with domain events:

```ts
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
    private readonly _updatedAt: UpdatedAt,
  ) {
    super();
  }

  static create(id: string, name: string): User {
    return new User(new IdType(id), new Name(name), UpdatedAt.now());
  }

  get id(): IdType {
    return this._id;
  }

  get name(): Name {
    return this._name;
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
    return { id: this.id.value, name: this.name.value, updatedAt: this.updatedAt.value };
  }
}
```

Custom domain exception with its own code:

```ts
class OrderCancelledException extends DomainException {
  constructor(orderId: string) {
    super(`Order ${orderId} is cancelled`, ['ORD001']);
  }
}
```

## What not to do

- Do not invent API: there is no exported `ExceptionCode`, no `equals()`, no `toPrimitives()` in the
  base class, and no generic `ValueObject`, `Entity` or `Id`. When in doubt, check the installed
  README.
- `vo.toString()` → error: `toString` is a getter (`vo.toString`). For the same reason, `` `${vo}` ``
  and `String(vo)` throw `TypeError: Cannot convert object to primitive value`; use `vo.toString` or
  `vo.value`.
- `JSON.stringify(vo)` gives `{"_value":...}`: serialize with `vo.value` or with `PrimitiveTypes`.
- Expecting the constructor to fail because of an `@Validations` rule: it only fails on conversion or
  on an empty value in `Required`. Call `validate()`.
- Passing unconverted values with their static type (`new NumberType('1.5')`): type error; conversion
  is for `any`/`unknown` input.
- Using `Required(StringType)` directly as a property type instead of a named subclass.
- Trying to mutate `vo.value` (dates, JSON objects, arrays): they are frozen; date setters throw
  `TypeError: Cannot call setFullYear: the date is immutable`. In `ArrayType` use
  `addItem`/`setItem`/`removeItem`; in `UpdatedAt`, `setNow()`.
- Calling `setNow()` on `CreatedAt`: it does not exist, only on `UpdatedAt`.
- `JsonType` with `{}` or with an array: throws `TypePrimitiveException` (it must be a non-empty
  object).
- `IdType` with `00000000-0000-0000-0000-000000000000` or `ffffffff-ffff-ffff-ffff-ffffffffffff`:
  throws `TypePrimitiveException`.
- Declaring an aggregate's VOs as `private` without getters and expecting `PrimitiveTypes` to see
  them.
- Calling `record()` from outside the aggregate (it is `protected`) or forgetting `super()` in the
  constructor of an aggregate or event.
- Importing `@Validations` from `@archi-code/domain`: it is imported from `@archi-code/validation`.
