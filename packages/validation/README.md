# @archi-code/validation

String validators, type converters and sanitizers for TypeScript, in a single package. The
validators are a hardened port of [validator.js](https://github.com/validatorjs/validator.js).
There are no runtime dependencies, and the package ships dual CJS and ESM builds that also run
in the browser.

```bash
npm install @archi-code/validation
```

## Three tools

| Tool                                          | Question it answers                                 | Returns                            |
| --------------------------------------------- | --------------------------------------------------- | ---------------------------------- |
| `isX(value, options?)` (also `validator.isX`) | Is this value a valid X? (email, URL, IBAN, phone…) | `boolean`                          |
| `toX(value, options?)`                        | Convert this value to type X.                       | `{ ok, value, error }`             |
| `canBeX(value)`                               | Can this value be converted to type X?              | `boolean` (always `toX(value).ok`) |

`convert/` is the only place where type rules live. `canBe` and the validators build on it and
never duplicate it, so `canBeX(v) === toX(v).ok` holds by construction.

```ts
import {
  isEmail,
  isIBAN,
  isMobilePhone,
  toInteger,
  canBeDate,
  sanitizer,
} from '@archi-code/validation';

isEmail('ana@example.com'); // true
isIBAN('DE89 3704 0044 0532 0130 00'); // true
isMobilePhone('+34612345678', { locale: 'es-ES' }); // true

const n = toInteger(' 42 ');
if (n.ok) n.value; // 42 (narrowed to number)
toInteger('abc'); // { ok: false, value: null, error: 'Value is not an integer' }

canBeDate('2024-01-31'); // true
sanitizer.escape('<a>'); // '&lt;a&gt;'
```

## Validator signatures

Every validator takes the value and, at most, one options object. There are three forms:

```ts
isPort(value); // only the value
isAlpha(value, options?); // every option is optional
isVAT(value, options); // the options object has at least one required property
```

- `value` is always `unknown`: the validator reads it and returns `false` when it is not valid.
- `options` is typed by the `<Validator>Options` interface exported next to the validator
  (`IsVATOptions`, `IsAlphaOptions`, `MatchesOptions`…). A missing optional property takes the
  validator's default.
- There are no positional parameters or shorthand forms: `isLength(v, 2, 10)`,
  `isIP(v, 4)` or `isAfter(v, '2024-01-01')` are configuration errors. Use
  `isLength(v, { min: 2, max: 10 })`, `isIP(v, { version: 4 })` and
  `isAfter(v, { comparisonDate: '2024-01-01' })`.

```ts
import { isAlpha, isHash, isVAT } from '@archi-code/validation';
import type { IsAlphaOptions } from '@archi-code/validation';

const spanish: IsAlphaOptions = { locale: 'es-ES', ignore: ' ' };
isAlpha('año nuevo', spanish); // true
isAlpha('abc'); // true (locale defaults to 'en-US')
isHash('d41d8cd98f00b204e9800998ecf8427e', { algorithm: 'md5' }); // true
isVAT('GB999 9999 00', { countryCode: 'GB' }); // true
```

### Validators with required options

| Validator          | Options                   | Required      | Optional                                                       |
| ------------------ | ------------------------- | ------------- | -------------------------------------------------------------- |
| `contains`         | `ContainsOptions`         | `elem`        | `ignoreCase` (default `false`), `minOccurrences` (default `1`) |
| `equals`           | `EqualsOptions`           | `comparison`  | —                                                              |
| `isDivisibleBy`    | `IsDivisibleByOptions`    | `num`         | —                                                              |
| `isHash`           | `IsHashOptions`           | `algorithm`   | —                                                              |
| `isIn`             | `IsInOptions`             | `values`      | —                                                              |
| `isLicensePlate`   | `IsLicensePlateOptions`   | `locale`      | —                                                              |
| `isPassportNumber` | `IsPassportNumberOptions` | `countryCode` | —                                                              |
| `isPostalCode`     | `IsPostalCodeOptions`     | `locale`      | —                                                              |
| `isVAT`            | `IsVATOptions`            | `countryCode` | —                                                              |
| `isWhitelisted`    | `IsWhitelistedOptions`    | `chars`       | —                                                              |
| `matches`          | `MatchesOptions`          | `pattern`     | `modifiers`                                                    |

### Validators with optional options

| Validator          | Options                   | Properties                                                                                                           |
| ------------------ | ------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `isAfter`          | `IsAfterOptions`          | `comparisonDate` (default: now)                                                                                      |
| `isAlpha`          | `IsAlphaOptions`          | `locale` (default `'en-US'`), `ignore`                                                                               |
| `isAlphanumeric`   | `IsAlphanumericOptions`   | `locale` (default `'en-US'`), `ignore`                                                                               |
| `isBase32`         | `IsBase32Options`         | `crockford`                                                                                                          |
| `isBase64`         | `IsBase64Options`         | `urlSafe`, `padding`                                                                                                 |
| `isBefore`         | `IsBeforeOptions`         | `comparisonDate` (default: now)                                                                                      |
| `isBoolean`        | `IsBooleanOptions`        | `loose` (default `false`)                                                                                            |
| `isByteLength`     | `IsByteLengthOptions`     | `min` (default `0`), `max`                                                                                           |
| `isCreditCard`     | `IsCreditCardOptions`     | `provider`                                                                                                           |
| `isCurrency`       | `IsCurrencyOptions`       | `symbol`, `require_symbol`, `thousands_separator`, `decimal_separator`… (15 options)                                 |
| `isDate`           | `IsDateOptions`           | `format` (default `'YYYY/MM/DD'`), `strictMode`, `delimiters`, `twoDigitYearPivot`                                   |
| `isDecimal`        | `IsDecimalOptions`        | `force_decimal`, `decimal_digits`, `locale`                                                                          |
| `isEmail`          | `IsEmailOptions`          | `allow_display_name`, `require_tld`, `host_whitelist`, `host_blacklist`… (11 options)                                |
| `isEmpty`          | `IsEmptyOptions`          | `ignore_whitespace`                                                                                                  |
| `isFQDN`           | `IsFQDNOptions`           | `require_tld`, `allow_underscores`, `allow_trailing_dot`, `allow_numeric_tld`, `allow_wildcard`, `ignore_max_length` |
| `isFloat`          | `IsFloatOptions`          | `min`, `max`, `lt`, `gt`, `locale`                                                                                   |
| `isHexColor`       | `IsHexColorOptions`       | `require_hashtag`                                                                                                    |
| `isIBAN`           | `IsIBANOptions`           | `whitelist`, `blacklist`                                                                                             |
| `isIdentityCard`   | `IsIdentityCardOptions`   | `locale` (default `'any'`)                                                                                           |
| `isIMEI`           | `IsIMEIOptions`           | `allow_hyphens`                                                                                                      |
| `isInt`            | `IsIntOptions`            | `min`, `max`, `lt`, `gt`, `allow_leading_zeroes`                                                                     |
| `isIP`             | `IsIPOptions`             | `version` (default: 4 or 6)                                                                                          |
| `isIPRange`        | `IsIPRangeOptions`        | `version` (default: 4 or 6)                                                                                          |
| `isISBN`           | `IsISBNOptions`           | `version` (default: 10 or 13)                                                                                        |
| `isISO31661Alpha2` | `IsISO31661Alpha2Options` | `userAssignedCodes`                                                                                                  |
| `isISO31661Alpha3` | `IsISO31661Alpha3Options` | `userAssignedCodes`                                                                                                  |
| `isISO8601`        | `IsISO8601Options`        | `strict`, `strictSeparator`                                                                                          |
| `isISSN`           | `IsISSNOptions`           | `case_sensitive`, `require_hyphen`                                                                                   |
| `isJSON`           | `IsJSONOptions`           | `allow_primitives`, `allow_any_value`                                                                                |
| `isLatLong`        | `IsLatLongOptions`        | `checkDMS`                                                                                                           |
| `isLength`         | `IsLengthOptions`         | `min` (default `0`), `max`, `discreteLengths`, `graphemes`                                                           |
| `isMACAddress`     | `IsMACAddressOptions`     | `no_separators`, `no_colons`, `eui`                                                                                  |
| `isMailtoURI`      | `IsMailtoURIOptions`      | the `isEmail` options, applied to every address                                                                      |
| `isMobilePhone`    | `IsMobilePhoneOptions`    | `locale` (one, a list, or `'any'`; default: any), `strictMode`                                                       |
| `isNumeric`        | `IsNumericOptions`        | `no_symbols`, `locale`                                                                                               |
| `isRgbColor`       | `IsRgbColorOptions`       | `includePercentValues`, `allowSpaces`                                                                                |
| `isStrongPassword` | `IsStrongPasswordOptions` | `minLength`, `minLowercase`, `minUppercase`, `minNumbers`, `minSymbols`                                              |
| `isTime`           | `IsTimeOptions`           | `hourFormat`, `mode`                                                                                                 |
| `isURL`            | `IsURLOptions`            | `protocols`, `require_tld`, `require_protocol`, `host_whitelist`… (19 options)                                       |
| `isUUID`           | `IsUUIDOptions`           | `version` (default `'all'`)                                                                                          |

The full list of each validator's options, with their documentation, is in its interface: the
editor autocompletes them and flags unknown ones.

### Validators that only take the value

`isAbaRouting`, `isAscii`, `isBase58`, `isBIC`, `isBtcAddress`, `isDataURI`, `isEAN`,
`isEthereumAddress`, `isFullWidth`, `isHalfWidth`, `isHexadecimal`, `isHSL`, `isISIN`,
`isISO15924`, `isISO31661Numeric`, `isISO4217`, `isISO6346` (also `isFreightContainerID`),
`isISO6391`, `isISRC`, `isJWT`, `isLocale`, `isLowercase`, `isLuhnNumber`, `isMagnetURI`, `isMD5`,
`isMimeType`, `isMongoId`, `isMultibyte`, `isOctal`, `isPort`, `isRFC3339`, `isSemVer`, `isSlug`,
`isSurrogatePair`, `isULID`, `isUppercase`, `isVariableWidth`.

## Tree-shaking: prefer named imports

Every validator is also exported on its own and is the very same function as its registry
member (`isEmail === validator.isEmail`). The package declares `"sideEffects": false`, so
bundlers keep only what you import:

```ts
import { isEmail } from '@archi-code/validation'; // isEmail + its helpers (~16 KB of ESM source)
import { validator } from '@archi-code/validation'; // every validator and locale table (~176 KB)
```

The sizes are unminified ESM source reachable from the import. Use `validator` when you need
dynamic access (`validator[name]`), and named imports everywhere else.

## Contract

- **A validator never throws because of the value.** `null`, objects, Symbols, huge strings and
  unpaired surrogates all return `false`.
- **Invalid configuration throws `ValidationConfigError`, and only that.** This covers unknown
  locales, country codes, algorithms or providers; a bad `decimal_digits`; a `host_blacklist`
  that is not an array; a pattern that is not a valid RegExp; and similar cases. The error is
  never a raw `TypeError` or `SyntaxError`.
- **One options object.** Every validator takes the value and, at most, one options object (see
  [Validator signatures](#validator-signatures)). A string or a number in place of the object is
  a configuration error.
- **`null` options mean "no options"**, exactly like `undefined`.
- **Converters never throw.** They always return `{ ok: true, value, error: null }` or
  `{ ok: false, value: null, error }`. `error` is one of the fixed `ConvertMessages` and never
  contains the value. A successful numeric result is always a finite number.
- **Non-string input.** Validators read their input with `toString`: strings are used as-is,
  finite numbers are converted with `String()`, and booleans become `'true'`/`'false'`. For
  example, `validator.isInt(5)` is `true`, and `validator.isAlpha(true)` is `true` because
  `'true'` is alphabetic.

## Converters and their options

| Function      | Default rule                                                                                                                                                                                                  | Notable options                                                     |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `toString`    | Strings, booleans and finite numbers                                                                                                                                                                          | —                                                                   |
| `toBoolean`   | `true`/`false`, `1`/`0`, and trimmed, case-insensitive `'true'`/`'false'`/`'1'`/`'0'`                                                                                                                         | `mode: 'strict' \| 'loose'` (`'loose'` also accepts `'yes'`/`'no'`) |
| `toInteger`   | Safe integers, as numbers or trimmed `-?\d+` strings (`INTEGER_OVERFLOW` beyond ±2^53)                                                                                                                        | `syntax: 'validator'` (the isInt rule)                              |
| `toFloat`     | Finite numbers, or trimmed strings in plain decimal notation (no `0x`/`0b`/`0o`)                                                                                                                              | `syntax: 'validator'`, `decimalSeparator`                           |
| `toDate`      | `YYYY/MM/DD` with `/` or `-` as delimiter; the result is that day at 00:00 UTC                                                                                                                                | `format`, `delimiters`, `strictMode`, `iso: true`, `lax: true`      |
| `toJson`      | A non-empty plain JSON object, as JSON text or as an object that survives a JSON round trip (plain objects/arrays with string, boolean, finite number or null leaves — no functions, Dates, class instances…) | —                                                                   |
| `toJsonValue` | Any JSON text that parses to an object or array                                                                                                                                                               | `allowPrimitives`, `allowAnyValue`                                  |
| `toArray`     | Arrays, or JSON text holding an array                                                                                                                                                                         | —                                                                   |
| `toEnum`      | A string, number or boolean whose text form is one of the options                                                                                                                                             | —                                                                   |

> ISO date-times need the ISO rule: `canBeDate('2024-01-31T10:00:00Z')` is `false`, while
> `toDate('2024-01-31T10:00:00Z', { iso: true })` is `ok`.

`anyToString(value)` gives a readable description of any value, for logs and error messages. It
never throws.

## Validations decorator

Declare a class's validations with `@Validations` and run them with `validate(Class, value)`.
A built-in validation names its `validator` and gives its parameters as a single `properties`
object (required when the validator needs something, not allowed when it takes nothing). A custom validation names itself with `custom` and brings its own `fn`.

```ts
import { Validations, validate } from '@archi-code/validation';

@Validations([{ validator: 'isInt', properties: { min: 0 } }])
class Quantity {}

@Validations([
  { validator: 'isInt', properties: { min: 5 } }, // replaces the parent's isInt
  { custom: 'isEven', fn: (v) => Number(v) % 2 === 0, message: 'Must be even' },
])
class Pairs extends Quantity {}

// Pairs runs isInt { min: 5 }, then isEven — parent first, in declaration order
validate(Pairs, '3');
// { ok: false, value: '3', errors: [
//   { validator: 'isInt', message: 'Value does not satisfy isInt' },
//   { custom: 'isEven', message: 'Must be even' } ] }
```

`properties` is the validator's options object, passed as is:
`{ validator: 'isVAT', properties: { countryCode: 'ES' } }` runs `isVAT(value, { countryCode: 'ES' })`.

A built-in and a custom with the same name are different validations: neither replaces the other.
A subclass, or a later `@Validations` on the same class, replaces a matching validation in its
place. `validate` runs every validation, even after one fails, and returns `{ ok, value, errors }`:
`ok` is true when `errors` is empty. The declaration is checked when the class is decorated: an unknown validator, a
custom without its `fn`, a validation with both `validator` and `custom`, or the same validation
declared twice in one list throws `ValidationConfigError` right there, not on the first `validate`.

Full guide — when each part runs, inheritance, every check and pitfalls:
[docs/decorator.md](docs/decorator.md).

## Differences from validator.js

This package deliberately diverges from validator.js wherever the original accepted unsafe or
wrong input.

**Signatures**

validator.js passes some parameters positionally and accepts shorthand forms. Here they are
all properties of the options object:

| validator.js                               | @archi-code/validation                                                      |
| ------------------------------------------ | --------------------------------------------------------------------------- |
| `isAlpha(v, locale, { ignore })`           | `isAlpha(v, { locale, ignore })` (same for `isAlphanumeric`)                |
| `isMobilePhone(v, locale, { strictMode })` | `isMobilePhone(v, { locale, strictMode })`                                  |
| `contains(v, elem, options)`               | `contains(v, { elem, ignoreCase, minOccurrences })`                         |
| `matches(v, pattern, modifiers)`           | `matches(v, { pattern, modifiers })`                                        |
| `equals(v, comparison)`                    | `equals(v, { comparison })`                                                 |
| `isDivisibleBy(v, num)`                    | `isDivisibleBy(v, { num })`                                                 |
| `isHash(v, algorithm)`                     | `isHash(v, { algorithm })`                                                  |
| `isIn(v, values)`                          | `isIn(v, { values })`                                                       |
| `isWhitelisted(v, chars)`                  | `isWhitelisted(v, { chars })`                                               |
| `isPostalCode(v, locale)`                  | `isPostalCode(v, { locale })` (same for `isLicensePlate`, `isIdentityCard`) |
| `isVAT(v, countryCode)`                    | `isVAT(v, { countryCode })` (same for `isPassportNumber`)                   |
| `isUUID(v, version)`                       | `isUUID(v, { version })` (same for `isIPRange`)                             |
| `isIP(v, version)`                         | `isIP(v, { version })` (same for `isISBN`)                                  |
| `isLength(v, min, max)`                    | `isLength(v, { min, max })` (same for `isByteLength`)                       |
| `isDate(v, format)`                        | `isDate(v, { format })`                                                     |
| `isAfter(v, date)`                         | `isAfter(v, { comparisonDate })` (same for `isBefore`)                      |

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
- `isVAT('', { countryCode: 'HN' })` is `false`.

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
