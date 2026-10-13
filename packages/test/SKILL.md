---
name: archi-code-test
description: Test utilities from @archi-code/test - JsonCompare (readable differences between expected and actual JSON, with markers such as UUID()), DtoObjectMother (leveled DTO fixtures) and compile-time type assertions (Expect, Equal, IsAny...). Use it whenever the code imports @archi-code/test, when comparing JSON responses from an API or a repository in a test, creating object mothers or DTO fixtures, or writing type tests with Expect<Equal<...>>.
---

# archi-code-test

Test helpers that depend on no runner (Jest, Vitest, `node:test`): JSON comparison, DTO object
mothers and type assertions. It is installed as a development dependency.

## Full API

Before using a class, method, marker, option or type that does not appear in this skill, read
`node_modules/@archi-code/test/README.md`: it matches the installed version. Do not guess signatures
or options. If the package is not installed: `npm install --save-dev @archi-code/test`.

If that path does not exist (monorepo with workspaces, pnpm…), locate the package with
`node -p "require.resolve('@archi-code/test/package.json')"` and read the `README.md` in that
folder.

## Related skills

If they are installed in the project, use them together with this one:

- `archi-code-domain`: DTOs and aggregates under test.
- `archi-code-ephemeradb`: in-memory repositories for the tests.

## Import

```ts
import { DtoObjectMother, JsonCompare } from '@archi-code/test';
import type { Equal, Expect, ExpectFalse, ExpectValidArgs, NotAny } from '@archi-code/test';
```

CJS: `const { JsonCompare, DtoObjectMother } = require('@archi-code/test');`

Runtime values: only `JsonCompare` and `DtoObjectMother`; the rest are types (use `import type`).
There is no default export and no subpaths.

## Rules

- `JsonCompare` returns a `string[]` with the differences (`[]` = they match); it never throws on
  differences. Argument order: first the expected value (with markers), then the actual value.
- `DtoObjectMother.create(level, override, exclude)` is static and is called on the subclass, never
  with `new`. It includes the properties of every level `<= level`; `exclude` wins over level and
  override; it always assigns `levelValidation = level` to the object.
- Type assertions are checked with `tsc` (or a runner that type-checks, such as ts-jest); at runtime
  they do nothing.

## Recommended patterns

```ts
const diff = JsonCompare.strict(
  { id: 'UUID()', name: 'Ana', createdAt: 'IS_TIME()', token: 'IS_NOT_EMPTY()' },
  body,
);
expect(diff).toEqual([]);
```

```ts
class UserDtoMother extends DtoObjectMother<UserDto> {
  getNewDto(): UserDto {
    return new UserDto();
  }
  getDefaultValues(): Partial<UserDto> {
    return { id: '42e05ee0-ace6-4565-b86a-ffdb0590341e', name: 'Ana', email: 'ana@example.com' };
  }
  getPropertiesByLevel(): Record<number, (keyof UserDto)[]> {
    return { 1: ['id', 'name'], 2: ['email'] };
  }
}

UserDtoMother.create(1); // id, name, levelValidation: 1
UserDtoMother.create(2, { name: 'Luis' }, ['id']); // name: 'Luis', email, levelValidation: 2
```

Level 1 = required fields, higher levels = optional ones; validation tests use `exclude` to drop a
required field and `override` to put in an invalid value.

```ts
type cases = [
  Expect<Equal<ReturnType<typeof fn>, string>>,
  Expect<NotAny<typeof value>>,
  ExpectFalse<ExpectValidArgs<typeof fn, [number]>>,
];
// @ts-expect-error: checks that a case fails
type fails = Expect<Equal<string, number>>;
```

Grouping the cases in a `type cases = [...]` tuple avoids unused variables. If the linter flags
unused types, export them (`export type { cases }`).

## What not to do

- Do not swap the `JsonCompare` arguments: markers in the second argument are not interpreted
  (`'UUID()'` is compared as text).
- `UUID()` and `IS_TIME()` with an actual value that is not a string throw `TypeError` (with a
  number `value.search is not a function`; with `null`, `Cannot read properties of null`).
- `IS_TIME()` does not accept dates without milliseconds, without `Z`, nor `Date` objects.
- `IS_NOT_EMPTY()` accepts any value other than `''`, including `null` and `0`.
- It compares plain JSON: `Date`, `Map` and class instances are walked through their own keys (two
  different `Date`s give `[]`). Normalize with `JSON.parse(JSON.stringify(x))`.
- `1` and `'1'` are different (`'a: 1 -> 1'` in the message).
- `include` does not ignore extra keys in `expected`: they must exist in `actual`.
- Assert with `expect(diff).toEqual([])` (not `toBeTruthy`: `[]` is truthy).
- A `null`/`undefined` override in `DtoObjectMother.create` falls back to the default value: to
  drop a property use `exclude`.
- `ExpectExtends<VALUE, EXPECTED>` is `true` if `EXPECTED extends VALUE` (mind the order).
- Do not assume `JsonCompare.equals`, `assert`, `toMatch`, other markers, `ObjectMother`, `build`,
  `createMany` or `random`: check the installed README.
- Type assertions are imported with `import type`: with `verbatimModuleSyntax`,
  `import { Expect }` gives error TS1484.
