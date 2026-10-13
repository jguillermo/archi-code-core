# @archi-code/validation

Validadores de strings, conversores de tipo y sanitizadores para TypeScript en un solo paquete.
Los validadores son un port endurecido de [validator.js](https://github.com/validatorjs/validator.js).
No tiene dependencias en tiempo de ejecución y publica builds CJS y ESM que también funcionan en el
navegador.

- [Instalación](#instalación)
- [Importación](#importación)
- [Tres herramientas](#tres-herramientas)
- [Contrato](#contrato)
- [Validadores `is*`](#validadores-is)
- [Conversores `to*`](#conversores-to)
- [Comprobaciones `canBe*`](#comprobaciones-canbe)
- [Sanitizadores](#sanitizadores)
- [Contraseñas: `isStrongPassword` y `scorePassword`](#contraseñas-isstrongpassword-y-scorepassword)
- [Decorador `@Validations` y `runValidations`](#decorador-validations-y-runvalidations)
- [Errores y excepciones](#errores-y-excepciones)
- [Tipos exportados](#tipos-exportados)
- [Diferencias con validator.js](#diferencias-con-validatorjs)
- [Skill para asistentes de IA](#skill-para-asistentes-de-ia)
- [Licencia](#licencia)

## Instalación

```bash
npm install @archi-code/validation
```

Requiere Node.js 24 o superior. En el navegador, el campo `browser` y la condición `browser` de
`exports` apuntan al build ESM.

## Importación

Todo son exports con nombre (no hay `export default`).

```ts
// ESM / TypeScript
import { isEmail, toInteger, canBeDate, sanitizer } from '@archi-code/validation';
import type { IsEmailOptions, Converted } from '@archi-code/validation';
```

```js
// CommonJS
const { isEmail, toInteger, canBeDate, sanitizer } = require('@archi-code/validation');
```

Cada validador se exporta por separado y es exactamente la misma función que su miembro del
registro `validator` (`isEmail === validator.isEmail`). El paquete declara `"sideEffects": false`,
así que el bundler solo incluye lo que importas:

```ts
import { isEmail } from '@archi-code/validation'; // solo isEmail y sus helpers
import { validator } from '@archi-code/validation'; // todos los validadores y tablas de locales
```

Usa `validator` solo cuando necesites acceso dinámico (`validator[nombre]`); en el resto de casos,
importa por nombre. `validator` está congelado (`Object.freeze`): no se puede parchear.

## Tres herramientas

| Herramienta                                      | Pregunta que responde                                  | Devuelve                                    |
| ------------------------------------------------ | ------------------------------------------------------ | ------------------------------------------- |
| `isX(value, options?)` (también `validator.isX`) | ¿Es este valor un X válido? (email, URL, IBAN, móvil…) | `boolean`                                   |
| `toX(value, options?)`                           | Convierte este valor al tipo X.                        | `{ ok, value, error }`                      |
| `canBeX(value)`                                  | ¿Se puede convertir este valor al tipo X?              | `boolean` (siempre igual a `toX(value).ok`) |

Las reglas de tipo viven solo en los conversores `to*`; `canBe*` y los validadores se apoyan en
ellos, así que `canBeX(v) === toX(v).ok` se cumple siempre.

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

## Contrato

- **Un validador devuelve solo `boolean`** y nunca lanza por culpa del valor: `null`, objetos,
  `Symbol`, strings enormes o surrogates sueltos devuelven `false`.
- **Una configuración inválida lanza `ValidationConfigError`, y solo eso**: locales, códigos de país,
  algoritmos o proveedores desconocidos, un `decimal_digits` mal formado, un patrón que no es una
  RegExp válida, opciones que no son un objeto… Nunca un `TypeError` o `SyntaxError` crudo.
- **Un único objeto de opciones.** Cada validador recibe el valor y, como mucho, un objeto de
  opciones. No hay parámetros posicionales ni formas abreviadas: `isLength(v, 2)` o `isIP(v, 4)`
  lanzan `ValidationConfigError`; se escribe `isLength(v, { min: 2 })` e `isIP(v, { version: 4 })`.
- **`null` como opciones equivale a «sin opciones»**, igual que `undefined`.
- **Entrada que no es string.** Los validadores leen el valor con `toString`: los strings se usan
  tal cual, los números finitos se convierten con `String()` y los booleanos pasan a
  `'true'`/`'false'`. Cualquier otro valor da `false`.
- **Los conversores `to*` nunca lanzan.** Siempre devuelven `{ ok: true, value, error: null }` o
  `{ ok: false, value: null, error }`. `error` es uno de los mensajes fijos de `ConvertMessages` y
  nunca contiene el valor. Un resultado numérico correcto siempre es un número finito.

```ts
import { isInt, isAlpha, isEmail, isLength, isHash } from '@archi-code/validation';

isInt(5); // true
isAlpha(true); // true
isEmail(null); // false
isEmail('ana@example.com', null); // true
isLength('x', 2); // lanza ValidationConfigError: options must be an object, got 2
isHash('x', { algorithm: 'nope' }); // lanza ValidationConfigError: Invalid hash algorithm 'nope'
```

## Validadores `is*`

Hay 91 validadores. Todos tienen una de estas tres firmas:

```ts
isPort(value); // solo el valor
isAlpha(value, options?); // todas las opciones son opcionales
isVAT(value, options); // el objeto de opciones tiene al menos una propiedad obligatoria
```

`value` es siempre `unknown`. `options` está tipado por la interfaz `<Validador>Options` que se
exporta junto al validador (`IsEmailOptions`, `IsVATOptions`, `MatchesOptions`…): el editor
autocompleta las opciones y marca como error las desconocidas. Los parámetros de locale, país o
algoritmo sugieren los valores conocidos y aceptan cualquier string (un valor desconocido lanza
`ValidationConfigError` en tiempo de ejecución). Una opción omitida toma el valor por defecto del
validador.

En las tablas, **negrita** = propiedad obligatoria.

### Texto y contenido

| Firma                             | Opciones (valor por defecto)                                                                   | Comprueba que el valor…                                                |
| --------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `isAlpha(value, options?)`        | `locale` (`'en-US'`, ver `isAlphaLocales`), `ignore` (string o RegExp de caracteres a ignorar) | solo tiene letras del locale                                           |
| `isAlphanumeric(value, options?)` | `locale` (`'en-US'`, ver `isAlphanumericLocales`), `ignore`                                    | solo tiene letras del locale y dígitos                                 |
| `isAscii(value)`                  | —                                                                                              | solo tiene caracteres ASCII                                            |
| `isLowercase(value)`              | —                                                                                              | no cambia al pasarlo a minúsculas                                      |
| `isUppercase(value)`              | —                                                                                              | no cambia al pasarlo a mayúsculas                                      |
| `isFullWidth(value)`              | —                                                                                              | contiene caracteres de ancho completo                                  |
| `isHalfWidth(value)`              | —                                                                                              | contiene caracteres de medio ancho                                     |
| `isVariableWidth(value)`          | —                                                                                              | mezcla caracteres de ancho completo y de medio ancho                   |
| `isMultibyte(value)`              | —                                                                                              | contiene caracteres multibyte                                          |
| `isSurrogatePair(value)`          | —                                                                                              | contiene pares sustitutos UTF-16                                       |
| `isSlug(value)`                   | —                                                                                              | es un slug (`mi-articulo-1`)                                           |
| `isLength(value, options?)`       | `min` (`0`), `max`, `discreteLengths` (longitudes permitidas), `graphemes` (contar grafemas)   | tiene una longitud dentro del rango                                    |
| `isByteLength(value, options?)`   | `min` (`0`), `max`                                                                             | ocupa en UTF-8 un número de bytes dentro del rango                     |
| `isEmpty(value, options?)`        | `ignore_whitespace` (`false`)                                                                  | es el string vacío                                                     |
| `isNotEmpty(value)`               | —                                                                                              | es un string con algún carácter que no es espacio, o un número finito  |
| `isRequired(value)`               | —                                                                                              | no es `null` ni `undefined`                                            |
| `contains(value, options)`        | **`elem`**, `ignoreCase` (`false`), `minOccurrences` (`1`)                                     | contiene `elem` al menos `minOccurrences` veces                        |
| `equals(value, options)`          | **`comparison`**                                                                               | es igual a `comparison`                                                |
| `matches(value, options)`         | **`pattern`** (RegExp o string), `modifiers` (flags si `pattern` es string)                    | encaja con el patrón                                                   |
| `isIn(value, options)`            | **`values`** (array, objeto o string)                                                          | está en el array, es una clave del objeto o es un substring del string |
| `isWhitelisted(value, options)`   | **`chars`** (string o array de caracteres)                                                     | solo tiene caracteres de `chars`                                       |

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
isLength('hola', { min: 2, max: 10 }); // true
isLength('👍🏽', { max: 1 }); // false
isLength('👍🏽', { max: 1, graphemes: true }); // true
isNotEmpty('  '); // false
isNotEmpty(0); // true
isRequired(''); // true
isRequired(null); // false
contains('Hola Mundo', { elem: 'mundo', ignoreCase: true }); // true
matches('ABC-123', { pattern: /^[A-Z]{3}-\d{3}$/ }); // true
matches('abc', { pattern: '^ABC$', modifiers: 'i' }); // true
isIn('b', { values: ['a', 'b'] }); // true
isIn('es', { values: { es: 1, en: 2 } }); // true
```

### Números

| Firma                           | Opciones (valor por defecto)                                                                                   | Comprueba que el valor…                                                                                        |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `isInt(value, options?)`        | `min`, `max`, `lt`, `gt`, `allow_leading_zeroes` (`true`)                                                      | es un entero (con los límites indicados)                                                                       |
| `isFloat(value, options?)`      | `min`, `max`, `lt`, `gt`, `locale` (separador decimal del locale, ver `isFloatLocales`)                        | es un número decimal finito (con los límites indicados)                                                        |
| `isDecimal(value, options?)`    | `force_decimal` (`false`), `decimal_digits` (`'1,'`: rango de decimales, p. ej. `'1,2'`), `locale` (`'en-US'`) | es un número decimal                                                                                           |
| `isNumeric(value, options?)`    | `no_symbols` (sin signo ni punto), `locale` (separador decimal; `.` si no se indica)                           | solo tiene dígitos (y signo/separador si se permiten)                                                          |
| `isDivisibleBy(value, options)` | **`num`**                                                                                                      | es un número divisible por `num`                                                                               |
| `isHexadecimal(value)`          | —                                                                                                              | es un número hexadecimal                                                                                       |
| `isOctal(value)`                | —                                                                                                              | es un número octal                                                                                             |
| `isPort(value)`                 | —                                                                                                              | es un entero entre 0 y 65535 sin ceros a la izquierda                                                          |
| `isBoolean(value, options?)`    | `loose` (`false`)                                                                                              | es `'true'`, `'false'`, `'1'` o `'0'` exactos; con `loose`, sin distinguir mayúsculas y también `'yes'`/`'no'` |

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

| Firma                           | Opciones (valor por defecto)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Comprueba que el valor…          |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `isEmail(value, options?)`      | `allow_display_name` (`false`), `require_display_name` (`false`), `allow_utf8_local_part` (`true`), `require_tld` (`true`), `allow_underscores` (`false`), `blacklisted_chars` (`''`), `ignore_max_length` (`false`), `host_blacklist` (`[]`), `host_whitelist` (`[]`), `allow_ip_domain`, `domain_specific_validation`                                                                                                                                                                                                                  | es una dirección de email        |
| `isURL(value, options?)`        | `protocols` (`['http', 'https', 'ftp']`), `require_tld` (`true`), `require_protocol` (`false`), `require_host` (`true`), `require_port` (`false`), `require_valid_protocol` (`true`), `allow_underscores` (`false`), `allow_trailing_dot` (`false`), `allow_protocol_relative_urls` (`false`), `allow_fragments` (`true`), `allow_query_components` (`true`), `validate_length` (`true`), `max_allowed_length` (`2084`), `disallow_auth`, `host_whitelist`, `host_blacklist`, `allow_wildcard`, `allow_numeric_tld`, `ignore_max_length` | es una URL                       |
| `isFQDN(value, options?)`       | `require_tld` (`true`), `allow_underscores` (`false`), `allow_trailing_dot` (`false`), `allow_numeric_tld` (`false`), `allow_wildcard` (`false`), `ignore_max_length` (`false`)                                                                                                                                                                                                                                                                                                                                                          | es un nombre de dominio completo |
| `isIP(value, options?)`         | `version` (`4` o `6`; sin indicar, cualquiera)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | es una IP                        |
| `isIPRange(value, options?)`    | `version` (`4` o `6`; sin indicar, cualquiera)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | es un rango CIDR                 |
| `isMACAddress(value, options?)` | `no_separators`, `no_colons`, `eui` (`'48'` o `'64'`; sin indicar, cualquiera)                                                                                                                                                                                                                                                                                                                                                                                                                                                           | es una dirección MAC             |
| `isDataURI(value)`              | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | es un data URI                   |
| `isMagnetURI(value)`            | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | es un enlace magnet              |
| `isMailtoURI(value, options?)`  | las opciones de `isEmail`, aplicadas a cada dirección                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | es un URI `mailto:`              |

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

### Fechas y horas

| Firma                        | Opciones (valor por defecto)                                                                                                   | Comprueba que el valor…                                         |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| `isDate(value, options?)`    | `format` (`'YYYY/MM/DD'`), `delimiters` (`['/', '-']`), `strictMode` (`false`), `twoDigitYearPivot` (año actual de dos cifras) | es una fecha de calendario con ese formato (o un `Date` válido) |
| `isTime(value, options?)`    | `hourFormat` (`'hour24'` o `'hour12'`), `mode` (`'default'`, `'withSeconds'` o `'withOptionalSeconds'`)                        | es una hora                                                     |
| `isISO8601(value, options?)` | `strict` (además comprueba que la fecha exista), `strictSeparator` (exige `T`)                                                 | es una fecha ISO 8601                                           |
| `isRFC3339(value)`           | —                                                                                                                              | es una fecha RFC 3339                                           |
| `isAfter(value, options?)`   | `comparisonDate` (por defecto, ahora)                                                                                          | es una fecha posterior a `comparisonDate`                       |
| `isBefore(value, options?)`  | `comparisonDate` (por defecto, ahora)                                                                                          | es una fecha anterior a `comparisonDate`                        |

`isAfter` e `isBefore` interpretan las fechas de forma determinista, sin depender de la zona horaria
de la máquina: aceptan fechas ISO (también de precisión reducida, como `'2024'` o `'2024-03'`) y la
salida de `Date#toString()` y `Date#toUTCString()`, pero no formatos que dependen del motor, como
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

### Identificadores, hashes y codificaciones

| Firma                       | Opciones (valor por defecto)                                                                                                                         | Comprueba que el valor…                 |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `isUUID(value, options?)`   | `version` (`'all'`; también `'loose'`, `'nil'`, `'max'`, `1`…`8`)                                                                                    | es un UUID                              |
| `isULID(value)`             | —                                                                                                                                                    | es un ULID                              |
| `isMongoId(value)`          | —                                                                                                                                                    | es un ObjectId de MongoDB               |
| `isJWT(value)`              | —                                                                                                                                                    | tiene la forma de un JWT                |
| `isMD5(value)`              | —                                                                                                                                                    | es un hash MD5                          |
| `isHash(value, options)`    | **`algorithm`**: `md5`, `md4`, `sha1`, `sha256`, `sha384`, `sha512`, `ripemd128`, `ripemd160`, `tiger128`, `tiger160`, `tiger192`, `crc32`, `crc32b` | es un hash hexadecimal de ese algoritmo |
| `isBase32(value, options?)` | `crockford` (`false`)                                                                                                                                | está en Base32                          |
| `isBase58(value)`           | —                                                                                                                                                    | está en Base58                          |
| `isBase64(value, options?)` | `urlSafe` (`false`), `padding` (por defecto `true`, o `false` si `urlSafe`)                                                                          | está en Base64                          |
| `isJSON(value, options?)`   | `allow_primitives` (`false`: además `true`, `false` y `null`), `allow_any_value` (`false`: cualquier JSON)                                           | es JSON que se parsea a objeto o array  |
| `isSemVer(value)`           | —                                                                                                                                                    | es una versión semántica                |
| `isMimeType(value)`         | —                                                                                                                                                    | es un tipo MIME                         |

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

### Colores

| Firma                         | Opciones (valor por defecto)                             | Comprueba que el valor…      |
| ----------------------------- | -------------------------------------------------------- | ---------------------------- |
| `isHexColor(value, options?)` | `require_hashtag` (`false`)                              | es un color hexadecimal      |
| `isRgbColor(value, options?)` | `includePercentValues` (`true`), `allowSpaces` (`false`) | es un color `rgb()`/`rgba()` |
| `isHSL(value)`                | —                                                        | es un color `hsl()`/`hsla()` |

```ts
import { isHexColor, isRgbColor, isHSL } from '@archi-code/validation';

isHexColor('ff0000', { require_hashtag: true }); // false
isRgbColor('rgb(255, 0, 0)'); // false
isRgbColor('rgb(255, 0, 0)', { allowSpaces: true }); // true
isHSL('hsl(120, 100%, 50%)'); // true
```

### Finanzas y pagos

| Firma                           | Opciones (valor por defecto)                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Comprueba que el valor…                     |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `isIBAN(value, options?)`       | `whitelist`, `blacklist` (códigos de país, ver `ibanLocales`)                                                                                                                                                                                                                                                                                                                                                                                                                                            | es un IBAN (formato y dígitos de control)   |
| `isBIC(value)`                  | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | es un código BIC/SWIFT                      |
| `isAbaRouting(value)`           | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | es un número de ruta bancaria ABA (EE. UU.) |
| `isCreditCard(value, options?)` | `provider`: `amex`, `dinersclub`, `discover`, `jcb`, `mastercard`, `unionpay`, `visa` (sin indicar, cualquiera)                                                                                                                                                                                                                                                                                                                                                                                          | es un número de tarjeta                     |
| `isLuhnNumber(value)`           | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | supera el algoritmo de Luhn                 |
| `isCurrency(value, options?)`   | `symbol` (`'$'`), `require_symbol` (`false`), `allow_space_after_symbol` (`false`), `symbol_after_digits` (`false`), `allow_negatives` (`true`), `parens_for_negatives` (`false`), `negative_sign_before_digits` (`false`), `negative_sign_after_digits` (`false`), `allow_negative_sign_placeholder` (`false`), `thousands_separator` (`','`), `decimal_separator` (`'.'`), `allow_decimal` (`true`), `require_decimal` (`false`), `digits_after_decimal` (`[2]`), `allow_space_after_digits` (`false`) | es un importe monetario                     |
| `isVAT(value, options)`         | **`countryCode`** (p. ej. `'ES'`, `'GB'`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                | tiene el formato de NIF-IVA de ese país     |
| `isISIN(value)`                 | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | es un ISIN                                  |
| `isISO4217(value)`              | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | es un código de moneda ISO 4217             |
| `isEthereumAddress(value)`      | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | es una dirección Ethereum                   |
| `isBtcAddress(value)`           | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | es una dirección Bitcoin                    |

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

### Personas, países e idiomas

| Firma                               | Opciones (valor por defecto)                                                                                       | Comprueba que el valor…                    |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| `isMobilePhone(value, options?)`    | `locale` (uno, una lista o `'any'`; sin indicar, cualquiera; ver `isMobilePhoneLocales`), `strictMode` (exige `+`) | es un móvil de alguno de los locales       |
| `isPostalCode(value, options)`      | **`locale`** (código de país o `'any'`, ver `isPostalCodeLocales`)                                                 | es un código postal de ese país            |
| `isIdentityCard(value, options?)`   | `locale` (`'any'`)                                                                                                 | es un documento de identidad de ese locale |
| `isPassportNumber(value, options)`  | **`countryCode`** (ver `passportNumberLocales`)                                                                    | tiene el formato de pasaporte de ese país  |
| `isLicensePlate(value, options)`    | **`locale`** (p. ej. `'de-DE'`, `'pt-BR'`, o `'any'`)                                                              | es una matrícula de ese locale             |
| `isLatLong(value, options?)`        | `checkDMS` (`false`: grados, minutos y segundos)                                                                   | es un par `latitud,longitud`               |
| `isLocale(value)`                   | —                                                                                                                  | es un identificador de locale              |
| `isISO6391(value)`                  | —                                                                                                                  | es un código de idioma ISO 639-1           |
| `isISO15924(value)`                 | —                                                                                                                  | es un código de escritura ISO 15924        |
| `isISO31661Alpha2(value, options?)` | `userAssignedCodes` (códigos extra aceptados)                                                                      | es un código de país ISO 3166-1 alfa-2     |
| `isISO31661Alpha3(value, options?)` | `userAssignedCodes`                                                                                                | es un código de país ISO 3166-1 alfa-3     |
| `isISO31661Numeric(value)`          | —                                                                                                                  | es un código de país ISO 3166-1 numérico   |

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
isMobilePhone('600', { locale: 'xx-XX' }); // lanza ValidationConfigError: Invalid locale 'xx-XX'
isPostalCode('21001', { locale: 'ES' }); // true
isIdentityCard('12345678Z', { locale: 'ES' }); // true
isLicensePlate('B-AB 1234', { locale: 'de-DE' }); // true
isISO31661Alpha2('XK'); // false
isISO31661Alpha2('XK', { userAssignedCodes: ['XK'] }); // true
```

### Productos, publicaciones y dispositivos

| Firma                         | Opciones (valor por defecto)                     | Comprueba que el valor…             |
| ----------------------------- | ------------------------------------------------ | ----------------------------------- |
| `isISBN(value, options?)`     | `version` (`10` o `13`; sin indicar, cualquiera) | es un ISBN                          |
| `isISSN(value, options?)`     | `case_sensitive`, `require_hyphen`               | es un ISSN                          |
| `isEAN(value)`                | —                                                | es un código EAN                    |
| `isISRC(value)`               | —                                                | es un ISRC                          |
| `isIMEI(value, options?)`     | `allow_hyphens`                                  | es un IMEI                          |
| `isISO6346(value)`            | —                                                | es un código de contenedor ISO 6346 |
| `isFreightContainerID(value)` | —                                                | alias de `isISO6346`                |

```ts
import { isISBN, isIMEI, isISO6346 } from '@archi-code/validation';

isISBN('978-3-16-148410-0'); // true
isISBN('0-306-40615-2', { version: 10 }); // true
isIMEI('49-015420-323751-8', { allow_hyphens: true }); // true
isISO6346('CSQU3054383'); // true
```

### Contraseñas

| Firma                               | Opciones (valor por defecto)                                                                          | Comprueba que el valor…  |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------ |
| `isStrongPassword(value, options?)` | `minLength` (`8`), `minLowercase` (`1`), `minUppercase` (`1`), `minNumbers` (`1`), `minSymbols` (`1`) | cumple todos los mínimos |

Ver [Contraseñas](#contraseñas-isstrongpassword-y-scorepassword).

### Listas de locales

Son arrays congelados (`readonly string[]`) con las claves que acepta cada validador. También están
en el registro `validator`.

| Export                  | Locales / países de                    |
| ----------------------- | -------------------------------------- |
| `isAlphaLocales`        | `isAlpha`                              |
| `isAlphanumericLocales` | `isAlphanumeric`                       |
| `isFloatLocales`        | `isFloat` (y `isDecimal`, `isNumeric`) |
| `ibanLocales`           | `isIBAN`                               |
| `isMobilePhoneLocales`  | `isMobilePhone`                        |
| `isPostalCodeLocales`   | `isPostalCode`                         |
| `passportNumberLocales` | `isPassportNumber`                     |

```ts
import { isAlphaLocales, isMobilePhoneLocales } from '@archi-code/validation';

isAlphaLocales.includes('es-ES'); // true
isMobilePhoneLocales.includes('es-ES'); // true
```

### Registro `validator`

`validator` es un objeto congelado con los 91 validadores y las 7 listas de locales. Su tipo es
`ValidatorRegistry`. Sirve para acceder por nombre:

```ts
import { validator } from '@archi-code/validation';

validator.isInt('5'); // true
```

## Conversores `to*`

Convierten un valor a un tipo y nunca lanzan. Devuelven `Converted<T>`:

```ts
type Converted<T> =
  | { readonly ok: true; readonly value: T; readonly error: null }
  | { readonly ok: false; readonly value: null; readonly error: ConvertMessage };
```

Comprobar `ok` estrecha el tipo: dentro de `if (r.ok)` el `value` es `T`.

| Firma                                           | Regla por defecto                                                                                                                                          | Opciones                                                                                                                                                                                                            |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `toString(v): Converted<string>`                | Strings, booleanos y números finitos                                                                                                                       | —                                                                                                                                                                                                                   |
| `toBoolean(v, options?): Converted<boolean>`    | `true`/`false`, `1`/`0` y los strings `'true'`/`'false'`/`'1'`/`'0'` recortados y sin distinguir mayúsculas                                                | `mode`: `'default'`, `'strict'` (strings exactos, sin recortar ni pasar a minúsculas) o `'loose'` (sin distinguir mayúsculas, sin recortar, añade `'yes'`/`'no'`)                                                   |
| `toInteger(v, options?): Converted<number>`     | Enteros seguros, como número o como string recortado `-?\d+`; fuera de ±2^53 falla con `INTEGER_OVERFLOW`                                                  | `syntax: 'validator'` (la regla de `isInt`: admite `+`), `allowLeadingZeroes` (con `syntax: 'validator'`; `false` rechaza ceros a la izquierda)                                                                     |
| `toFloat(v, options?): Converted<number>`       | Números finitos o strings recortados en notación decimal (no `0x`/`0b`/`0o`)                                                                               | `syntax: 'validator'` (la regla de `isFloat`), `decimalSeparator` (con `syntax: 'validator'`; por defecto `'.'`)                                                                                                    |
| `toDate(v, options?): Converted<Date>`          | `YYYY/MM/DD` con `/` o `-` como separador (resultado: ese día a las 00:00 UTC) o un `Date` válido                                                          | `format`, `delimiters`, `strictMode`, `twoDigitYearPivot` (como `isDate`); `iso: true` (fecha u hora ISO, con zona opcional); `lax: true` (ISO de precisión reducida y salida de `Date#toString()`/`toUTCString()`) |
| `toJson(v): Converted<Record<string, unknown>>` | Un objeto JSON plano no vacío: texto JSON, u objeto que sobrevive a un viaje JSON (objetos/arrays planos con strings, booleanos, números finitos o `null`) | —                                                                                                                                                                                                                   |
| `toJsonValue(v, options?): Converted<unknown>`  | Texto JSON que se parsea a objeto o array                                                                                                                  | `allowPrimitives` (además `true`, `false`, `null`), `allowAnyValue` (cualquier JSON)                                                                                                                                |
| `toArray(v): Converted<unknown[]>`              | Arrays, o texto JSON que contiene un array                                                                                                                 | —                                                                                                                                                                                                                   |
| `toEnum(v, options): Converted<T>`              | Un string, número o booleano cuya forma de texto está en `options` (`readonly T[]`)                                                                        | —                                                                                                                                                                                                                   |

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

Con TypeScript, `ok` decide el tipo de `value`:

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

> Las fechas ISO con hora necesitan la regla ISO: `canBeDate('2024-01-31T10:00:00Z')` es `false`,
> mientras que `toDate('2024-01-31T10:00:00Z', { iso: true })` es `ok`.

### `ConvertMessages`

Objeto congelado con los únicos mensajes de error posibles. Su tipo de valores es `ConvertMessage`.

| Clave              | Mensaje                                                                           |
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

`anyToString(value: any): string` describe cualquier valor de forma legible, para logs y mensajes de
error. Nunca lanza.

```ts
import { anyToString } from '@archi-code/validation';

anyToString(null); // 'null'
anyToString({ a: 1 }); // '{"a":1}'
anyToString(new Date('2024-01-01T00:00:00Z')); // 'Date(2024-01-01T00:00:00.000Z)'
anyToString(new Map([['a', 1]])); // 'Map({a: 1})'
anyToString(new Error('boom')); // 'new Error(boom)'
anyToString(function foo() {}); // 'Function(foo)'
```

## Comprobaciones `canBe*`

Devuelven `boolean` y equivalen siempre a `toX(value).ok` con las opciones por defecto.

| Firma                                               | Equivale a              |
| --------------------------------------------------- | ----------------------- |
| `canBeString(v): boolean`                           | `toString(v).ok`        |
| `canBeBoolean(v): boolean`                          | `toBoolean(v).ok`       |
| `canBeInteger(v): boolean`                          | `toInteger(v).ok`       |
| `canBeFloat(v): boolean`                            | `toFloat(v).ok`         |
| `canBeDate(v): boolean`                             | `toDate(v).ok`          |
| `canBeJson(v): boolean`                             | `toJson(v).ok`          |
| `canBeJsonObject(v): boolean`                       | alias de `canBeJson`    |
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

## Sanitizadores

Se agrupan en el namespace `sanitizer`. A diferencia de los validadores, reciben un `string` y
lanzan `TypeError` (`Expected a string but received a …`) si el primer argumento no lo es.

| Firma                                                        | Qué hace                                                                       |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| `sanitizer.trim(str, chars?): string`                        | Quita espacios (o los caracteres de `chars`) al principio y al final           |
| `sanitizer.ltrim(str, chars?): string`                       | Igual, solo al principio                                                       |
| `sanitizer.rtrim(str, chars?): string`                       | Igual, solo al final                                                           |
| `sanitizer.escape(str): string`                              | Escapa `&`, `<`, `>`, `"`, `'`, `/` y otros caracteres como entidades HTML     |
| `sanitizer.unescape(str): string`                            | Deshace `escape`                                                               |
| `sanitizer.blacklist(str, chars): string`                    | Elimina los caracteres de `chars` (literales, sin rangos)                      |
| `sanitizer.whitelist(str, chars): string`                    | Conserva solo los caracteres de `chars` (literales, sin rangos)                |
| `sanitizer.stripLow(str, keepNewLines?): string`             | Elimina caracteres de control ASCII (con `keepNewLines`, conserva `\n` y `\r`) |
| `sanitizer.normalizeEmail(email, options?): string \| false` | Normaliza un email; devuelve `false` si no tiene `@`                           |

Opciones de `normalizeEmail` (`NormalizeEmailOptions`), todas `true` por defecto: `all_lowercase`,
`gmail_lowercase`, `gmail_remove_dots`, `gmail_remove_subaddress`, `gmail_convert_googlemaildotcom`,
`outlookdotcom_lowercase`, `outlookdotcom_remove_subaddress`, `yahoo_lowercase`,
`yahoo_remove_subaddress`, `yandex_lowercase`, `yandex_convert_yandexru`, `icloud_lowercase`,
`icloud_remove_subaddress`.

```ts
import { sanitizer } from '@archi-code/validation';

sanitizer.trim('xxholaxx', 'x'); // 'hola'
sanitizer.escape('<b>"Hola"</b>'); // '&lt;b&gt;&quot;Hola&quot;&lt;&#x2F;b&gt;'
sanitizer.unescape('&lt;b&gt;'); // '<b>'
sanitizer.whitelist('abc123', 'abc'); // 'abc'
sanitizer.blacklist('abc123', '123'); // 'abc'
sanitizer.stripLow('a\x00b\nc', true); // 'ab\nc'
sanitizer.normalizeEmail('Ana.Lopez+news@Gmail.com'); // 'analopez@gmail.com'
sanitizer.normalizeEmail('Ana.Lopez+news@Gmail.com', { gmail_remove_dots: false }); // 'ana.lopez@gmail.com'
sanitizer.normalizeEmail('no-es-email'); // false
sanitizer.trim(42); // lanza TypeError: Expected a string but received a number
```

## Contraseñas: `isStrongPassword` y `scorePassword`

`isStrongPassword(value, options?)` devuelve `boolean`: `true` si la contraseña cumple todos los
mínimos (`minLength` `8`, `minLowercase` `1`, `minUppercase` `1`, `minNumbers` `1`, `minSymbols` `1`).

`scorePassword(value, options?): number` devuelve una puntuación numérica (no es un validador). Suma
`pointsPerUnique` por cada carácter distinto, `pointsPerRepeat` por cada repetido y un bonus por
contener minúsculas, mayúsculas, números y símbolos. Un valor que no se puede pasar a string
puntúa `0`.

| Opción de `ScorePasswordOptions` | Por defecto |
| -------------------------------- | ----------- |
| `pointsPerUnique`                | `1`         |
| `pointsPerRepeat`                | `0.5`       |
| `pointsForContainingLower`       | `10`        |
| `pointsForContainingUpper`       | `10`        |
| `pointsForContainingNumber`      | `10`        |
| `pointsForContainingSymbol`      | `10`        |

```ts
import { isStrongPassword, scorePassword } from '@archi-code/validation';

isStrongPassword('Abcdef1!'); // true
isStrongPassword('abcdefgh', { minUppercase: 0, minNumbers: 0, minSymbols: 0 }); // true
scorePassword('Abcdef1!'); // 48
scorePassword('aaaa'); // 12.5
```

## Decorador `@Validations` y `runValidations`

`@Validations(lista)` asocia una lista de validaciones a una clase. `runValidations(Clase, valor)` las
ejecuta (incluidas las heredadas) contra un valor y devuelve un `ValidationResult`.

```ts
import { Validations, runValidations } from '@archi-code/validation';

@Validations([{ validator: 'isInt', properties: { min: 0 } }])
class Quantity {}

runValidations(Quantity, '-3');
// { ok: false, value: '-3', errors: [{ validator: 'isInt', message: 'Value does not satisfy isInt' }] }
runValidations(Quantity, '7');
// { ok: true, value: '7', errors: [] }
```

El decorador solo guarda metadatos: no cambia la clase, no envuelve su constructor y no valida nada
por sí mismo. La validación ocurre únicamente al llamar a `runValidations`.

### Configuración de TypeScript

Funciona con los dos modos de decoradores:

- **Decoradores legacy** (`"experimentalDecorators": true`).
- **Decoradores estándar** (TypeScript 5+ sin `experimentalDecorators`).

No necesita `emitDecoratorMetadata` ni `reflect-metadata`.

### Declarar validaciones

El decorador recibe un array. Cada elemento es de uno de estos dos tipos:

**Validación integrada** (`BuiltInValidation`): ejecuta uno de los validadores del paquete.
`validator` es su nombre y `properties` es su objeto de opciones, que se pasa tal cual como segundo
argumento: `{ validator: 'isVAT', properties: { countryCode: 'ES' } }` ejecuta
`isVAT(value, { countryCode: 'ES' })`. El tipo de `properties` sale de la firma del validador:

| Firma del validador                                      | `properties` |
| -------------------------------------------------------- | ------------ |
| Con opciones obligatorias (`isHash`, `isIn`, `matches`…) | Obligatorio  |
| Solo con opciones opcionales (`isInt`, `isEmail`…)       | Opcional     |
| Solo recibe el valor (`isPort`, `isSlug`…)               | No permitido |

**Validación propia** (`CustomValidation`): `custom` es su nombre (aparece en los errores) y
`fn: (value: unknown) => boolean` decide; un resultado truthy pasa y uno falsy falla.

Las dos admiten `message`. Sin él, el mensaje es `Value does not satisfy <nombre>`.

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

**Identidad.** Dos validaciones son «la misma» si tienen el mismo tipo y nombre: `validator: 'isInt'`
es una identidad y `custom: 'isInt'` es otra; una integrada y una propia con el mismo nombre nunca se
reemplazan. `properties`, `fn` y `message` no cuentan para la identidad.

### Valores ausentes e `isRequired`

- **Con valor** (ni `null` ni `undefined`), se ejecutan todas las validaciones, se haya declarado
  `isRequired` o no.
- **Sin valor** (`null` o `undefined`), solo decide `isRequired`: si la clase o algún padre declara
  `{ validator: 'isRequired' }`, solo se ejecuta esa y falla; si no, el valor es opcional, no se
  ejecuta nada y el resultado es `ok`.

```ts
import { Validations, runValidations } from '@archi-code/validation';

@Validations([{ validator: 'isRequired' }, { validator: 'isEmail', message: 'Email no válido' }])
class Email {}

runValidations(Email, undefined);
// { ok: false, value: undefined, errors: [{ validator: 'isRequired', message: 'Value does not satisfy isRequired' }] }
runValidations(Email, 'x');
// { ok: false, value: 'x', errors: [{ validator: 'isEmail', message: 'Email no válido' }] }

@Validations([{ validator: 'isInt', properties: { min: 0 } }])
class OptionalQuantity {}

runValidations(OptionalQuantity, null);
// { ok: true, value: null, errors: [] }
```

### Herencia y reemplazo

`runValidations(Hija, valor)` recorre la cadena desde el padre raíz hasta `Hija` y combina las
validaciones propias de cada clase:

1. Primero van las del padre raíz y luego las de cada subclase, en orden de declaración.
2. Una validación de la subclase con la misma identidad que una heredada **la reemplaza** y conserva
   su posición.
3. Una clase intermedia sin `@Validations` transmite las de su padre sin cambios.
4. Declarar una subclase nunca cambia al padre.

```ts
import { Validations, runValidations } from '@archi-code/validation';

@Validations([{ validator: 'isInt', properties: { min: 0 } }, { validator: 'isEmail' }])
class Parent {}

@Validations([{ validator: 'isInt', properties: { min: 5 } }, { validator: 'isPort' }])
class Child extends Parent {}

runValidations(Child, 'x');
// ejecuta, en orden: isInt { min: 5 } (reemplaza y conserva el primer puesto), isEmail, isPort
```

Aplicar `@Validations` otra vez a la misma clase sigue las mismas reglas. Varios decoradores sobre una
clase se aplican de abajo arriba, como siempre en TypeScript:

```ts
@Validations([{ validator: 'isEmail' }]) // se aplica en segundo lugar
@Validations([{ validator: 'isInt' }, { validator: 'isPort' }]) // se aplica primero
class Stacked {}
// runValidations(Stacked, valor) ejecuta: isInt, isPort, isEmail
```

### Cuándo se ejecuta cada parte

| Momento                                                     | Qué ocurre                                                                                                                                             |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Se define la clase** (normalmente, al importar su módulo) | El decorador se ejecuta una vez: comprueba la declaración, congela una copia y la guarda. Una declaración errónea lanza aquí e impide cargar el módulo |
| **`new MiClase()`**                                         | Nada. El decorador no añade código al constructor                                                                                                      |
| **`runValidations(MiClase, valor)`**                        | Recorre la cadena de prototipos, combina las listas y ejecuta cada validación en orden. Se recalcula en cada llamada; no hay caché                     |

### Comprobaciones de la declaración

El decorador comprueba cada elemento al decorar la clase. Al primer error lanza
`ValidationConfigError` y no guarda nada para esa clase.

| Declaración                                                                | Mensaje                                                                                            |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Se aplica a algo que no es una clase                                       | `@Validations can only decorate a class`                                                           |
| El argumento no es un array                                                | `@Validations expects an array of validations`                                                     |
| Un elemento no es un objeto                                                | `A validation must be an object`                                                                   |
| Un elemento no tiene ni `validator` ni `custom`                            | `A validation needs "validator" or "custom"`                                                       |
| Un elemento tiene `validator` y `custom` a la vez                          | `A validation cannot have both "validator" and "custom"`                                           |
| `custom` no es un string no vacío                                          | `"custom" must be a non-empty string`                                                              |
| Validación propia sin función `fn`                                         | `Custom "<nombre>" needs a "fn" function`                                                          |
| `validator` no está en el registro (errata, `isAlphaLocales`, `toString`…) | `Unknown validator "<nombre>"`                                                                     |
| La misma identidad dos veces en una lista                                  | `Validator "<nombre>" is declared more than once` / `Custom "<nombre>" is declared more than once` |

Con TypeScript la mayoría ya son errores de compilación; las comprobaciones en tiempo de ejecución
cubren llamadas desde JavaScript y casts. No se comprueba al decorar si `properties` es correcto para
el validador (lo garantizan los tipos); un valor erróneo desde JavaScript aparece en `runValidations`.

### Resultado de `runValidations`

```ts
type ValidationResult<T> =
  | { readonly ok: true; readonly value: T; readonly errors: readonly [] }
  | { readonly ok: false; readonly value: T; readonly errors: readonly ValidationError[] };

type ValidationError = { validator: string; message: string } | { custom: string; message: string };
```

- **Un fallo no detiene el resto**: hay un error por cada validación fallida, en el mismo orden.
- **`ok` es `true` exactamente cuando `errors` está vacío.**
- **`value` es el valor validado** tal como se pasó: ni copiado ni convertido.
- **El resultado está congelado**, errores incluidos, y cada llamada devuelve uno nuevo.
- **`'validator' in error`** distingue un error de una validación integrada de uno propio.
- Una clase sin validaciones (ni propias ni heredadas) siempre es válida.

```ts
const result = runValidations(Example, '5');
if (!result.ok) {
  for (const error of result.errors) {
    console.log('validator' in error ? error.validator : error.custom, error.message);
  }
}
```

**Qué puede lanzar `runValidations`:**

- `ValidationConfigError` si el primer argumento no es una clase (una instancia, un objeto, un
  string): `runValidations expects a class, not an instance or a value`.
- `ValidationConfigError` de un validador integrado mal configurado (p. ej. `isHash` sin
  `algorithm` desde JavaScript).
- `ValidationConfigError` `Unknown validator "<nombre>"` si la clase la decoró otra copia del
  paquete que tiene un validador que esta copia no conoce (ver abajo).
- Lo que lance tu propia `fn`: no se captura, se propaga y detiene las validaciones restantes. Si una
  regla propia puede fallar con entradas raras, haz que `fn` devuelva `false`.

### Objetos que se validan solos: `Validatable<T>`

`Validatable<T>` es la interfaz `{ validate(): ValidationResult<T> }`, útil para value objects:

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

### Inmutabilidad y almacenamiento

- El decorador guarda una copia profunda congelada de los objetos y arrays planos de la declaración:
  cambiar después el array declarado o sus `properties` no afecta a la clase. Los valores que no son
  objetos o arrays planos (una `RegExp`, un `Date`, la función `fn`) se guardan tal cual.
- Las validaciones viven en un registro en `globalThis` bajo
  `Symbol.for('@archi-code/validation/decorator.v1')`. Todas las copias del paquete en el mismo realm
  de JavaScript (el build CJS y el ESM cargados a la vez, o dos copias instaladas en `node_modules`)
  comparten el mismo registro. Otro realm (un worker, un iframe, un contexto `vm`) tiene el suyo.

### Errores comunes

- **Pasa la clase, no una instancia.** `runValidations(new Quantity(), valor)` lanza
  `ValidationConfigError`. Desde una instancia usa
  `runValidations(instance.constructor as typeof Quantity, valor)`.
- **Un error de declaración ocurre al importar.** Una declaración errónea lanza al cargar el módulo
  que define la clase, así que puede aparecer como un import fallido. Es intencionado: el error sale
  al arrancar, no con el primer valor.

## Errores y excepciones

| Quién                        | Cuándo                                                                                  | Qué lanza / devuelve                                             |
| ---------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Validadores `is*`            | Valor inválido de cualquier tipo                                                        | `false` (nunca lanzan por el valor)                              |
| Validadores `is*`            | Configuración inválida (locale/país/algoritmo desconocido, opciones que no son objeto…) | `ValidationConfigError`                                          |
| Conversores `to*` y `canBe*` | Siempre                                                                                 | Nunca lanzan: `{ ok: false, value: null, error }` / `false`      |
| `anyToString`                | Siempre                                                                                 | Nunca lanza                                                      |
| `sanitizer.*`                | El primer argumento no es un string                                                     | `TypeError`                                                      |
| `@Validations`               | Declaración inválida                                                                    | `ValidationConfigError` (al decorar)                             |
| `runValidations`             | El objetivo no es una clase o un validador está mal configurado                         | `ValidationConfigError`; lo que lance una `fn` propia se propaga |

`ValidationConfigError` extiende `Error` y su `name` es `'ValidationConfigError'`:

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

## Tipos exportados

Todos se importan con `import type { … } from '@archi-code/validation'`.

**Conversores**

| Tipo                                                                                                                     | Descripción                                                              |
| ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| `Converted<T>`                                                                                                           | `Success<T> \| Failure`                                                  |
| `Success<T>`                                                                                                             | `{ ok: true; value: T; error: null }`                                    |
| `Failure`                                                                                                                | `{ ok: false; value: null; error: ConvertMessage }`                      |
| `ConvertMessage`                                                                                                         | Unión de los mensajes de `ConvertMessages`                               |
| `BooleanConvertOptions`, `IntegerConvertOptions`, `FloatConvertOptions`, `DateConvertOptions`, `JsonValueConvertOptions` | Opciones de `toBoolean`, `toInteger`, `toFloat`, `toDate`, `toJsonValue` |

**Decorador**

| Tipo                      | Descripción                                                       |
| ------------------------- | ----------------------------------------------------------------- |
| `Validation`              | `BuiltInValidation \| CustomValidation`                           |
| `BuiltInValidation`       | `{ validator, properties?, message? }` tipado por validador       |
| `CustomValidation`        | `{ custom, fn, message? }`                                        |
| `ValidatorName`           | Nombres de los validadores del registro (`'isInt'`, `'isEmail'`…) |
| `ValidationProperties<K>` | Objeto de opciones del validador `K` (`never` si no tiene)        |
| `ValidatedClass`          | Cualquier clase (también abstracta) que acepta `runValidations`   |
| `ValidationResult<T>`     | `ValidationSuccess<T> \| ValidationFailure<T>`                    |
| `ValidationSuccess<T>`    | `{ ok: true; value: T; errors: readonly [] }`                     |
| `ValidationFailure<T>`    | `{ ok: false; value: T; errors: readonly ValidationError[] }`     |
| `ValidationError`         | `{ validator, message } \| { custom, message }`                   |
| `Validatable<T>`          | `{ validate(): ValidationResult<T> }`                             |

**Validadores, sanitizadores y helpers**

- `ValidatorRegistry` (`typeof validator`), `ScorePasswordOptions`, `NormalizeEmailOptions`.
- Opciones de cada validador: `ContainsOptions`, `EqualsOptions`, `MatchesOptions`,
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
- Valores admitidos (sugieren los conocidos y aceptan cualquier string): `AlphaLocale`,
  `AlphanumericLocale`, `CreditCardProvider`, `HashAlgorithm`, `IdentityCardLocale`,
  `LicensePlateLocale`, `MobilePhoneLocale`, `PassportCountryCode`, `PostalCodeLocale`,
  `VATCountryCode`, `IsIPVersion`, `IsISBNVersion` y `IsUUIDVersion`.

```ts
import { isAlpha } from '@archi-code/validation';
import type { IsAlphaOptions } from '@archi-code/validation';

const spanish: IsAlphaOptions = { locale: 'es-ES', ignore: ' ' };
isAlpha('año nuevo', spanish); // true
```

## Diferencias con validator.js

Este paquete se aparta a propósito de validator.js donde el original aceptaba entradas inseguras o
incorrectas.

**Firmas.** validator.js pasa algunos parámetros por posición y admite formas abreviadas; aquí todo
va en el objeto de opciones:

| validator.js                               | @archi-code/validation                                                      |
| ------------------------------------------ | --------------------------------------------------------------------------- |
| `isAlpha(v, locale, { ignore })`           | `isAlpha(v, { locale, ignore })` (igual en `isAlphanumeric`)                |
| `isMobilePhone(v, locale, { strictMode })` | `isMobilePhone(v, { locale, strictMode })`                                  |
| `contains(v, elem, options)`               | `contains(v, { elem, ignoreCase, minOccurrences })`                         |
| `matches(v, pattern, modifiers)`           | `matches(v, { pattern, modifiers })`                                        |
| `equals(v, comparison)`                    | `equals(v, { comparison })`                                                 |
| `isDivisibleBy(v, num)`                    | `isDivisibleBy(v, { num })`                                                 |
| `isHash(v, algorithm)`                     | `isHash(v, { algorithm })`                                                  |
| `isIn(v, values)`                          | `isIn(v, { values })`                                                       |
| `isWhitelisted(v, chars)`                  | `isWhitelisted(v, { chars })`                                               |
| `isPostalCode(v, locale)`                  | `isPostalCode(v, { locale })` (igual en `isLicensePlate`, `isIdentityCard`) |
| `isVAT(v, countryCode)`                    | `isVAT(v, { countryCode })` (igual en `isPassportNumber`)                   |
| `isUUID(v, version)`                       | `isUUID(v, { version })` (igual en `isIPRange`)                             |
| `isIP(v, version)`                         | `isIP(v, { version })` (igual en `isISBN`)                                  |
| `isLength(v, min, max)`                    | `isLength(v, { min, max })` (igual en `isByteLength`)                       |
| `isDate(v, format)`                        | `isDate(v, { format })`                                                     |
| `isAfter(v, date)`                         | `isAfter(v, { comparisonDate })` (igual en `isBefore`)                      |

**Seguridad**

- `isURL` rechaza una barra invertida en la autoridad: `http://evil.com\@good.com` es `false`,
  porque los navegadores tratan `\` como `/`.
- `isURL` nunca lee un esquema que ejecuta código como nombre de usuario: `javascript:foo@example.com`
  (también `vbscript:` y `data:`) es `false` salvo con `require_valid_protocol: false`. Usuario y
  contraseña deben usar caracteres de userinfo de RFC 3986, y se rechazan los controles C0 y DEL en
  toda la URL.
- Las listas de hosts de `isURL` e `isEmail` comparan sin distinguir mayúsculas e ignoran un punto
  final. Un host IPv6 entre corchetes se compara con la whitelist por su dirección.
- `isEmail`: la parte local entrecomillada rechaza CR, LF, DEL y otros caracteres de control
  (inyección de cabeceras), la parte local rechaza caracteres invisibles (ancho cero, bidi, BOM,
  espacios no ASCII) y un nombre visible exige el `>` de cierre.
- `isFQDN` (y por tanto `isURL` e `isEmail`) rechaza en los nombres de host caracteres invisibles,
  controles bidi, separadores Unicode y surrogates sueltos.

**Anclaje y sintaxis**

- `isCreditCard` (Mastercard), `isISO6346`, `isLicensePlate` (`pt-BR`, `fi-FI`),
  `isPassportNumber` (`MZ`, `PH`), `isLatLong` y varias reglas de `isVAT` rechazan basura al
  principio o al final.
- `isMongoId` rechaza el prefijo `0x`/`0h`.
- `isVAT('', { countryCode: 'HN' })` es `false`.

**Números**

- `isFloat` rechaza `'.e5'`, `'e5'` y valores fuera del rango numérico como `'1e400'`, y lee bien
  el separador decimal del locale.
- `isInt` compara los límites con exactitud más allá de `Number.MAX_SAFE_INTEGER`, usando BigInt
  sobre el texto original.

**Fechas**

- `isISO8601(…, { strict: true })` acepta los años 0000–0099.
- `isAfter` e `isBefore` interpretan las fechas de forma determinista, sin depender de la zona
  horaria de la máquina (ver [Fechas y horas](#fechas-y-horas)).

**Otras diferencias**

- `isAlpha` e `isAlphanumeric` toman cada carácter de `ignore` de forma literal.
- `isIdentityCard` usa por defecto el locale `'any'`.
- `isJWT` rechaza una cabecera o un payload vacíos.
- Un locale desconocido dentro de un array de `isMobilePhone` lanza en lugar de ignorarse.
- No incluye `isTaxID`.
- `isNotEmpty` es nuevo: `true` para un string con al menos un carácter que no es espacio o para un
  número finito; `false` para `''`, solo espacios (espacios, tabuladores, saltos de línea, espacios
  Unicode), `null`, `undefined`, `NaN`, `Infinity`, booleanos y cualquier otro valor.
- `isRequired` es nuevo: `false` solo para `null` y `undefined`.

## Skill para asistentes de IA

El paquete incluye `SKILL.md`, una skill de [Claude Code](https://claude.com/claude-code) para que
un asistente de IA escriba código correcto con `@archi-code/validation` en tu proyecto. La skill
contiene las reglas, los patrones recomendados y los errores comunes; para la API completa remite a
este README dentro de `node_modules`, así que sigue valiendo al actualizar el paquete.

Para instalarla en tu proyecto, cópiala a la carpeta de skills de Claude Code:

```bash
mkdir -p .claude/skills/archi-code-validation && cp node_modules/@archi-code/validation/SKILL.md .claude/skills/archi-code-validation/SKILL.md
```

### Cómo se usa

Invócala con una petición:

```text
/archi-code-validation valida en el DTO de registro que email sea un email y phone un móvil español
```

O pide la tarea sin nombrarla y Claude la carga sola porque encaja con su descripción:

```text
Convierte los query params page y perPage a enteros y usa 1 y 20 si no son válidos
```

También sirve para revisar código que ya usa el paquete:

```text
/archi-code-validation revisa src/ y corrige las llamadas que pasan opciones posicionales en vez de un objeto
```

Con la skill cargada, Claude sigue sus reglas, evita los errores de su lista "Qué no hacer" y, antes de
usar algo que la skill no muestra, lee este README en `node_modules`.

### Mantenerla al día

- La copia no se actualiza sola: después de actualizar `@archi-code/validation`, vuelve a ejecutar el comando
  de arriba.
- Sube `.claude/skills/archi-code-validation/` al repositorio para que todo el equipo la use.

## Licencia

MIT
