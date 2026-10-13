# @archi-code/validation

String validators, type converters and sanitizers for TypeScript in a single package.
The validators are a hardened port of [validator.js](https://github.com/validatorjs/validator.js).
It has no runtime dependencies and ships CJS and ESM builds that also work in the browser.

- [Installation](#installation)
- [Import](#import)
- [Three tools](#three-tools)
- [Contract](#contract)
- [`is*` validators](#is-validators)
- [`to*` converters](#to-converters)
- [`canBe*` checks](#canbe-checks)
- [Sanitizers](#sanitizers)
- [Passwords: `isStrongPassword` and `scorePassword`](#passwords-isstrongpassword-and-scorepassword)
- [`@Validations` decorator and `runValidations`](#validations-decorator-and-runvalidations)
- [Errors and exceptions](#errors-and-exceptions)
- [Exported types](#exported-types)
- [Differences from validator.js](#differences-from-validatorjs)
- [AI assistant skill](#ai-assistant-skill)
- [License](#license)

## Installation

```bash
npm install @archi-code/validation
```

Requires Node.js 24 or later. In the browser, the `browser` field and the `browser` condition of
`exports` point to the ESM build.

## Import

Everything is a named export (there is no `export default`).

```ts
// ESM / TypeScript
import { isEmail, toInteger, canBeDate, sanitizer } from '@archi-code/validation';
import type { IsEmailOptions, Converted } from '@archi-code/validation';
```

```js
// CommonJS
const { isEmail, toInteger, canBeDate, sanitizer } = require('@archi-code/validation');
```

Each validator is exported on its own and is exactly the same function as its member of the
`validator` registry (`isEmail === validator.isEmail`). The package declares `"sideEffects": false`,
so the bundler only includes what you import:

```ts
import { isEmail } from '@archi-code/validation'; // only isEmail and its helpers
import { validator } from '@archi-code/validation'; // every validator and locale table
```

Use `validator` only when you need dynamic access (`validator[name]`); otherwise, import by name.
`validator` is frozen (`Object.freeze`): it cannot be patched.

## Three tools

| Tool                                          | Question it answers                                         | Returns                                     |
| --------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------- |
| `isX(value, options?)` (also `validator.isX`) | Is this value a valid X? (email, URL, IBAN, mobile number…) | `boolean`                                   |
| `toX(value, options?)`                        | Converts this value to type X.                              | `{ ok, value, error }`                      |
| `canBeX(value)`                               | Can this value be converted to type X?                      | `boolean` (always equal to `toX(value).ok`) |

The type rules live only in the `to*` converters; `canBe*` and the validators rely on them, so
`canBeX(v) === toX(v).ok` always holds.

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
isIBAN('ES91 2100 0418 4502 0005 1332'); // true
isMobilePhone('+34612345678', { locale: 'es-ES' }); // true
toInteger(' 42 '); // { ok: true, value: 42, error: null }
toInteger('abc'); // { ok: false, value: null, error: 'Value is not an integer' }
canBeDate('2024-01-31'); // true
sanitizer.escape('<a>'); // '&lt;a&gt;'
```

## Contract

- **A validator returns only `boolean`** and never throws because of the value: `null`, objects,
  `Symbol`, huge strings or lone surrogates return `false`.
- **An invalid configuration throws `ValidationConfigError`, and only that**: unknown locales,
  country codes, algorithms or providers, a malformed `decimal_digits`, a pattern that is not a
  valid RegExp, options that are not an object… Never a raw `TypeError` or `SyntaxError`.
- **A single options object.** Each validator takes the value and, at most, one options object.
  There are no positional parameters or shorthand forms: `isLength(v, 2)` or `isIP(v, 4)` throw
  `ValidationConfigError`; write `isLength(v, { min: 2 })` and `isIP(v, { version: 4 })`.
- **`null` as options means "no options"**, just like `undefined`.
- **Non-string input.** Validators read the value with `toString`: strings are used as they are,
  finite numbers are converted with `String()` and booleans become `'true'`/`'false'`. Any other
  value gives `false`.
- **The `to*` converters never throw.** They always return `{ ok: true, value, error: null }` or
  `{ ok: false, value: null, error }`. `error` is one of the fixed messages of `ConvertMessages` and
  never contains the value. A successful numeric result is always a finite number.

```ts
import { isInt, isAlpha, isEmail, isLength, isHash } from '@archi-code/validation';

isInt(5); // true
isAlpha(true); // true
isEmail(null); // false
isEmail('ana@example.com', null); // true
isLength('x', 2); // throws ValidationConfigError: options must be an object, got 2
isHash('x', { algorithm: 'nope' }); // throws ValidationConfigError: Invalid hash algorithm 'nope'
```

## `is*` validators

There are 91 validators. Each one has one of these three signatures:

```ts
isPort(value); // only the value
isAlpha(value, options?); // every option is optional
isVAT(value, options); // the options object has at least one required property
```

`value` is always `unknown`. `options` is typed by the `<Validator>Options` interface exported next
to the validator (`IsEmailOptions`, `IsVATOptions`, `MatchesOptions`…): the editor autocompletes the
options and flags unknown ones as errors. Locale, country and algorithm parameters suggest the known
values and accept any string (an unknown value throws `ValidationConfigError` at runtime). An
omitted option takes the validator's default value.

In the tables, **bold** = required property.

### Text and content

| Signature                         | Options (default value)                                                                         | Checks that the value…                                                  |
| --------------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `isAlpha(value, options?)`        | `locale` (`'en-US'`, see `isAlphaLocales`), `ignore` (string or RegExp of characters to ignore) | has only letters of the locale                                          |
| `isAlphanumeric(value, options?)` | `locale` (`'en-US'`, see `isAlphanumericLocales`), `ignore`                                     | has only letters of the locale and digits                               |
| `isAscii(value)`                  | —                                                                                               | has only ASCII characters                                               |
| `isLowercase(value)`              | —                                                                                               | does not change when lowercased                                         |
| `isUppercase(value)`              | —                                                                                               | does not change when uppercased                                         |
| `isFullWidth(value)`              | —                                                                                               | contains full-width characters                                          |
| `isHalfWidth(value)`              | —                                                                                               | contains half-width characters                                          |
| `isVariableWidth(value)`          | —                                                                                               | mixes full-width and half-width characters                              |
| `isMultibyte(value)`              | —                                                                                               | contains multibyte characters                                           |
| `isSurrogatePair(value)`          | —                                                                                               | contains UTF-16 surrogate pairs                                         |
| `isSlug(value)`                   | —                                                                                               | is a slug (`my-article-1`)                                              |
| `isLength(value, options?)`       | `min` (`0`), `max`, `discreteLengths` (allowed lengths), `graphemes` (count graphemes)          | has a length within the range                                           |
| `isByteLength(value, options?)`   | `min` (`0`), `max`                                                                              | takes a number of UTF-8 bytes within the range                          |
| `isEmpty(value, options?)`        | `ignore_whitespace` (`false`)                                                                   | is the empty string                                                     |
| `isNotEmpty(value)`               | —                                                                                               | is a string with some non-whitespace character, or a finite number      |
| `isRequired(value)`               | —                                                                                               | is neither `null` nor `undefined`                                       |
| `contains(value, options)`        | **`elem`**, `ignoreCase` (`false`), `minOccurrences` (`1`)                                      | contains `elem` at least `minOccurrences` times                         |
| `equals(value, options)`          | **`comparison`**                                                                                | is equal to `comparison`                                                |
| `matches(value, options)`         | **`pattern`** (RegExp or string), `modifiers` (flags when `pattern` is a string)                | matches the pattern                                                     |
| `isIn(value, options)`            | **`values`** (array, object or string)                                                          | is in the array, is a key of the object or is a substring of the string |
| `isWhitelisted(value, options)`   | **`chars`** (string or array of characters)                                                     | has only characters from `chars`                                        |

```ts
import {
  isAlpha,
  isLength,
  isNotEmpty,
  isRequired,
  contains,
  matches,
  isIn,
} from '@archi-code/validation';

isAlpha('año'); // false
isAlpha('año nuevo', { locale: 'es-ES', ignore: ' ' }); // true
isLength('hello', { min: 2, max: 10 }); // true
isLength('👍🏽', { max: 1 }); // false
isLength('👍🏽', { max: 1, graphemes: true }); // true
isNotEmpty('  '); // false
isNotEmpty(0); // true
isRequired(''); // true
isRequired(null); // false
contains('Hello World', { elem: 'world', ignoreCase: true }); // true
matches('ABC-123', { pattern: /^[A-Z]{3}-\d{3}$/ }); // true
matches('abc', { pattern: '^ABC$', modifiers: 'i' }); // true
isIn('b', { values: ['a', 'b'] }); // true
isIn('es', { values: { es: 1, en: 2 } }); // true
```

### Numbers

| Signature                       | Options (default value)                                                                                           | Checks that the value…                                                                                 |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `isInt(value, options?)`        | `min`, `max`, `lt`, `gt`, `allow_leading_zeroes` (`true`)                                                         | is an integer (within the given limits)                                                                |
| `isFloat(value, options?)`      | `min`, `max`, `lt`, `gt`, `locale` (decimal separator of the locale, see `isFloatLocales`)                        | is a finite decimal number (within the given limits)                                                   |
| `isDecimal(value, options?)`    | `force_decimal` (`false`), `decimal_digits` (`'1,'`: range of decimal places, e.g. `'1,2'`), `locale` (`'en-US'`) | is a decimal number                                                                                    |
| `isNumeric(value, options?)`    | `no_symbols` (no sign or point), `locale` (decimal separator; `.` when not given)                                 | has only digits (and sign/separator when allowed)                                                      |
| `isDivisibleBy(value, options)` | **`num`**                                                                                                         | is a number divisible by `num`                                                                         |
| `isHexadecimal(value)`          | —                                                                                                                 | is a hexadecimal number                                                                                |
| `isOctal(value)`                | —                                                                                                                 | is an octal number                                                                                     |
| `isPort(value)`                 | —                                                                                                                 | is an integer between 0 and 65535 without leading zeros                                                |
| `isBoolean(value, options?)`    | `loose` (`false`)                                                                                                 | is exactly `'true'`, `'false'`, `'1'` or `'0'`; with `loose`, case-insensitive and also `'yes'`/`'no'` |

```ts
import {
  isInt,
  isFloat,
  isDecimal,
  isNumeric,
  isDivisibleBy,
  isPort,
  isBoolean,
} from '@archi-code/validation';

isInt('42', { min: 50 }); // false
isInt('007', { allow_leading_zeroes: false }); // false
isFloat('3,14', { locale: 'es-ES' }); // true
isFloat('5.5', { gt: 5, lt: 6 }); // true
isFloat('1e400'); // false
isDecimal('10', { force_decimal: true }); // false
isDecimal('10.555', { decimal_digits: '1,2' }); // false
isNumeric('-12.5', { no_symbols: true }); // false
isDivisibleBy('21', { num: 7 }); // true
isPort('70000'); // false
isBoolean('TRUE'); // false
isBoolean('yes', { loose: true }); // true
```

### Internet

| Signature                       | Options (default value)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Checks that the value…           |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `isEmail(value, options?)`      | `allow_display_name` (`false`), `require_display_name` (`false`), `allow_utf8_local_part` (`true`), `require_tld` (`true`), `allow_underscores` (`false`), `blacklisted_chars` (`''`), `ignore_max_length` (`false`), `host_blacklist` (`[]`), `host_whitelist` (`[]`), `allow_ip_domain`, `domain_specific_validation`                                                                                                                                                                                                                  | is an email address              |
| `isURL(value, options?)`        | `protocols` (`['http', 'https', 'ftp']`), `require_tld` (`true`), `require_protocol` (`false`), `require_host` (`true`), `require_port` (`false`), `require_valid_protocol` (`true`), `allow_underscores` (`false`), `allow_trailing_dot` (`false`), `allow_protocol_relative_urls` (`false`), `allow_fragments` (`true`), `allow_query_components` (`true`), `validate_length` (`true`), `max_allowed_length` (`2084`), `disallow_auth`, `host_whitelist`, `host_blacklist`, `allow_wildcard`, `allow_numeric_tld`, `ignore_max_length` | is a URL                         |
| `isFQDN(value, options?)`       | `require_tld` (`true`), `allow_underscores` (`false`), `allow_trailing_dot` (`false`), `allow_numeric_tld` (`false`), `allow_wildcard` (`false`), `ignore_max_length` (`false`)                                                                                                                                                                                                                                                                                                                                                          | is a fully qualified domain name |
| `isIP(value, options?)`         | `version` (`4` or `6`; when not given, either)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | is an IP address                 |
| `isIPRange(value, options?)`    | `version` (`4` or `6`; when not given, either)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | is a CIDR range                  |
| `isMACAddress(value, options?)` | `no_separators`, `no_colons`, `eui` (`'48'` or `'64'`; when not given, either)                                                                                                                                                                                                                                                                                                                                                                                                                                                           | is a MAC address                 |
| `isDataURI(value)`              | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | is a data URI                    |
| `isMagnetURI(value)`            | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | is a magnet link                 |
| `isMailtoURI(value, options?)`  | the `isEmail` options, applied to each address                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | is a `mailto:` URI               |

```ts
import { isEmail, isURL, isFQDN, isIP, isIPRange, isMACAddress } from '@archi-code/validation';

isEmail('Ana <ana@example.com>'); // false
isEmail('Ana <ana@example.com>', { allow_display_name: true }); // true
isEmail('ana@localhost', { require_tld: false }); // true
isEmail('ana@spam.com', { host_blacklist: ['spam.com'] }); // false
isURL('example.com'); // true
isURL('example.com', { require_protocol: true }); // false
isURL('ftp://example.com', { protocols: ['https'] }); // false
isFQDN('localhost'); // false
isIP('::1', { version: 4 }); // false
isIPRange('10.0.0.0/8'); // true
isMACAddress('0123456789ab', { no_separators: true }); // true
```

### Dates and times

| Signature                    | Options (default value)                                                                                                      | Checks that the value…                                |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `isDate(value, options?)`    | `format` (`'YYYY/MM/DD'`), `delimiters` (`['/', '-']`), `strictMode` (`false`), `twoDigitYearPivot` (current two-digit year) | is a calendar date in that format (or a valid `Date`) |
| `isTime(value, options?)`    | `hourFormat` (`'hour24'` or `'hour12'`), `mode` (`'default'`, `'withSeconds'` or `'withOptionalSeconds'`)                    | is a time                                             |
| `isISO8601(value, options?)` | `strict` (also checks that the date exists), `strictSeparator` (requires `T`)                                                | is an ISO 8601 date                                   |
| `isRFC3339(value)`           | —                                                                                                                            | is an RFC 3339 date                                   |
| `isAfter(value, options?)`   | `comparisonDate` (now, by default)                                                                                           | is a date after `comparisonDate`                      |
| `isBefore(value, options?)`  | `comparisonDate` (now, by default)                                                                                           | is a date before `comparisonDate`                     |

`isAfter` and `isBefore` parse dates deterministically, without depending on the machine's time
zone: they accept ISO dates (also with reduced precision, such as `'2024'` or `'2024-03'`) and the
output of `Date#toString()` and `Date#toUTCString()`, but not engine-dependent formats such as
`'2030/01/01'`.

```ts
import { isDate, isTime, isISO8601, isAfter, isBefore } from '@archi-code/validation';

isDate('2024-01-31'); // true
isDate('2024/02/30'); // false
isDate('31/01/2024', { format: 'DD/MM/YYYY' }); // true
isDate('01/01/24', { format: 'DD/MM/YY', twoDigitYearPivot: 50 }); // true
isTime('11:30 PM', { hourFormat: 'hour12' }); // true
isTime('23:59:59', { mode: 'withSeconds' }); // true
isISO8601('2024-02-30', { strict: true }); // false
isAfter('2024-06-01', { comparisonDate: '2024-01-01' }); // true
isBefore('2024-01-01', { comparisonDate: '2024-06-01' }); // true
isAfter('2030/01/01'); // false
```

### Identifiers, hashes and encodings

| Signature                   | Options (default value)                                                                                                                              | Checks that the value…                    |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `isUUID(value, options?)`   | `version` (`'all'`; also `'loose'`, `'nil'`, `'max'`, `1`…`8`)                                                                                       | is a UUID                                 |
| `isULID(value)`             | —                                                                                                                                                    | is a ULID                                 |
| `isMongoId(value)`          | —                                                                                                                                                    | is a MongoDB ObjectId                     |
| `isJWT(value)`              | —                                                                                                                                                    | has the shape of a JWT                    |
| `isMD5(value)`              | —                                                                                                                                                    | is an MD5 hash                            |
| `isHash(value, options)`    | **`algorithm`**: `md5`, `md4`, `sha1`, `sha256`, `sha384`, `sha512`, `ripemd128`, `ripemd160`, `tiger128`, `tiger160`, `tiger192`, `crc32`, `crc32b` | is a hexadecimal hash of that algorithm   |
| `isBase32(value, options?)` | `crockford` (`false`)                                                                                                                                | is Base32                                 |
| `isBase58(value)`           | —                                                                                                                                                    | is Base58                                 |
| `isBase64(value, options?)` | `urlSafe` (`false`), `padding` (`true` by default, or `false` with `urlSafe`)                                                                        | is Base64                                 |
| `isJSON(value, options?)`   | `allow_primitives` (`false`: also `true`, `false` and `null`), `allow_any_value` (`false`: any JSON)                                                 | is JSON that parses to an object or array |
| `isSemVer(value)`           | —                                                                                                                                                    | is a semantic version                     |
| `isMimeType(value)`         | —                                                                                                                                                    | is a MIME type                            |

```ts
import { isUUID, isHash, isBase64, isJSON } from '@archi-code/validation';

isUUID('550e8400-e29b-41d4-a716-446655440000', { version: 4 }); // true
isUUID('550e8400-e29b-11d4-a716-446655440000', { version: 4 }); // false
isUUID('00000000-0000-0000-0000-000000000000', { version: 'nil' }); // true
isHash('d41d8cd98f00b204e9800998ecf8427e', { algorithm: 'md5' }); // true
isBase64('SGVsbG8='); // true
isBase64('SGVsbG8', { urlSafe: true }); // true
isJSON('1'); // false
isJSON('true', { allow_primitives: true }); // true
isJSON('1', { allow_any_value: true }); // true
```

### Colors

| Signature                     | Options (default value)                                  | Checks that the value…       |
| ----------------------------- | -------------------------------------------------------- | ---------------------------- |
| `isHexColor(value, options?)` | `require_hashtag` (`false`)                              | is a hexadecimal color       |
| `isRgbColor(value, options?)` | `includePercentValues` (`true`), `allowSpaces` (`false`) | is an `rgb()`/`rgba()` color |
| `isHSL(value)`                | —                                                        | is an `hsl()`/`hsla()` color |

```ts
import { isHexColor, isRgbColor, isHSL } from '@archi-code/validation';

isHexColor('ff0000', { require_hashtag: true }); // false
isRgbColor('rgb(255, 0, 0)'); // false
isRgbColor('rgb(255, 0, 0)', { allowSpaces: true }); // true
isHSL('hsl(120, 100%, 50%)'); // true
```

### Finance and payments

| Signature                       | Options (default value)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Checks that the value…                    |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `isIBAN(value, options?)`       | `whitelist`, `blacklist` (country codes, see `ibanLocales`)                                                                                                                                                                                                                                                                                                                                                                                                                                              | is an IBAN (format and check digits)      |
| `isBIC(value)`                  | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | is a BIC/SWIFT code                       |
| `isAbaRouting(value)`           | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | is an ABA routing number (US)             |
| `isCreditCard(value, options?)` | `provider`: `amex`, `dinersclub`, `discover`, `jcb`, `mastercard`, `unionpay`, `visa` (when not given, any)                                                                                                                                                                                                                                                                                                                                                                                              | is a card number                          |
| `isLuhnNumber(value)`           | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | passes the Luhn algorithm                 |
| `isCurrency(value, options?)`   | `symbol` (`'$'`), `require_symbol` (`false`), `allow_space_after_symbol` (`false`), `symbol_after_digits` (`false`), `allow_negatives` (`true`), `parens_for_negatives` (`false`), `negative_sign_before_digits` (`false`), `negative_sign_after_digits` (`false`), `allow_negative_sign_placeholder` (`false`), `thousands_separator` (`','`), `decimal_separator` (`'.'`), `allow_decimal` (`true`), `require_decimal` (`false`), `digits_after_decimal` (`[2]`), `allow_space_after_digits` (`false`) | is a monetary amount                      |
| `isVAT(value, options)`         | **`countryCode`** (e.g. `'ES'`, `'GB'`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | has the VAT number format of that country |
| `isISIN(value)`                 | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | is an ISIN                                |
| `isISO4217(value)`              | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | is an ISO 4217 currency code              |
| `isEthereumAddress(value)`      | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | is an Ethereum address                    |
| `isBtcAddress(value)`           | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | is a Bitcoin address                      |

```ts
import { isIBAN, isCreditCard, isCurrency, isVAT } from '@archi-code/validation';

isIBAN('DE89 3704 0044 0532 0130 00', { whitelist: ['ES'] }); // false
isCreditCard('4111111111111111'); // true
isCreditCard('4111111111111111', { provider: 'mastercard' }); // false
isCurrency('$1,000.00'); // true
isCurrency('1.000,00€', {
  symbol: '€',
  symbol_after_digits: true,
  thousands_separator: '.',
  decimal_separator: ',',
}); // true
isVAT('GB999 9999 00', { countryCode: 'GB' }); // true
```

### People, countries and languages

| Signature                           | Options (default value)                                                                                         | Checks that the value…                   |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `isMobilePhone(value, options?)`    | `locale` (one, a list or `'any'`; when not given, any; see `isMobilePhoneLocales`), `strictMode` (requires `+`) | is a mobile number of one of the locales |
| `isPostalCode(value, options)`      | **`locale`** (country code or `'any'`, see `isPostalCodeLocales`)                                               | is a postal code of that country         |
| `isIdentityCard(value, options?)`   | `locale` (`'any'`)                                                                                              | is an identity document of that locale   |
| `isPassportNumber(value, options)`  | **`countryCode`** (see `passportNumberLocales`)                                                                 | has the passport format of that country  |
| `isLicensePlate(value, options)`    | **`locale`** (e.g. `'de-DE'`, `'pt-BR'`, or `'any'`)                                                            | is a license plate of that locale        |
| `isLatLong(value, options?)`        | `checkDMS` (`false`: degrees, minutes and seconds)                                                              | is a `latitude,longitude` pair           |
| `isLocale(value)`                   | —                                                                                                               | is a locale identifier                   |
| `isISO6391(value)`                  | —                                                                                                               | is an ISO 639-1 language code            |
| `isISO15924(value)`                 | —                                                                                                               | is an ISO 15924 script code              |
| `isISO31661Alpha2(value, options?)` | `userAssignedCodes` (extra accepted codes)                                                                      | is an ISO 3166-1 alpha-2 country code    |
| `isISO31661Alpha3(value, options?)` | `userAssignedCodes`                                                                                             | is an ISO 3166-1 alpha-3 country code    |
| `isISO31661Numeric(value)`          | —                                                                                                               | is an ISO 3166-1 numeric country code    |

```ts
import {
  isMobilePhone,
  isPostalCode,
  isIdentityCard,
  isLicensePlate,
  isISO31661Alpha2,
} from '@archi-code/validation';

isMobilePhone('612345678', { locale: 'es-ES', strictMode: true }); // false
isMobilePhone('612345678', { locale: ['es-ES', 'pt-PT'] }); // true
isMobilePhone('600', { locale: 'xx-XX' }); // throws ValidationConfigError: Invalid locale 'xx-XX'
isPostalCode('21001', { locale: 'ES' }); // true
isIdentityCard('12345678Z', { locale: 'ES' }); // true
isLicensePlate('B-AB 1234', { locale: 'de-DE' }); // true
isISO31661Alpha2('XK'); // false
isISO31661Alpha2('XK', { userAssignedCodes: ['XK'] }); // true
```

### Products, publications and devices

| Signature                     | Options (default value)                          | Checks that the value…        |
| ----------------------------- | ------------------------------------------------ | ----------------------------- |
| `isISBN(value, options?)`     | `version` (`10` or `13`; when not given, either) | is an ISBN                    |
| `isISSN(value, options?)`     | `case_sensitive`, `require_hyphen`               | is an ISSN                    |
| `isEAN(value)`                | —                                                | is an EAN code                |
| `isISRC(value)`               | —                                                | is an ISRC                    |
| `isIMEI(value, options?)`     | `allow_hyphens`                                  | is an IMEI                    |
| `isISO6346(value)`            | —                                                | is an ISO 6346 container code |
| `isFreightContainerID(value)` | —                                                | alias of `isISO6346`          |

```ts
import { isISBN, isIMEI, isISO6346 } from '@archi-code/validation';

isISBN('978-3-16-148410-0'); // true
isISBN('0-306-40615-2', { version: 10 }); // true
isIMEI('49-015420-323751-8', { allow_hyphens: true }); // true
isISO6346('CSQU3054383'); // true
```

### Passwords

| Signature                           | Options (default value)                                                                               | Checks that the value… |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------- |
| `isStrongPassword(value, options?)` | `minLength` (`8`), `minLowercase` (`1`), `minUppercase` (`1`), `minNumbers` (`1`), `minSymbols` (`1`) | meets every minimum    |

See [Passwords](#passwords-isstrongpassword-and-scorepassword).

### Locale lists

They are frozen arrays (`readonly string[]`) with the keys each validator accepts. They are also in
the `validator` registry.

| Export                  | Locales / countries of                   |
| ----------------------- | ---------------------------------------- |
| `isAlphaLocales`        | `isAlpha`                                |
| `isAlphanumericLocales` | `isAlphanumeric`                         |
| `isFloatLocales`        | `isFloat` (and `isDecimal`, `isNumeric`) |
| `ibanLocales`           | `isIBAN`                                 |
| `isMobilePhoneLocales`  | `isMobilePhone`                          |
| `isPostalCodeLocales`   | `isPostalCode`                           |
| `passportNumberLocales` | `isPassportNumber`                       |

```ts
import { isAlphaLocales, isMobilePhoneLocales } from '@archi-code/validation';

isAlphaLocales.includes('es-ES'); // true
isMobilePhoneLocales.includes('es-ES'); // true
```

### `validator` registry

`validator` is a frozen object with the 91 validators and the 7 locale lists. Its type is
`ValidatorRegistry`. Use it to access validators by name:

```ts
import { validator } from '@archi-code/validation';

validator.isInt('5'); // true
```

## `to*` converters

They convert a value to a type and never throw. They return `Converted<T>`:

```ts
type Converted<T> =
  | { readonly ok: true; readonly value: T; readonly error: null }
  | { readonly ok: false; readonly value: null; readonly error: ConvertMessage };
```

Checking `ok` narrows the type: inside `if (r.ok)`, `value` is `T`.

| Signature                                       | Default rule                                                                                                                                                   | Options                                                                                                                                                                                                                 |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `toString(v): Converted<string>`                | Strings, booleans and finite numbers                                                                                                                           | —                                                                                                                                                                                                                       |
| `toBoolean(v, options?): Converted<boolean>`    | `true`/`false`, `1`/`0` and the strings `'true'`/`'false'`/`'1'`/`'0'`, trimmed and case-insensitive                                                           | `mode`: `'default'`, `'strict'` (exact strings, no trimming or lowercasing) or `'loose'` (case-insensitive, no trimming, adds `'yes'`/`'no'`)                                                                           |
| `toInteger(v, options?): Converted<number>`     | Safe integers, as a number or as a trimmed `-?\d+` string; outside ±2^53 it fails with `INTEGER_OVERFLOW`                                                      | `syntax: 'validator'` (the `isInt` rule: allows `+`), `allowLeadingZeroes` (with `syntax: 'validator'`; `false` rejects leading zeros)                                                                                  |
| `toFloat(v, options?): Converted<number>`       | Finite numbers or trimmed strings in decimal notation (not `0x`/`0b`/`0o`)                                                                                     | `syntax: 'validator'` (the `isFloat` rule), `decimalSeparator` (with `syntax: 'validator'`; `'.'` by default)                                                                                                           |
| `toDate(v, options?): Converted<Date>`          | `YYYY/MM/DD` with `/` or `-` as separator (result: that day at 00:00 UTC) or a valid `Date`                                                                    | `format`, `delimiters`, `strictMode`, `twoDigitYearPivot` (as in `isDate`); `iso: true` (ISO date or date-time, optional zone); `lax: true` (reduced-precision ISO and the output of `Date#toString()`/`toUTCString()`) |
| `toJson(v): Converted<Record<string, unknown>>` | A non-empty plain JSON object: JSON text, or an object that survives a JSON round trip (plain objects/arrays with strings, booleans, finite numbers or `null`) | —                                                                                                                                                                                                                       |
| `toJsonValue(v, options?): Converted<unknown>`  | JSON text that parses to an object or array                                                                                                                    | `allowPrimitives` (also `true`, `false`, `null`), `allowAnyValue` (any JSON)                                                                                                                                            |
| `toArray(v): Converted<unknown[]>`              | Arrays, or JSON text that contains an array                                                                                                                    | —                                                                                                                                                                                                                       |
| `toEnum(v, options): Converted<T>`              | A string, number or boolean whose text form is in `options` (`readonly T[]`)                                                                                   | —                                                                                                                                                                                                                       |

```ts
import {
  toBoolean,
  toInteger,
  toFloat,
  toDate,
  toJson,
  toJsonValue,
  toArray,
  toEnum,
} from '@archi-code/validation';

toBoolean(' TRUE '); // { ok: true, value: true, error: null }
toBoolean('yes'); // { ok: false, value: null, error: 'Value cannot be converted to boolean' }
toBoolean('No', { mode: 'loose' }); // { ok: true, value: false, error: null }
toInteger('4.2'); // { ok: false, value: null, error: 'Value is not an integer' }
toInteger('+5', { syntax: 'validator' }); // { ok: true, value: 5, error: null }
toInteger('9007199254740993'); // { ok: false, value: null, error: 'Integer exceeds the safe integer limits (-9007199254740991 to 9007199254740991)' }
toFloat('0x10'); // { ok: false, value: null, error: 'Value is not a finite decimal number' }
toFloat('3,14', { syntax: 'validator', decimalSeparator: ',' }); // { ok: true, value: 3.14, error: null }
toDate('31/01/2024', { format: 'DD/MM/YYYY' }); // { ok: true, value: 2024-01-31T00:00:00.000Z, error: null }
toDate('2024-01-31T10:00:00+02:00', { iso: true }); // { ok: true, value: 2024-01-31T08:00:00.000Z, error: null }
toDate('2024-03', { lax: true }); // { ok: true, value: 2024-03-01T00:00:00.000Z, error: null }
toJson('{"a":1}'); // { ok: true, value: { a: 1 }, error: null }
toJson({ a: new Date(0) }); // { ok: false, value: null, error: 'Value is not a non-empty JSON object' }
toJsonValue('true', { allowPrimitives: true }); // { ok: true, value: true, error: null }
toArray('[1,2]'); // { ok: true, value: [ 1, 2 ], error: null }
toEnum(1, ['1', '2']); // { ok: true, value: '1', error: null }
```

With TypeScript, `ok` decides the type of `value`:

```ts
import { toInteger, toEnum } from '@archi-code/validation';

const quantity = toInteger(input);
if (quantity.ok) {
  quantity.value; // number
} else {
  quantity.error; // ConvertMessage
}

const role = toEnum(input, ['admin', 'user'] as const); // Converted<'admin' | 'user'>
```

> ISO dates with a time need the ISO rule: `canBeDate('2024-01-31T10:00:00Z')` is `false`,
> while `toDate('2024-01-31T10:00:00Z', { iso: true })` is `ok`.

### `ConvertMessages`

Frozen object with the only possible error messages. Its value type is `ConvertMessage`.

| Key                | Message                                                                           |
| ------------------ | --------------------------------------------------------------------------------- |
| `STRING`           | `Value cannot be converted to string`                                             |
| `BOOLEAN`          | `Value cannot be converted to boolean`                                            |
| `INTEGER`          | `Value is not an integer`                                                         |
| `INTEGER_OVERFLOW` | `Integer exceeds the safe integer limits (-9007199254740991 to 9007199254740991)` |
| `FLOAT`            | `Value is not a finite decimal number`                                            |
| `DATE`             | `Value is not a valid date`                                                       |
| `JSON`             | `Value is not a non-empty JSON object`                                            |
| `JSON_VALUE`       | `Value is not an accepted JSON value`                                             |
| `ARRAY`            | `Value is not an array`                                                           |
| `ENUM`             | `Value is not one of the enum options`                                            |

```ts
import { toInteger, ConvertMessages } from '@archi-code/validation';

toInteger('x').error === ConvertMessages.INTEGER; // true
```

### `anyToString`

`anyToString(value: any): string` describes any value in a readable way, for logs and error
messages. It never throws.

```ts
import { anyToString } from '@archi-code/validation';

anyToString(null); // 'null'
anyToString({ a: 1 }); // '{"a":1}'
anyToString(new Date('2024-01-01T00:00:00Z')); // 'Date(2024-01-01T00:00:00.000Z)'
anyToString(new Map([['a', 1]])); // 'Map({a: 1})'
anyToString(new Error('boom')); // 'new Error(boom)'
anyToString(function foo() {}); // 'Function(foo)'
```

## `canBe*` checks

They return `boolean` and are always equivalent to `toX(value).ok` with the default options.

| Signature                                           | Equivalent to           |
| --------------------------------------------------- | ----------------------- |
| `canBeString(v): boolean`                           | `toString(v).ok`        |
| `canBeBoolean(v): boolean`                          | `toBoolean(v).ok`       |
| `canBeInteger(v): boolean`                          | `toInteger(v).ok`       |
| `canBeFloat(v): boolean`                            | `toFloat(v).ok`         |
| `canBeDate(v): boolean`                             | `toDate(v).ok`          |
| `canBeJson(v): boolean`                             | `toJson(v).ok`          |
| `canBeJsonObject(v): boolean`                       | alias of `canBeJson`    |
| `canBeArray(v): boolean`                            | `toArray(v).ok`         |
| `canBeEnum(v, options: readonly string[]): boolean` | `toEnum(v, options).ok` |

```ts
import { canBeInteger, canBeBoolean, canBeJson, canBeEnum } from '@archi-code/validation';

canBeInteger('42'); // true
canBeInteger('4.2'); // false
canBeBoolean('yes'); // false
canBeJson('[]'); // false
canBeEnum('z', ['a', 'b']); // false
```

## Sanitizers

They are grouped in the `sanitizer` namespace. Unlike the validators, they take a `string` and throw
`TypeError` (`Expected a string but received a …`) when the first argument is not one.

| Signature                                                    | What it does                                                                |
| ------------------------------------------------------------ | --------------------------------------------------------------------------- |
| `sanitizer.trim(str, chars?): string`                        | Removes whitespace (or the characters in `chars`) at the start and the end  |
| `sanitizer.ltrim(str, chars?): string`                       | Same, only at the start                                                     |
| `sanitizer.rtrim(str, chars?): string`                       | Same, only at the end                                                       |
| `sanitizer.escape(str): string`                              | Escapes `&`, `<`, `>`, `"`, `'`, `/` and other characters as HTML entities  |
| `sanitizer.unescape(str): string`                            | Reverses `escape`                                                           |
| `sanitizer.blacklist(str, chars): string`                    | Removes the characters in `chars` (literal, no ranges)                      |
| `sanitizer.whitelist(str, chars): string`                    | Keeps only the characters in `chars` (literal, no ranges)                   |
| `sanitizer.stripLow(str, keepNewLines?): string`             | Removes ASCII control characters (with `keepNewLines`, keeps `\n` and `\r`) |
| `sanitizer.normalizeEmail(email, options?): string \| false` | Normalizes an email; returns `false` when it has no `@`                     |

`normalizeEmail` options (`NormalizeEmailOptions`), all `true` by default: `all_lowercase`,
`gmail_lowercase`, `gmail_remove_dots`, `gmail_remove_subaddress`, `gmail_convert_googlemaildotcom`,
`outlookdotcom_lowercase`, `outlookdotcom_remove_subaddress`, `yahoo_lowercase`,
`yahoo_remove_subaddress`, `yandex_lowercase`, `yandex_convert_yandexru`, `icloud_lowercase`,
`icloud_remove_subaddress`.

```ts
import { sanitizer } from '@archi-code/validation';

sanitizer.trim('xxhelloxx', 'x'); // 'hello'
sanitizer.escape('<b>"Hello"</b>'); // '&lt;b&gt;&quot;Hello&quot;&lt;&#x2F;b&gt;'
sanitizer.unescape('&lt;b&gt;'); // '<b>'
sanitizer.whitelist('abc123', 'abc'); // 'abc'
sanitizer.blacklist('abc123', '123'); // 'abc'
sanitizer.stripLow('a\x00b\nc', true); // 'ab\nc'
sanitizer.normalizeEmail('Ana.Lopez+news@Gmail.com'); // 'analopez@gmail.com'
sanitizer.normalizeEmail('Ana.Lopez+news@Gmail.com', { gmail_remove_dots: false }); // 'ana.lopez@gmail.com'
sanitizer.normalizeEmail('not-an-email'); // false
sanitizer.trim(42); // throws TypeError: Expected a string but received a number
```

## Passwords: `isStrongPassword` and `scorePassword`

`isStrongPassword(value, options?)` returns `boolean`: `true` when the password meets every minimum
(`minLength` `8`, `minLowercase` `1`, `minUppercase` `1`, `minNumbers` `1`, `minSymbols` `1`).

`scorePassword(value, options?): number` returns a numeric score (it is not a validator). It adds
`pointsPerUnique` for each distinct character, `pointsPerRepeat` for each repeated one and a bonus
for containing lowercase letters, uppercase letters, numbers and symbols. A value that cannot be
turned into a string scores `0`.

| `ScorePasswordOptions` option | Default |
| ----------------------------- | ------- |
| `pointsPerUnique`             | `1`     |
| `pointsPerRepeat`             | `0.5`   |
| `pointsForContainingLower`    | `10`    |
| `pointsForContainingUpper`    | `10`    |
| `pointsForContainingNumber`   | `10`    |
| `pointsForContainingSymbol`   | `10`    |

```ts
import { isStrongPassword, scorePassword } from '@archi-code/validation';

isStrongPassword('Abcdef1!'); // true
isStrongPassword('abcdefgh', { minUppercase: 0, minNumbers: 0, minSymbols: 0 }); // true
scorePassword('Abcdef1!'); // 48
scorePassword('aaaa'); // 12.5
```

## `@Validations` decorator and `runValidations`

`@Validations(list)` attaches a list of validations to a class. `runValidations(Class, value)` runs
them (inherited ones included) against a value and returns a `ValidationResult`.

```ts
import { Validations, runValidations } from '@archi-code/validation';

@Validations([{ validator: 'isInt', properties: { min: 0 } }])
class Quantity {}

runValidations(Quantity, '-3');
// { ok: false, value: '-3', errors: [{ validator: 'isInt', message: 'Value does not satisfy isInt' }] }
runValidations(Quantity, '7');
// { ok: true, value: '7', errors: [] }
```

The decorator only stores metadata: it does not change the class, does not wrap its constructor and
validates nothing by itself. Validation only happens when `runValidations` is called.

### TypeScript configuration

It works with both decorator modes:

- **Legacy decorators** (`"experimentalDecorators": true`).
- **Standard decorators** (TypeScript 5+ without `experimentalDecorators`).

It needs neither `emitDecoratorMetadata` nor `reflect-metadata`.

### Declaring validations

The decorator takes an array. Each element is one of these two kinds:

**Built-in validation** (`BuiltInValidation`): runs one of the package's validators. `validator` is
its name and `properties` is its options object, passed as is as the second argument:
`{ validator: 'isVAT', properties: { countryCode: 'ES' } }` runs
`isVAT(value, { countryCode: 'ES' })`. The type of `properties` comes from the validator's signature:

| Validator signature                                  | `properties` |
| ---------------------------------------------------- | ------------ |
| With required options (`isHash`, `isIn`, `matches`…) | Required     |
| With only optional options (`isInt`, `isEmail`…)     | Optional     |
| Takes only the value (`isPort`, `isSlug`…)           | Not allowed  |

**Custom validation** (`CustomValidation`): `custom` is its name (it appears in the errors) and
`fn: (value: unknown) => boolean` decides; a truthy result passes and a falsy one fails.

Both accept `message`. Without it, the message is `Value does not satisfy <name>`.

```ts
import { Validations, runValidations } from '@archi-code/validation';

@Validations([
  { validator: 'isHash', properties: { algorithm: 'sha256' } },
  { validator: 'isInt', properties: { min: 1, max: 10 } },
  { validator: 'isPort' },
  { custom: 'isEven', fn: (v) => Number(v) % 2 === 0, message: 'Must be even' },
])
class Example {}

runValidations(Example, '5');
// { ok: false, value: '5', errors: [
//   { validator: 'isHash', message: 'Value does not satisfy isHash' },
//   { custom: 'isEven', message: 'Must be even' } ] }
```

**Identity.** Two validations are "the same" when they have the same kind and name:
`validator: 'isInt'` is one identity and `custom: 'isInt'` is another; a built-in and a custom
validation with the same name never replace each other. `properties`, `fn` and `message` do not
count towards identity.

### Missing values and `isRequired`

- **With a value** (neither `null` nor `undefined`), every validation runs, whether `isRequired` was
  declared or not.
- **Without a value** (`null` or `undefined`), only `isRequired` decides: if the class or any parent
  declares `{ validator: 'isRequired' }`, only that one runs and it fails; otherwise, the value is
  optional, nothing runs and the result is `ok`.

```ts
import { Validations, runValidations } from '@archi-code/validation';

@Validations([{ validator: 'isRequired' }, { validator: 'isEmail', message: 'Invalid email' }])
class Email {}

runValidations(Email, undefined);
// { ok: false, value: undefined, errors: [{ validator: 'isRequired', message: 'Value does not satisfy isRequired' }] }
runValidations(Email, 'x');
// { ok: false, value: 'x', errors: [{ validator: 'isEmail', message: 'Invalid email' }] }

@Validations([{ validator: 'isInt', properties: { min: 0 } }])
class OptionalQuantity {}

runValidations(OptionalQuantity, null);
// { ok: true, value: null, errors: [] }
```

### Inheritance and replacement

`runValidations(Child, value)` walks the chain from the root parent down to `Child` and combines
each class's own validations:

1. The root parent's come first, then those of each subclass, in declaration order.
2. A subclass validation with the same identity as an inherited one **replaces it** and keeps its
   position.
3. An intermediate class without `@Validations` passes its parent's on unchanged.
4. Declaring a subclass never changes the parent.

```ts
import { Validations, runValidations } from '@archi-code/validation';

@Validations([{ validator: 'isInt', properties: { min: 0 } }, { validator: 'isEmail' }])
class Parent {}

@Validations([{ validator: 'isInt', properties: { min: 5 } }, { validator: 'isPort' }])
class Child extends Parent {}

runValidations(Child, 'x');
// runs, in order: isInt { min: 5 } (replaces and keeps first place), isEmail, isPort
```

Applying `@Validations` again to the same class follows the same rules. Several decorators on one
class are applied from bottom to top, as always in TypeScript:

```ts
@Validations([{ validator: 'isEmail' }]) // applied second
@Validations([{ validator: 'isInt' }, { validator: 'isPort' }]) // applied first
class Stacked {}
// runValidations(Stacked, value) runs: isInt, isPort, isEmail
```

### When each part runs

| Moment                                                          | What happens                                                                                                                                           |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **The class is defined** (usually, when its module is imported) | The decorator runs once: it checks the declaration, freezes a copy and stores it. A wrong declaration throws here and prevents the module from loading |
| **`new MyClass()`**                                             | Nothing. The decorator adds no code to the constructor                                                                                                 |
| **`runValidations(MyClass, value)`**                            | Walks the prototype chain, combines the lists and runs each validation in order. It is recomputed on every call; there is no cache                     |

### Declaration checks

The decorator checks each element when it decorates the class. On the first error it throws
`ValidationConfigError` and stores nothing for that class.

| Declaration                                                              | Message                                                                                        |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| Applied to something that is not a class                                 | `@Validations can only decorate a class`                                                       |
| The argument is not an array                                             | `@Validations expects an array of validations`                                                 |
| An element is not an object                                              | `A validation must be an object`                                                               |
| An element has neither `validator` nor `custom`                          | `A validation needs "validator" or "custom"`                                                   |
| An element has both `validator` and `custom`                             | `A validation cannot have both "validator" and "custom"`                                       |
| `custom` is not a non-empty string                                       | `"custom" must be a non-empty string`                                                          |
| Custom validation without an `fn` function                               | `Custom "<name>" needs a "fn" function`                                                        |
| `validator` is not in the registry (typo, `isAlphaLocales`, `toString`…) | `Unknown validator "<name>"`                                                                   |
| The same identity twice in one list                                      | `Validator "<name>" is declared more than once` / `Custom "<name>" is declared more than once` |

With TypeScript most of these are already compile errors; the runtime checks cover calls from
JavaScript and casts. Whether `properties` is correct for the validator is not checked when
decorating (the types guarantee it); a wrong value from JavaScript shows up in `runValidations`.

### `runValidations` result

```ts
type ValidationResult<T> =
  | { readonly ok: true; readonly value: T; readonly errors: readonly [] }
  | { readonly ok: false; readonly value: T; readonly errors: readonly ValidationError[] };

type ValidationError = { validator: string; message: string } | { custom: string; message: string };
```

- **One failure does not stop the rest**: there is one error per failed validation, in the same
  order.
- **`ok` is `true` exactly when `errors` is empty.**
- **`value` is the validated value** as it was passed: neither copied nor converted.
- **The result is frozen**, errors included, and each call returns a new one.
- **`'validator' in error`** tells an error from a built-in validation apart from a custom one.
- A class without validations (neither its own nor inherited) is always valid.

```ts
const result = runValidations(Example, '5');
if (!result.ok) {
  for (const error of result.errors) {
    console.log('validator' in error ? error.validator : error.custom, error.message);
  }
}
```

**What `runValidations` can throw:**

- `ValidationConfigError` when the first argument is not a class (an instance, an object, a
  string): `runValidations expects a class, not an instance or a value`.
- `ValidationConfigError` from a misconfigured built-in validator (e.g. `isHash` without
  `algorithm` from JavaScript).
- `ValidationConfigError` `Unknown validator "<name>"` when the class was decorated by another copy
  of the package that has a validator this copy does not know (see below).
- Whatever your own `fn` throws: it is not caught, it propagates and stops the remaining
  validations. If a custom rule can fail on unusual input, make `fn` return `false`.

### Self-validating objects: `Validatable<T>`

`Validatable<T>` is the interface `{ validate(): ValidationResult<T> }`, useful for value objects:

```ts
import { Validations, runValidations } from '@archi-code/validation';
import type { Validatable, ValidationResult } from '@archi-code/validation';

@Validations([{ validator: 'isLength', properties: { min: 2, max: 50 } }])
class Name implements Validatable<string> {
  constructor(readonly value: string) {}

  validate(): ValidationResult<string> {
    return runValidations(Name, this.value);
  }
}

new Name('A').validate();
// { ok: false, value: 'A', errors: [{ validator: 'isLength', message: 'Value does not satisfy isLength' }] }
```

### Immutability and storage

- The decorator stores a frozen deep copy of the plain objects and arrays in the declaration:
  changing the declared array or its `properties` afterwards does not affect the class. Values that
  are not plain objects or arrays (a `RegExp`, a `Date`, the `fn` function) are stored as they are.
- Validations live in a registry on `globalThis` under
  `Symbol.for('@archi-code/validation/decorator.v1')`. Every copy of the package in the same
  JavaScript realm (the CJS and the ESM build loaded together, or two copies installed in
  `node_modules`) shares the same registry. Another realm (a worker, an iframe, a `vm` context) has
  its own.

### Common mistakes

- **Pass the class, not an instance.** `runValidations(new Quantity(), value)` throws
  `ValidationConfigError`. From an instance, use
  `runValidations(instance.constructor as typeof Quantity, value)`.
- **A declaration error happens on import.** A wrong declaration throws when the module that
  defines the class loads, so it can show up as a failed import. This is intended: the error
  surfaces at startup, not with the first value.

## Errors and exceptions

| Who                           | When                                                                                      | What it throws / returns                                          |
| ----------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `is*` validators              | Invalid value of any type                                                                 | `false` (they never throw because of the value)                   |
| `is*` validators              | Invalid configuration (unknown locale/country/algorithm, options that are not an object…) | `ValidationConfigError`                                           |
| `to*` converters and `canBe*` | Always                                                                                    | They never throw: `{ ok: false, value: null, error }` / `false`   |
| `anyToString`                 | Always                                                                                    | It never throws                                                   |
| `sanitizer.*`                 | The first argument is not a string                                                        | `TypeError`                                                       |
| `@Validations`                | Invalid declaration                                                                       | `ValidationConfigError` (when decorating)                         |
| `runValidations`              | The target is not a class or a validator is misconfigured                                 | `ValidationConfigError`; whatever a custom `fn` throws propagates |

`ValidationConfigError` extends `Error` and its `name` is `'ValidationConfigError'`:

```ts
import { isMobilePhone, ValidationConfigError } from '@archi-code/validation';

try {
  isMobilePhone('600000000', { locale: 'xx-XX' });
} catch (error) {
  if (error instanceof ValidationConfigError) {
    error.message; // "Invalid locale 'xx-XX'"
  }
}
```

## Exported types

They are all imported with `import type { … } from '@archi-code/validation'`.

**Converters**

| Type                                                                                                                     | Description                                                             |
| ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| `Converted<T>`                                                                                                           | `Success<T> \| Failure`                                                 |
| `Success<T>`                                                                                                             | `{ ok: true; value: T; error: null }`                                   |
| `Failure`                                                                                                                | `{ ok: false; value: null; error: ConvertMessage }`                     |
| `ConvertMessage`                                                                                                         | Union of the `ConvertMessages` messages                                 |
| `BooleanConvertOptions`, `IntegerConvertOptions`, `FloatConvertOptions`, `DateConvertOptions`, `JsonValueConvertOptions` | Options of `toBoolean`, `toInteger`, `toFloat`, `toDate`, `toJsonValue` |

**Decorator**

| Type                      | Description                                                   |
| ------------------------- | ------------------------------------------------------------- |
| `Validation`              | `BuiltInValidation \| CustomValidation`                       |
| `BuiltInValidation`       | `{ validator, properties?, message? }` typed per validator    |
| `CustomValidation`        | `{ custom, fn, message? }`                                    |
| `ValidatorName`           | Names of the registry's validators (`'isInt'`, `'isEmail'`…)  |
| `ValidationProperties<K>` | Options object of validator `K` (`never` when it has none)    |
| `ValidatedClass`          | Any class (abstract ones too) that `runValidations` accepts   |
| `ValidationResult<T>`     | `ValidationSuccess<T> \| ValidationFailure<T>`                |
| `ValidationSuccess<T>`    | `{ ok: true; value: T; errors: readonly [] }`                 |
| `ValidationFailure<T>`    | `{ ok: false; value: T; errors: readonly ValidationError[] }` |
| `ValidationError`         | `{ validator, message } \| { custom, message }`               |
| `Validatable<T>`          | `{ validate(): ValidationResult<T> }`                         |

**Validators, sanitizers and helpers**

- `ValidatorRegistry` (`typeof validator`), `ScorePasswordOptions`, `NormalizeEmailOptions`.
- Options of each validator: `ContainsOptions`, `EqualsOptions`, `MatchesOptions`,
  `IsAfterOptions`, `IsAlphaOptions`, `IsAlphanumericOptions`, `IsBase32Options`,
  `IsBase64Options`, `IsBeforeOptions`, `IsBooleanOptions`, `IsByteLengthOptions`,
  `IsCreditCardOptions`, `IsCurrencyOptions`, `IsDateOptions`, `IsDecimalOptions`,
  `IsDivisibleByOptions`, `IsEmailOptions`, `IsEmptyOptions`, `IsFQDNOptions`, `IsFloatOptions`,
  `IsHashOptions`, `IsHexColorOptions`, `IsIBANOptions`, `IsIMEIOptions`, `IsInOptions`,
  `IsIntOptions`, `IsIPOptions`, `IsIPRangeOptions`, `IsISBNOptions`, `IsISO31661Alpha2Options`,
  `IsISO31661Alpha3Options`, `IsISO8601Options`, `IsISSNOptions`, `IsIdentityCardOptions`,
  `IsJSONOptions`, `IsLatLongOptions`, `IsLengthOptions`, `IsLicensePlateOptions`,
  `IsMACAddressOptions`, `IsMailtoURIOptions`, `IsMobilePhoneOptions`, `IsNumericOptions`,
  `IsPassportNumberOptions`, `IsPostalCodeOptions`, `IsRgbColorOptions`,
  `IsStrongPasswordOptions`, `IsTimeOptions`, `IsURLOptions`, `IsUUIDOptions`, `IsVATOptions`,
  `IsWhitelistedOptions`.
- Accepted values (they suggest the known ones and accept any string): `AlphaLocale`,
  `AlphanumericLocale`, `CreditCardProvider`, `HashAlgorithm`, `IdentityCardLocale`,
  `LicensePlateLocale`, `MobilePhoneLocale`, `PassportCountryCode`, `PostalCodeLocale`,
  `VATCountryCode`, `IsIPVersion`, `IsISBNVersion` and `IsUUIDVersion`.

```ts
import { isAlpha } from '@archi-code/validation';
import type { IsAlphaOptions } from '@archi-code/validation';

const spanish: IsAlphaOptions = { locale: 'es-ES', ignore: ' ' };
isAlpha('año nuevo', spanish); // true
```

## Differences from validator.js

This package deliberately departs from validator.js where the original accepted unsafe or incorrect
input.

**Signatures.** validator.js passes some parameters by position and accepts shorthand forms; here
everything goes in the options object:

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

- `isURL` rejects a backslash in the authority: `http://evil.com\@good.com` is `false`, because
  browsers treat `\` as `/`.
- `isURL` never reads a code-executing scheme as a user name: `javascript:foo@example.com` (also
  `vbscript:` and `data:`) is `false` unless `require_valid_protocol: false`. User and password must
  use RFC 3986 userinfo characters, and C0 controls and DEL are rejected anywhere in the URL.
- The host lists of `isURL` and `isEmail` compare case-insensitively and ignore a trailing dot. A
  bracketed IPv6 host is compared with the whitelist by its address.
- `isEmail`: the quoted local part rejects CR, LF, DEL and other control characters (header
  injection), the local part rejects invisible characters (zero-width, bidi, BOM, non-ASCII spaces)
  and a display name requires the closing `>`.
- `isFQDN` (and therefore `isURL` and `isEmail`) rejects invisible characters, bidi controls,
  Unicode separators and lone surrogates in host names.

**Anchoring and syntax**

- `isCreditCard` (Mastercard), `isISO6346`, `isLicensePlate` (`pt-BR`, `fi-FI`),
  `isPassportNumber` (`MZ`, `PH`), `isLatLong` and several `isVAT` rules reject garbage at the start
  or at the end.
- `isMongoId` rejects the `0x`/`0h` prefix.
- `isVAT('', { countryCode: 'HN' })` is `false`.

**Numbers**

- `isFloat` rejects `'.e5'`, `'e5'` and values outside the numeric range such as `'1e400'`, and
  reads the locale's decimal separator correctly.
- `isInt` compares the limits exactly beyond `Number.MAX_SAFE_INTEGER`, using BigInt on the
  original text.

**Dates**

- `isISO8601(…, { strict: true })` accepts the years 0000–0099.
- `isAfter` and `isBefore` parse dates deterministically, without depending on the machine's time
  zone (see [Dates and times](#dates-and-times)).

**Other differences**

- `isAlpha` and `isAlphanumeric` take each character of `ignore` literally.
- `isIdentityCard` uses the `'any'` locale by default.
- `isJWT` rejects an empty header or payload.
- An unknown locale inside an `isMobilePhone` array throws instead of being ignored.
- `isTaxID` is not included.
- `isNotEmpty` is new: `true` for a string with at least one non-whitespace character or for a
  finite number; `false` for `''`, whitespace only (spaces, tabs, line breaks, Unicode spaces),
  `null`, `undefined`, `NaN`, `Infinity`, booleans and any other value.
- `isRequired` is new: `false` only for `null` and `undefined`.

## AI assistant skill

The package includes `SKILL.md`, a [Claude Code](https://claude.com/claude-code) skill so that an
AI assistant writes correct code with `@archi-code/validation` in your project. The skill holds the
rules, the recommended patterns and the common mistakes; for the full API it points to this README
inside `node_modules`, so it stays valid when you update the package.

To install it in your project, copy it to the Claude Code skills folder:

```bash
mkdir -p .claude/skills/archi-code-validation && cp node_modules/@archi-code/validation/SKILL.md .claude/skills/archi-code-validation/SKILL.md
```

### How to use

Invoke it with a request:

```text
/archi-code-validation in the sign-up DTO, validate that email is an email and phone a Spanish mobile number
```

Or ask for the task without naming it and Claude loads it on its own because it matches its
description:

```text
Convert the page and perPage query params to integers and use 1 and 20 when they are not valid
```

It also helps to review code that already uses the package:

```text
/archi-code-validation review src/ and fix the calls that pass positional options instead of an object
```

With the skill loaded, Claude follows its rules, avoids the mistakes in its "What not to do" list
and, before using anything the skill does not show, reads this README in `node_modules`.

### Keeping it up to date

- The copy does not update itself: after updating `@archi-code/validation`, run the command above
  again.
- Commit `.claude/skills/archi-code-validation/` to the repository so the whole team uses it.

## License

MIT
