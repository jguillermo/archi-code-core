---
name: archi-code-validation
description: Escribe código correcto con @archi-code/validation (validadores is* que devuelven boolean, conversores to* que devuelven { ok, value, error } sin lanzar, canBe*, sanitizadores y el decorador @Validations con runValidations). Úsala cuando haya que validar strings (emails, URL, UUID, IBAN, teléfonos, fechas, contraseñas…), convertir valores de entrada con to*/canBe*, sanear texto, declarar validaciones con @Validations o simplemente importar o usar @archi-code/validation.
---

# archi-code-validation

`@archi-code/validation` reúne validadores de strings (port endurecido de validator.js), conversores
de tipo, sanitizadores y el decorador `@Validations` para TypeScript, sin dependencias en tiempo de
ejecución. Esta skill recoge las reglas, los patrones y los errores comunes; la API completa está
en el README del paquete instalado.

## API completa

Antes de usar una función, opción o tipo que no aparezca en esta skill, lee
`node_modules/@archi-code/validation/README.md`: corresponde siempre a la versión instalada. No
supongas firmas, nombres de opciones ni locales. Si el paquete no está instalado:
`npm install @archi-code/validation`.

Si esa ruta no existe (monorepo con workspaces, pnpm…), localiza el paquete con
`node -p "require.resolve('@archi-code/validation/package.json')"` y lee el `README.md` de esa
carpeta.

## Skills relacionadas

Si están instaladas en el proyecto, úsalas junto a esta:

- `archi-code-domain`: value objects de `@archi-code/domain` que declaran sus reglas con `@Validations`.

## Importación

```ts
import { isEmail, toInteger, Validations, runValidations } from '@archi-code/validation';
```

```js
const { isEmail, toInteger } = require('@archi-code/validation');
```

Solo exports con nombre: no hay `export default` ni subrutas (`@archi-code/validation/...`).
Importa cada función por nombre; el objeto `validator` arrastra todos los validadores y solo sirve
para acceso dinámico (`validator[name]`).

## Reglas

1. **Los validadores `is*` (y `contains`, `equals`, `matches`) solo devuelven `boolean`.** Nunca
   lanzan por culpa del valor: `null`, `undefined`, objetos, `Symbol`… devuelven `false`.
2. **Los validadores solo lanzan `ValidationConfigError`, y solo por configuración**: locale, país,
   algoritmo o proveedor desconocido; opciones que no son un objeto; `pattern` que no es RegExp
   válida…
3. **Firma única: `(value, options?)`.** El segundo argumento es siempre un objeto, nunca
   posicional. `null` como opciones equivale a no pasarlas.
4. **Entrada no string:** strings tal cual, números finitos con `String()`, booleanos como
   `'true'`/`'false'`; cualquier otro tipo da `false`.
5. **Los conversores `to*` nunca lanzan** y devuelven `Converted<T>`:
   `{ ok: true, value: T, error: null }` o `{ ok: false, value: null, error: ConvertMessage }`.
   El `error` es un mensaje fijo de `ConvertMessages` y nunca contiene el valor.
6. **`canBeX(v) === toX(v).ok`** siempre (con las opciones por defecto). Validar → `is*`; valor
   tipado → `to*` comprobando `ok`; solo saber si convierte → `canBe*`.
7. **Los sanitizadores (`sanitizer.*`) exigen string**: con otro tipo lanzan `TypeError`.
8. `@Validations` comprueba la declaración al definir la clase (lanza `ValidationConfigError`) y
   `runValidations(Clase, valor)` devuelve `{ ok, value, errors }` sin lanzar.

## Patrones recomendados

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
  { custom: 'noDigits', fn: (v) => !/\d/.test(String(v)), message: 'Sin dígitos' },
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

- `toDate`/`canBeDate`/`isDate` por defecto solo aceptan `YYYY/MM/DD` (o con `-`); para ISO con
  hora, `toDate(v, { iso: true })`.
- Envuelve en `try/catch` de `ValidationConfigError` solo si el locale/país/algoritmo viene de datos
  externos; con valores fijos, un error de configuración es un bug que debe aflorar.

## Qué no hacer

- Mal: `isLength(v, 2, 10)`, `isIP(v, 4)`, `isHash(v, 'md5')`, `isUUID(v, 4)`, `isAfter(v, fecha)`,
  `contains(v, 'x')`, `matches(v, /re/)` → bien: `isLength(v, { min: 2, max: 10 })`,
  `isIP(v, { version: 4 })`, `isHash(v, { algorithm: 'md5' })`, `isUUID(v, { version: 4 })`,
  `isAfter(v, { comparisonDate: fecha })`, `contains(v, { elem: 'x' })`,
  `matches(v, { pattern: /re/ })`.
- Mal: `isAlpha(v, 'es-ES')` / `isMobilePhone(v, 'es-ES')` → bien: `{ locale: 'es-ES' }`.
- Mal: `import validator from '@archi-code/validation'` → bien: `import { validator } from …` o, mejor,
  importar cada función por nombre.
- Mal: `try { toInteger(x) } catch` → los conversores no lanzan; comprueba `.ok`.
- Mal: Leer `.value` sin comprobar `.ok` (vale `null` si falla).
- Mal: Esperar que un validador devuelva otra cosa que `boolean` (no hay `returnScore`; para una
  puntuación usa `scorePassword`).
- Mal: Comparar `error` con textos inventados → usa `ConvertMessages.INTEGER`, etc.
- Mal: Pasar valores no string a `sanitizer.*` (lanza `TypeError`): conviértelos antes con `toString`.
- Mal: `runValidations(new MiClase(), v)` → bien: `runValidations(MiClase, v)` (con una instancia:
  `instance.constructor as typeof MiClase`).
- Mal: En `@Validations`, `options:` o un valor suelto en `properties` (`properties: 'md5'`) → bien:
  `properties: { algorithm: 'md5' }`.
- Mal: Declarar dos veces el mismo `validator` en una lista (lanza al decorar); para cambiarlo en una
  subclase, redeclararlo allí.
- Mal: `isLicensePlate(v, { locale: 'es-ES' })`: no existe ese locale y lanza `ValidationConfigError`;
  usa uno soportado o `'any'`.
- Mal: Inventar validadores de validator.js que no están (p. ej. `isTaxID`) o importar rutas internas.
- Mal: Suponer la firma u opciones de una función que no aparece aquí → léela en el README instalado.
