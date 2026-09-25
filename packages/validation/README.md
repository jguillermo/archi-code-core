# @archi-code/validation

String validators, type converters and sanitizers for TypeScript, in a single package. The
validators are a hardened port of [validator.js](https://github.com/validatorjs/validator.js).
There are no runtime dependencies, and the package ships dual CJS and ESM builds that also run
in the browser.

```bash
npm install @archi-code/validation
```

## Three tools

| Tool | Question it answers | Returns |
|---|---|---|
| `isX(value, …)` (also `validator.isX`) | Is this value a valid X? (email, URL, IBAN, phone…) | `boolean` |
| `toX(value, options?)` | Convert this value to type X. | `{ ok, value, error }` |
| `canBeX(value)` | Can this value be converted to type X? | `boolean` (always `toX(value).ok`) |

`convert/` is the only place where type rules live. `canBe` and the validators build on it and
never duplicate it, so `canBeX(v) === toX(v).ok` holds by construction.

```ts
import { isEmail, isIBAN, isMobilePhone, toInteger, canBeDate, sanitizer } from '@archi-code/validation';

isEmail('ana@example.com'); // true
isIBAN('DE89 3704 0044 0532 0130 00'); // true
isMobilePhone('+34612345678', 'es-ES'); // true

const n = toInteger(' 42 ');
if (n.ok) n.value; // 42 (narrowed to number)
toInteger('abc'); // { ok: false, value: null, error: 'Value is not an integer' }

canBeDate('2024-01-31'); // true
sanitizer.escape('<a>'); // '&lt;a&gt;'
```

## Tree-shaking: prefer named imports

Every validator is also exported on its own and is the very same function as its registry
member (`isEmail === validator.isEmail`). The package declares `"sideEffects": false`, so
bundlers keep only what you import:

```ts
import { isEmail } from '@archi-code/validation'; // isEmail + its helpers (~16 KB of ESM source)
import { validator } from '@archi-code/validation'; // every validator and locale table (~176 KB)
```

The sizes are unminified ESM source reachable from the import. Use `validator` when you need
dynamic access (`validator[name]`) or `createValidator`, and named imports everywhere else.

## Contract

- **A validator never throws because of the value.** `null`, objects, Symbols, huge strings and
  unpaired surrogates all return `false`.
- **Invalid configuration throws `ValidationConfigError`, and only that.** This covers unknown
  locales, country codes, algorithms or providers; a bad `decimal_digits`; a `host_blacklist`
  that is not an array; a pattern that is not a valid RegExp; and similar cases. The error is
  never a raw `TypeError` or `SyntaxError`.
- **`null` options mean "no options"**, exactly like `undefined`.
- **Converters never throw.** They always return `{ ok: true, value, error: null }` or
  `{ ok: false, value: null, error }`. `error` is one of the fixed `ConvertMessages` and never
  contains the value. A successful numeric result is always a finite number.
- **Non-string input.** Validators read their input with `toString`: strings are used as-is,
  finite numbers are converted with `String()`, and booleans become `'true'`/`'false'`. For
  example, `validator.isInt(5)` is `true`, and `validator.isAlpha(true)` is `true` because
  `'true'` is alphabetic.

## Converters and their options

| Function | Default rule | Notable options |
|---|---|---|
| `toString` | Strings, booleans and finite numbers | — |
| `toBoolean` | `true`/`false`, `1`/`0`, and trimmed, case-insensitive `'true'`/`'false'`/`'1'`/`'0'` | `mode: 'strict' \| 'loose'` (`'loose'` also accepts `'yes'`/`'no'`) |
| `toInteger` | Safe integers, as numbers or trimmed `-?\d+` strings (`INTEGER_OVERFLOW` beyond ±2^53) | `syntax: 'validator'` (the isInt rule) |
| `toFloat` | Finite numbers, or trimmed strings in plain decimal notation (no `0x`/`0b`/`0o`) | `syntax: 'validator'`, `decimalSeparator` |
| `toDate` | `YYYY/MM/DD` with `/` or `-` as delimiter; the result is that day at 00:00 UTC | `format`, `delimiters`, `strictMode`, `iso: true`, `lax: true` |
| `toJson` | A non-empty plain JSON object, as JSON text or as an object that survives a JSON round trip (plain objects/arrays with string, boolean, finite number or null leaves — no functions, Dates, class instances…) | — |
| `toJsonValue` | Any JSON text that parses to an object or array | `allowPrimitives`, `allowAnyValue` |
| `toArray` | Arrays, or JSON text holding an array | — |
| `toEnum` | A string, number or boolean whose text form is one of the options | — |

> ISO date-times need the ISO rule: `canBeDate('2024-01-31T10:00:00Z')` is `false`, while
> `toDate('2024-01-31T10:00:00Z', { iso: true })` is `ok`.

`anyToString(value)` gives a readable description of any value, for logs and error messages. It
never throws.

## Extending the validators

`validator` is frozen. To add your own validators, build a new registry:

```ts
import { createValidator } from '@archi-code/validation';

const v = createValidator({ isEven: (x: unknown) => Number(x) % 2 === 0 });
v.isEven(4); // true
v.isEmail('a@b.co'); // true, and all built-ins remain available and typed
```

## Differences from validator.js

This package deliberately diverges from validator.js wherever the original accepted unsafe or
wrong input.

**Security**

- **`isURL`** rejects a backslash in the authority. `http://evil.com\@good.com` is `false`
  because browsers treat `\` as `/`.
- **`isURL`** never reads a code-executing scheme as a user name: `javascript:foo@example.com`
  (also `vbscript:` and `data:`) is `false` unless `require_valid_protocol: false`. User and
  password must use RFC 3986 userinfo characters, and C0 controls or DEL anywhere in the URL are
  rejected.
- **`isURL` and `isEmail` host lists** compare hosts case-insensitively and ignore a trailing
  dot. A bracketed IPv6 host is checked against the whitelist by its address.
- **`isEmail`**: the quoted local part rejects CR, LF, DEL and other control characters (header
  injection), the local part rejects invisible characters (zero-width, bidi, BOM, non-ASCII
  spaces), and a display name requires the closing `>`.
- **`isFQDN`**, and therefore `isURL` and `isEmail`, rejects invisible characters, bidi
  controls, Unicode separators and unpaired surrogates in host names.

**Anchoring and syntax**

- `isCreditCard` (Mastercard), `isISO6346`, `isLicensePlate` (`pt-BR`, `fi-FI`),
  `isPassportNumber` (`MZ`, `PH`), `isLatLong` and several `isVAT` rules now reject leading or
  trailing garbage.
- `isMongoId` rejects a `0x`/`0h` prefix.
- `isVAT('', 'HN')` is `false`.

**Numbers**

- `isFloat` rejects `'.e5'`, `'e5'` and values beyond the number range such as `'1e400'`, and it
  reads the locale's decimal separator correctly.
- `isInt` compares bounds exactly beyond `Number.MAX_SAFE_INTEGER`, using BigInt on the
  original text.

**Dates**

- `isISO8601(…, { strict: true })` accepts years 0000–0099.
- `isAfter` and `isBefore` parse dates deterministically, independent of the machine's time
  zone. They accept ISO dates (including reduced precision such as `'2024'` or `'2024-03'`) and
  the output of `Date#toString()` and `Date#toUTCString()`, but not engine-dependent formats
  such as `'2030/01/01'` or `'Jan 1 2030'`.

**Other differences**

- `isAlpha` and `isAlphanumeric` take every character of `ignore` literally.
- `isIdentityCard` defaults to the `'any'` locale.
- `isJWT` rejects an empty header or payload.
- Unknown locales inside an `isMobilePhone` array throw instead of being skipped.
- `isTaxID` is not included.

## License

MIT
