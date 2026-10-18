---
name: archi-code-validation
description: Writes correct code with @archi-code/validation (is* validators that return boolean, to* converters that return { ok, value, error } without throwing, canBe*, sanitizers and the @Validations decorator with runValidations). Use it when you need to validate strings (emails, URLs, UUIDs, IBANs, phone numbers, dates, passwords…), convert input values with to*/canBe*, sanitize text, declare validations with @Validations, or whenever the code imports or uses @archi-code/validation.
---

# archi-code-validation

`@archi-code/validation` brings together string validators (a hardened port of validator.js), type
converters, sanitizers and the `@Validations` decorator for TypeScript, with no runtime
dependencies. This skill covers the rules, the patterns and the common mistakes; the full API is in
the README of the installed package.

## Full API

Before using a function, option or type that does not appear in this skill, read
`node_modules/@archi-code/validation/README.md`: it always matches the installed version. Do not
guess signatures, option names or locales. If the package is not installed:
`npm install @archi-code/validation`.

If that path does not exist (monorepo with workspaces, pnpm…), find the package with
`node -p "require.resolve('@archi-code/validation/package.json')"` and read the `README.md` in that
folder.

## Related skills

If they are installed in the project, use them together with this one:

- `archi-code-ddd`: value objects from `@archi-code/ddd/domain` that declare their rules with `@Validations`.

## Import

```ts
import { isEmail, toInteger, Validations, runValidations } from '@archi-code/validation';
```

```js
const { isEmail, toInteger } = require('@archi-code/validation');
```

Named exports only: there is no `export default` and there are no subpaths
(`@archi-code/validation/...`). Import each function by name; the `validator` object pulls in every
validator and is only meant for dynamic access (`validator[name]`).

## Rules

1. **The `is*` validators (and `contains`, `equals`, `matches`) only return `boolean`.** They never
   throw because of the value: `null`, `undefined`, objects, `Symbol`… return `false`.
2. **Validators only throw `ValidationConfigError`, and only because of configuration**: unknown
   locale, country, algorithm or provider; options that are not an object; a `pattern` that is not
   a valid RegExp…
3. **A single signature: `(value, options?)`.** The second argument is always an object, never
   positional. `null` as options is the same as not passing them.
4. **Non-string input:** strings as they are, finite numbers with `String()`, booleans as
   `'true'`/`'false'`; any other type gives `false`.
5. **The `to*` converters never throw** and return `Converted<T>`:
   `{ ok: true, value: T, error: null }` or `{ ok: false, value: null, error: ConvertMessage }`.
   The `error` is a fixed message from `ConvertMessages` and never contains the value.
6. **`canBeX(v) === toX(v).ok`** always (with the default options). Validate → `is*`; typed value
   → `to*` checking `ok`; only know whether it converts → `canBe*`.
7. **Sanitizers (`sanitizer.*`) require a string**: with any other type they throw `TypeError`.
8. `@Validations` checks the declaration when the class is defined (throws `ValidationConfigError`)
   and `runValidations(Class, value)` returns `{ ok, value, errors }` without throwing.

## Recommended patterns

```ts
import {
  isEmail,
  isMobilePhone,
  toInteger,
  toEnum,
  toDate,
  ValidationConfigError,
} from '@archi-code/validation';

if (!isEmail(body.email)) return badRequest('email');

const page = toInteger(query.page);
const pageNumber = page.ok ? page.value : 1;

const role = toEnum(body.role, ['admin', 'user'] as const);
if (!role.ok) return badRequest(role.error);

const at = toDate(body.at, { iso: true });

isMobilePhone(body.phone, { locale: ['es-ES', 'pt-PT'], strictMode: true });
```

```ts
import { Validations, runValidations } from '@archi-code/validation';
import type { Validatable, ValidationResult } from '@archi-code/validation';

@Validations([
  { validator: 'isRequired' },
  { validator: 'isLength', properties: { min: 2, max: 50 } },
  { custom: 'noDigits', fn: (v) => !/\d/.test(String(v)), message: 'No digits allowed' },
])
class Name implements Validatable<string> {
  constructor(readonly value: string) {}

  validate(): ValidationResult<string> {
    return runValidations(Name, this.value);
  }
}

new Name('A').validate();
// { ok: false, value: 'A', errors: [{ validator: 'isLength', message: 'Value does not satisfy isLength' }] }
```

- `toDate`/`canBeDate`/`isDate` only accept `YYYY/MM/DD` (or with `-`) by default; for ISO with a
  time, `toDate(v, { iso: true })`.
- Wrap in a `try/catch` for `ValidationConfigError` only when the locale/country/algorithm comes
  from external data; with fixed values, a configuration error is a bug that should surface.

## What not to do

- Wrong: `isLength(v, 2, 10)`, `isIP(v, 4)`, `isHash(v, 'md5')`, `isUUID(v, 4)`, `isAfter(v, date)`,
  `contains(v, 'x')`, `matches(v, /re/)` → right: `isLength(v, { min: 2, max: 10 })`,
  `isIP(v, { version: 4 })`, `isHash(v, { algorithm: 'md5' })`, `isUUID(v, { version: 4 })`,
  `isAfter(v, { comparisonDate: date })`, `contains(v, { elem: 'x' })`,
  `matches(v, { pattern: /re/ })`.
- Wrong: `isAlpha(v, 'es-ES')` / `isMobilePhone(v, 'es-ES')` → right: `{ locale: 'es-ES' }`.
- Wrong: `import validator from '@archi-code/validation'` → right: `import { validator } from …` or,
  better, import each function by name.
- Wrong: `try { toInteger(x) } catch` → converters do not throw; check `.ok`.
- Wrong: reading `.value` without checking `.ok` (it is `null` when the conversion fails).
- Wrong: expecting a validator to return anything other than `boolean` (there is no `returnScore`;
  for a score use `scorePassword`).
- Wrong: comparing `error` with made-up texts → use `ConvertMessages.INTEGER`, etc.
- Wrong: passing non-string values to `sanitizer.*` (throws `TypeError`): convert them first with
  `toString`.
- Wrong: `runValidations(new MyClass(), v)` → right: `runValidations(MyClass, v)` (with an instance:
  `instance.constructor as typeof MyClass`).
- Wrong: in `@Validations`, `options:` or a bare value in `properties` (`properties: 'md5'`) →
  right: `properties: { algorithm: 'md5' }`.
- Wrong: declaring the same `validator` twice in one list (throws when decorating); to change it in
  a subclass, redeclare it there.
- Wrong: `isLicensePlate(v, { locale: 'es-ES' })`: that locale does not exist and it throws
  `ValidationConfigError`; use a supported one or `'any'`.
- Wrong: inventing validator.js validators that are not here (e.g. `isTaxID`) or importing internal
  paths.
- Wrong: guessing the signature or options of a function that does not appear here → read it in the
  installed README.
