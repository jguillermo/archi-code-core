# Validations decorator

`@Validations` attaches a list of validations to a class. `validate(Class, value)` runs them,
inherited ones included, against a value.

```ts
import { Validations, validate } from '@archi-code/validation';

@Validations([{ validator: 'isInt', properties: { min: 0 } }])
class Quantity {}

validate(Quantity, '-3');
// { ok: false, value: '-3', errors: [{ validator: 'isInt', message: 'Value does not satisfy isInt' }] }
```

The decorator is metadata only. It does not change the class, does not wrap its constructor and
does not validate anything by itself: validation happens only when you call `validate`.

- [Public API](#public-api)
- [Declaring validations](#declaring-validations)
- [When each part runs](#when-each-part-runs)
- [Inheritance and replacement](#inheritance-and-replacement)
- [Declaration checks](#declaration-checks)
- [Running validations](#running-validations)
- [Immutability](#immutability)
- [Where validations are stored](#where-validations-are-stored)
- [TypeScript setup](#typescript-setup)
- [Pitfalls](#pitfalls)

## Public API

| Export                    | Kind     | Purpose                                                                                              |
| ------------------------- | -------- | ---------------------------------------------------------------------------------------------------- |
| `Validations(list)`       | function | Class decorator that declares the class's validations                                                |
| `validate(Class, value)`  | function | Runs the class's validations, inherited ones included, against `value`, returns a `ValidationResult` |
| `Validation`              | type     | `BuiltInValidation \| CustomValidation`                                                              |
| `BuiltInValidation`       | type     | `{ validator, properties?, message? }`                                                               |
| `CustomValidation`        | type     | `{ custom, fn, message? }`                                                                           |
| `ValidatorName`           | type     | Names of the registry's validators (`'isInt'`, `'isEmail'`, …)                                       |
| `ValidationProperties<K>` | type     | The options object of validator `K`                                                                  |
| `ValidationResult<T>`     | type     | `ValidationSuccess<T> \| ValidationFailure<T>`                                                       |
| `ValidationSuccess<T>`    | type     | `{ ok: true, value, errors: [] }`                                                                    |
| `ValidationFailure<T>`    | type     | `{ ok: false, value, errors: ValidationError[] }`                                                    |
| `ValidationError`         | type     | `{ validator, message } \| { custom, message }`                                                      |
| `Validatable<T>`          | type     | An object that validates itself: `validate(): ValidationResult<T>`                                   |
| `ValidationError`         | type     | `{ validator, message } \| { custom, message }`                                                      |

## Declaring validations

The decorator takes an array. Each element is one of two kinds.

### Built-in validation

Runs one of the package's validators. `validator` is its name. `properties` is its options object,
passed as the second argument: `{ validator: 'isHash', properties: { algorithm: 'md5' } }` runs
`isHash(value, { algorithm: 'md5' })`.

The type of `properties` comes from the validator's signature:

| Validator signature                                         | `properties` |
| ----------------------------------------------------------- | ------------ |
| Has required options (`isHash`, `isIn`, `matches`, …)       | Required     |
| Has only optional options (`isInt`, `isEmail`, …)           | Optional     |
| Takes only the value (`isPort`, `isSlug`, … see the README) | Not allowed  |

```ts
@Validations([
  { validator: 'isHash', properties: { algorithm: 'sha256' } }, // required
  { validator: 'isInt', properties: { min: 1, max: 10 } }, // optional
  { validator: 'isPort' }, // none
])
class Example {}
```

### Custom validation

Brings its own rule. `custom` is its name (it appears in the errors) and `fn` decides: a truthy
result passes, a falsy one fails.

```ts
@Validations([{ custom: 'isEven', fn: (v) => Number(v) % 2 === 0, message: 'Must be even' }])
class Even {}
```

### `message`

Optional on both kinds. Without it the error message is `Value does not satisfy <name>`.

### Identity of a validation

Two validations are "the same" when they have the same kind and name: `validator: 'isInt'` is
one identity, `custom: 'isInt'` is another. A built-in and a custom with the same name never
replace each other. Identity decides duplicates and replacement (below). `properties`, `fn` and
`message` play no part in it.

## When each part runs

| Moment                                                               | What happens                                                                                                                                                    |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **The class is defined** (usually when its module is first imported) | The decorator runs once: checks the declaration, freezes a copy and stores it for that class. A wrong declaration throws here and stops the module from loading |
| **`new MyClass()`**                                                  | Nothing. The decorator adds no code to the constructor                                                                                                          |
| **`validate(MyClass, value)`**                                       | Walks the prototype chain, merges the stored lists, then runs each validation against the value, in order. Recomputed on each call, nothing is cached           |

Because `validate` recomputes the list on each call, it sees the classes as they are at that
moment. A parent decorated after its subclass was defined is still seen by the subclass.

Several decorators on one class apply bottom-up, as TypeScript always does: the one nearest the
class runs first.

```ts
@Validations([{ validator: 'isEmail' }]) // applied second
@Validations([{ validator: 'isInt' }, { validator: 'isPort' }]) // applied first
class Stacked {}
// validate(Stacked, value) runs: isInt, isPort, isEmail
```

## Inheritance and replacement

`validate(Child, value)` walks from the root parent down to `Child` and merges each class's own
validations before running them:

1. The root parent's validations come first, then each subclass's, in declaration order.
2. A subclass validation with the same identity as an inherited one **replaces** it. The
   replacement keeps the parent's position.
3. A class without `@Validations` in the middle of the chain passes its parent's validations on
   unchanged.
4. Declaring a subclass never changes the parent: `validate(Parent, value)` runs what it ran before.

```ts
@Validations([{ validator: 'isInt', properties: { min: 0 } }, { validator: 'isEmail' }])
class Parent {}

@Validations([{ validator: 'isInt', properties: { min: 5 } }, { validator: 'isPort' }])
class Child extends Parent {}

validate(Child, value);
// runs, in order:
//   isInt { min: 5 }   ← replaced, keeps first place
//   isEmail
//   isPort
```

Applying `@Validations` again to the same class follows the same rules: matching validations are
replaced in place and the new ones are appended.

## Declaration checks

The decorator checks every element when the class is decorated. On the first error it throws
`ValidationConfigError` and stores nothing for that class, not even the valid elements before the
wrong one.

| Declaration                                                                                      | Error message                                                                                  |
| ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| Applied to something that is not a class (a property, a plain object)                            | `@Validations can only decorate a class`                                                       |
| Argument is not an array                                                                         | `@Validations expects an array of validations`                                                 |
| Element is not an object                                                                         | `A validation must be an object`                                                               |
| Element has neither `validator` nor `custom`                                                     | `A validation needs "validator" or "custom"`                                                   |
| Element has both `validator` and `custom`                                                        | `A validation cannot have both "validator" and "custom"`                                       |
| `custom` is not a non-empty string                                                               | `"custom" must be a non-empty string`                                                          |
| Custom without a `fn` function                                                                   | `Custom "<name>" needs a "fn" function`                                                        |
| `validator` is not in the registry (a typo, a locale table such as `isAlphaLocales`, `toString`) | `Unknown validator "<name>"`                                                                   |
| The same identity twice in one list                                                              | `Validator "<name>" is declared more than once` / `Custom "<name>" is declared more than once` |

With TypeScript most of these are already compile errors. The runtime checks cover JavaScript
callers and casts.

Not checked at decoration: whether `properties` is right for the validator. The types enforce it.
A wrong value passed from JavaScript surfaces in `validate`, as described below.

## Running validations

```ts
const result = validate(Even, 3);
if (!result.ok) {
  // result.value: 3
  // result.errors: [{ custom: 'isEven', message: 'Must be even' }]
}
```

- **Every validation runs.** A failure does not stop the rest; you get one error per failed
  validation, in the same order.
- **`ok` = valid.** `ok` is `true` exactly when `errors` is empty.
- **`value` is the validated value**, as passed: not copied, not converted.
- **The result is frozen**, its errors included, and a new one is returned on each call.
- **Errors tell the kind apart.** A built-in error has `validator`, a custom one has `custom`:
  use `'validator' in error` to tell them apart.
- **Which values a validator accepts** follows its own rules (see _Contract_ in the README). A
  built-in validator never throws because of the value: an unacceptable value is just a failure.
- **What can throw:**
  - `ValidationConfigError` when `target` is not a class (an instance, a plain object, a string):
    `validate expects a class, not an instance or a value`.
  - `ValidationConfigError` from a built-in validator whose configuration is wrong (for example
    `isHash` without `algorithm` from JavaScript).
  - `ValidationConfigError` `Unknown validator "<name>"` when the class was decorated by another
    copy of the package that has a validator this copy lacks (see
    [Where validations are stored](#where-validations-are-stored)).
  - Anything your own `fn` throws. It is not caught: it propagates and stops the remaining
    validations. If a custom rule can fail on odd input, make `fn` return `false` instead.

A class without validations, or whose parents have none, is always valid: `validate` returns `{ ok: true, value, errors: [] }`.

## Immutability

The decorator stores a frozen deep copy of the plain objects and arrays in the declaration:

- Changing the declared array or its `properties` afterwards does not affect the class.
- The stored copies are frozen, so no code holding them can change a class's validations.
- Values that are not plain objects or arrays (a `RegExp`, a `Date`, the `fn` function) are kept
  as they are, not copied or frozen. Freezing a `RegExp` would break its `lastIndex`.

## Where validations are stored

The validations live in one registry, kept on `globalThis` under
`Symbol.for('@archi-code/validation/decorator.v1')`. Every copy of the package in the same
JavaScript realm finds the same registry, so a class decorated through one copy is seen by all:

- the CommonJS build (`require`) and the ES module build (`import`) loaded side by side;
- two installed copies of the package, for example at different paths in `node_modules`.

A separate realm (a worker, an iframe, a `vm` context) has its own `globalThis` and therefore its
own registry. Its classes are different objects anyway.

`v1` in the key is the shape of what is stored. A future release that stores something different
will use a new key, so it will not share a registry with this one. A newer copy with the same key
may still store a validator that an older copy does not know; the older `validate` then throws
`Unknown validator "<name>"` instead of skipping it.

## TypeScript setup

The decorator works with both decorator modes:

- **Legacy decorators** (`"experimentalDecorators": true`, the setting in this monorepo's
  `tsconfig.base.json`).
- **Standard decorators** (TypeScript 5+ without `experimentalDecorators`).

It does not need `emitDecoratorMetadata` or `reflect-metadata`.

## Pitfalls

**Pass the class, not an instance.** `validate(new Quantity(), value)` throws
`ValidationConfigError`. From an instance use
`validate(instance.constructor as typeof Quantity, value)`.

**A decoration error happens at import time.** A wrong declaration throws when the module that
defines the class is loaded, so it can surface as a failed import. That is intended: the error
appears at startup, not on the first value.
