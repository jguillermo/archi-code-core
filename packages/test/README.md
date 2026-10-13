# @archi-code/test

Test utilities: compares JSON values and returns a readable list of differences (with markers for
UUIDs, dates and non-empty values), builds test DTOs with a leveled _object mother_ and checks types
at compile time. The package ships CJS and ESM builds and depends on `@archi-code/validation`.

## Installation

```bash
npm install --save-dev @archi-code/test
```

Requires Node.js 24 or later. Works with any runner (Jest, Vitest, `node:test`…): it depends on
none of them.

## Import

ESM / TypeScript:

```ts
import { DtoObjectMother, JsonCompare } from '@archi-code/test';
import type { Equal, Expect } from '@archi-code/test';
```

CommonJS:

```js
const { JsonCompare } = require('@archi-code/test');

JsonCompare.strict({ a: 1 }, { a: 1 }); // []
```

The type assertions are types only: import them with `import type` (they do not exist at runtime).

## `JsonCompare`

Compares two JSON-like values (objects, arrays, strings, numbers, booleans and `null`) and returns a
`string[]` with the differences; an empty array means they match. It does not throw on differences:
you decide how to assert (`expect(diff).toEqual([])`, `assert.deepEqual(diff, [])`…), and the
failure message already shows what does not match.

The first argument is the **expected** value (it may contain markers) and the second one the
**actual** value. Each value difference is written as `path: expected -> actual`.

### `JsonCompare.strict(expected, actual)`

Requires the same keys and the same array lengths:

```ts
JsonCompare.strict({ a: 1, b: 'x' }, { a: 1, b: 'y' }); // ['b: x -> y']
JsonCompare.strict({ a: 1 }, { a: 1 }); // []
JsonCompare.strict({ a: 1 }, { a: 1, b: 2 }); // ['b: key not found']
JsonCompare.strict({ a: 1, c: 3 }, { a: 1 }); // ['c: extra key found']
JsonCompare.strict({ user: { tags: ['a'] } }, { user: { tags: ['a', 'b'] } });
// ['user.tags: length of ["a"] is not equal to length of ["a","b"]']
```

- `key not found`: the key is in the actual value and missing from the expected one.
- `extra key found`: the key is in the expected value and missing from the actual one.
- Primitives are compared with `===`: `JsonCompare.strict({ a: 1 }, { a: '1' })` returns
  `['a: 1 -> 1']` (number versus string).

### `JsonCompare.include(expected, actual)`

Checks that the expected value is contained in the actual one: extra keys in the actual value are
ignored, and in arrays only the positions the expected value has are compared.

```ts
JsonCompare.include({ a: 1 }, { a: 1, b: 2 }); // []
JsonCompare.include({ a: 1, c: 3 }, { a: 1 }); // ['c: extra key found']
JsonCompare.include([{ id: 1 }], [{ id: 1, name: 'x' }, { id: 2 }]); // []
```

### Markers

In the expected value, these exact strings validate a format instead of a specific value:

| Marker             | Accepts in the actual value                                                                                 |
| ------------------ | ----------------------------------------------------------------------------------------------------------- |
| `'UUID()'`         | a lowercase UUID string (version 0–5; the first character of the fourth group is `0`, `8`, `9`, `a` or `b`) |
| `'IS_TIME()'`      | an ISO 8601 UTC string with milliseconds, like `new Date().toISOString()` (`2024-01-31T10:20:30.123Z`)      |
| `'IS_NOT_EMPTY()'` | any value other than the empty string `''`                                                                  |

```ts
const response = {
  id: '42e05ee0-ace6-4565-b86a-ffdb0590341e',
  name: 'Ana',
  createdAt: '2024-01-31T10:20:30.123Z',
  token: 'abc',
};

const expected = {
  id: 'UUID()',
  name: 'Ana',
  createdAt: 'IS_TIME()',
  token: 'IS_NOT_EMPTY()',
};

JsonCompare.strict(expected, response); // []
JsonCompare.strict(expected, { ...response, id: 'abc', token: '' });
// ['id: UUID() -> abc', 'token: IS_NOT_EMPTY() -> ']
```

Markers only work in the first argument. `UUID()` and `IS_TIME()` expect a string in the actual
value: with any other type they throw `TypeError` (with a number, `value.search is not a function`).

### Constructor

`new JsonCompare(expected, actual, strict = false)` does the same and exposes the result in
`differences`:

```ts
new JsonCompare({ a: 1 }, { a: 1, b: 2 }).differences; // []
new JsonCompare({ a: 1 }, { a: 1, b: 2 }, true).differences; // ['b: key not found']
```

### Use in a test

```ts
expect(JsonCompare.include({ id: 'UUID()', name: 'Ana' }, await response.json())).toEqual([]);
```

Compare data already serialized to JSON. Objects that are not plain (for example `Date`) are walked
through their own keys and two different `Date`s produce no differences: pass them through
`JSON.parse(JSON.stringify(value))` or compare their ISO strings.

## `DtoObjectMother<T>`

Abstract class to create test DTOs by levels: level 1 fills the minimum properties and each higher
level adds more. You extend it by implementing three methods:

| Method                   | Returns                       | Use                            |
| ------------------------ | ----------------------------- | ------------------------------ |
| `getNewDto()`            | `T`                           | Empty instance of the DTO      |
| `getDefaultValues()`     | `Partial<T>`                  | Default value of each property |
| `getPropertiesByLevel()` | `Record<number, (keyof T)[]>` | Properties each level adds     |

```ts
class UserDto {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
}

class UserDtoMother extends DtoObjectMother<UserDto> {
  getNewDto(): UserDto {
    return new UserDto();
  }

  getDefaultValues(): Partial<UserDto> {
    return {
      id: '42e05ee0-ace6-4565-b86a-ffdb0590341e',
      name: 'Ana',
      email: 'ana@example.com',
      phone: '600000000',
    };
  }

  getPropertiesByLevel(): Record<number, (keyof UserDto)[]> {
    return { 1: ['id', 'name'], 2: ['email'], 3: ['phone'] };
  }
}
```

### `create(level, override = {}, exclude = [])`

Static method called on the subclass that returns an instance of `T` (the one from `getNewDto()`).
It includes the properties of every level `<= level` with their default values. The results show
the properties that have a value:

```ts
const user = UserDtoMother.create(1);
// { id: '42e05ee0-ace6-4565-b86a-ffdb0590341e', name: 'Ana', levelValidation: 1 }
user instanceof UserDto; // true

UserDtoMother.create(2);
// { id: '42e05ee0-…', name: 'Ana', email: 'ana@example.com', levelValidation: 2 }

UserDtoMother.create(3, { name: 'Luis' });
// { id: '42e05ee0-…', name: 'Luis', email: 'ana@example.com', phone: '600000000', levelValidation: 3 }

UserDtoMother.create(1, { phone: '611111111' });
// { id: '42e05ee0-…', name: 'Ana', phone: '611111111', levelValidation: 1 }

UserDtoMother.create(2, {}, ['email']);
// { id: '42e05ee0-…', name: 'Ana', levelValidation: 2 }
```

- `override`: replaces values and adds properties even if they belong to a higher level. A `null` or
  `undefined` override is ignored and the default value is used.
- `exclude`: properties that are not assigned, even if they are in the level or in `override`.
- It always assigns `levelValidation = level` to the result. If you want to read it with types,
  declare it in your DTO (`levelValidation?: number`).

## Type assertions

Types to check at compile time what TypeScript infers. An assertion that does not hold is a `tsc`
error (`Type 'false' does not satisfy the constraint 'true'`), so they are checked with
`tsc --noEmit` or with a runner that type-checks (for example, ts-jest).

| Type                                        | Result                                                                                |
| ------------------------------------------- | ------------------------------------------------------------------------------------- |
| `Expect<T>` / `ExpectTrue<T>` / `IsTrue<T>` | requires `T` to be `true`                                                             |
| `ExpectFalse<T>` / `IsFalse<T>`             | requires `T` to be `false`                                                            |
| `Equal<X, Y>`                               | `true` if `X` and `Y` are identical (tells `any` apart, and `A & B` from its object)  |
| `NotEqual<X, Y>`                            | negation of `Equal`                                                                   |
| `IsAny<T>` / `NotAny<T>`                    | `true` if `T` is (or is not) `any`                                                    |
| `Alike<X, Y>`                               | like `Equal`, but flattening intersections (`{ a: 1 } & { b: 2 }` ≈ `{ a: 1; b: 2 }`) |
| `ExpectExtends<VALUE, EXPECTED>`            | `true` if `EXPECTED` is assignable to `VALUE`                                         |
| `ExpectValidArgs<FUNC, ARGS>`               | `true` if the tuple `ARGS` is valid as arguments of `FUNC`                            |
| `Debug<T>`                                  | flattens one level of `T` (useful to see the resulting type)                          |
| `MergeInsertions<T>`                        | flattens `T` recursively                                                              |
| `UnionToIntersection<U>`                    | turns `A \| B` into `A & B`                                                           |

```ts
import type {
  Alike,
  Debug,
  Equal,
  Expect,
  ExpectExtends,
  ExpectFalse,
  ExpectTrue,
  ExpectValidArgs,
  IsAny,
  IsFalse,
  IsTrue,
  MergeInsertions,
  NotAny,
  NotEqual,
  UnionToIntersection,
} from '@archi-code/test';

type User = { id: string; name: string };
function greet(name: string, times: number): string {
  return name.repeat(times);
}

type cases = [
  Expect<Equal<User, { id: string; name: string }>>,
  Expect<NotEqual<User, { id: string }>>,
  ExpectTrue<Equal<ReturnType<typeof greet>, string>>,
  ExpectFalse<Equal<string, 'a'>>,
  IsTrue<IsAny<any>>,
  IsFalse<IsAny<unknown>>,
  Expect<NotAny<string>>,
  Expect<ExpectExtends<string, 'a'>>,
  ExpectFalse<ExpectExtends<'a', string>>,
  Expect<ExpectValidArgs<typeof greet, ['hello', 2]>>,
  ExpectFalse<ExpectValidArgs<typeof greet, [2, 'hello']>>,
  Expect<Alike<{ a: 1 } & { b: 2 }, { a: 1; b: 2 }>>,
  ExpectFalse<Equal<{ a: 1 } & { b: 2 }, { a: 1; b: 2 }>>,
  Expect<Equal<Debug<{ a: 1 } & { b: 2 }>, { a: 1; b: 2 }>>,
  Expect<Equal<MergeInsertions<{ x: { a: 1 } & { b: 2 } }>, { x: { a: 1; b: 2 } }>>,
  Expect<Equal<UnionToIntersection<{ a: 1 } | { b: 2 }>, { a: 1 } & { b: 2 }>>,
];

// @ts-expect-error: string and number are not equal
type fails = Expect<Equal<string, number>>;
```

## Exports summary

| Export                | Type           | Use                                                                                                                 |
| --------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------- |
| `JsonCompare`         | class          | `strict(expected, actual)` / `include(expected, actual)` → `string[]`; `new JsonCompare(e, a, strict?).differences` |
| `DtoObjectMother<T>`  | abstract class | `create(level, override?, exclude?)` on subclasses with `getNewDto`, `getDefaultValues`, `getPropertiesByLevel`     |
| `Expect`              | type           | requires `true`                                                                                                     |
| `ExpectTrue`          | type           | requires `true`                                                                                                     |
| `ExpectFalse`         | type           | requires `false`                                                                                                    |
| `IsTrue`              | type           | requires `true`                                                                                                     |
| `IsFalse`             | type           | requires `false`                                                                                                    |
| `Equal`               | type           | exact type equality                                                                                                 |
| `NotEqual`            | type           | type inequality                                                                                                     |
| `IsAny`               | type           | `T` is `any`                                                                                                        |
| `NotAny`              | type           | `T` is not `any`                                                                                                    |
| `Alike`               | type           | equality flattening intersections                                                                                   |
| `ExpectExtends`       | type           | assignability                                                                                                       |
| `ExpectValidArgs`     | type           | valid arguments for a function                                                                                      |
| `Debug`               | type           | flattens one level                                                                                                  |
| `MergeInsertions`     | type           | flattens recursively                                                                                                |
| `UnionToIntersection` | type           | union → intersection                                                                                                |

## AI assistant skill

The package ships `SKILL.md`, a Claude Code skill with the rules, the recommended patterns and the
common mistakes. For the full API it points to this README inside `node_modules`, so it stays valid
when you update the package. To install it in your project:

```bash
mkdir -p .claude/skills/archi-code-test && cp node_modules/@archi-code/test/SKILL.md .claude/skills/archi-code-test/SKILL.md
```

### How to use

Invoke it with a request:

```text
/archi-code-test create a UserDtoMother with level 1 for the required fields and level 2 for the optional ones
```

Or ask for the task without naming it and Claude loads it on its own because it matches its
description:

```text
Write a test that compares the response of POST /users with JsonCompare, accepting any id and createdAt
```

It also works to review code that already uses the package:

```text
/archi-code-test review the type tests and move them to Expect<Equal<...>>
```

With the skill loaded, Claude follows its rules, avoids the mistakes in its "What not to do" list
and, before using anything the skill does not show, reads this README in `node_modules`.

### Keeping it up to date

- The copy does not update itself: after updating `@archi-code/test`, run the command above again.
- Commit `.claude/skills/archi-code-test/` to the repository so the whole team uses it.

## License

MIT
