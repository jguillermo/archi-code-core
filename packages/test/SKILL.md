---
name: archi-code-test
description: Utilidades de test de @archi-code/test - JsonCompare (diferencias legibles entre JSON esperado y real, con marcadores como UUID()), DtoObjectMother (fixtures de DTO por niveles) y aserciones de tipos en compilación (Expect, Equal, IsAny...). Úsala cuando haya que importar @archi-code/test, comparar respuestas JSON de una API o de un repositorio en un test, crear object mothers o fixtures de DTO, o escribir tests de tipos con Expect<Equal<...>>.
---

# archi-code-test

Helpers de test sin dependencia de ningún runner (Jest, Vitest, `node:test`): comparación de JSON,
object mothers de DTO y aserciones de tipos. Se instala como dependencia de desarrollo.

## API completa

Antes de usar una clase, método, marcador, opción o tipo que no aparezca en esta skill, lee
`node_modules/@archi-code/test/README.md`: corresponde a la versión instalada. No supongas firmas ni
opciones. Si el paquete no está instalado: `npm install --save-dev @archi-code/test`.

Si esa ruta no existe (monorepo con workspaces, pnpm…), localiza el paquete con
`node -p "require.resolve('@archi-code/test/package.json')"` y lee el `README.md` de esa
carpeta.

## Skills relacionadas

Si están instaladas en el proyecto, úsalas junto a esta:

- `archi-code-domain`: DTO y agregados que se prueban.
- `archi-code-ephemeradb`: repositorios en memoria para los tests.

## Importación

```ts
import { DtoObjectMother, JsonCompare } from '@archi-code/test';
import type { Equal, Expect, ExpectFalse, ExpectValidArgs, NotAny } from '@archi-code/test';
```

CJS: `const { JsonCompare, DtoObjectMother } = require('@archi-code/test');`

Valores en tiempo de ejecución: solo `JsonCompare` y `DtoObjectMother`; el resto son tipos (usa
`import type`). No hay export por defecto ni subrutas.

## Reglas

- `JsonCompare` devuelve `string[]` con las diferencias (`[]` = coinciden); nunca lanza por
  diferencias. Orden de argumentos: primero lo esperado (con marcadores), después el valor real.
- `DtoObjectMother.create(level, override, exclude)` es estático y se llama sobre la subclase, nunca
  con `new`. Incluye las propiedades de todos los niveles `<= level`; `exclude` gana sobre nivel y
  override; siempre asigna `levelValidation = level` al objeto.
- Las aserciones de tipos se comprueban con `tsc` (o un runner con type-check, como ts-jest); en
  ejecución no hacen nada.

## Patrones recomendados

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

Nivel 1 = campos obligatorios, niveles superiores = opcionales; los tests de validación usan `exclude`
para quitar un obligatorio y `override` para meter un valor inválido.

```ts
type cases = [
  Expect<Equal<ReturnType<typeof fn>, string>>,
  Expect<NotAny<typeof value>>,
  ExpectFalse<ExpectValidArgs<typeof fn, [number]>>,
];
// @ts-expect-error: comprueba que un caso falla
type fails = Expect<Equal<string, number>>;
```

Agrupar los casos en una tupla `type cases = [...]` evita variables sin usar. Si el linter marca tipos
sin usar, expórtalos (`export type { cases }`).

## Qué no hacer

- No inviertas los argumentos de `JsonCompare`: los marcadores en el segundo argumento no se
  interpretan (`'UUID()'` se compara como texto).
- `UUID()` e `IS_TIME()` con un real que no es cadena lanzan `TypeError` (con un número
  `value.search is not a function`; con `null`, `Cannot read properties of null`).
- `IS_TIME()` no acepta fechas sin milisegundos, sin `Z` ni objetos `Date`.
- `IS_NOT_EMPTY()` acepta cualquier valor distinto de `''`, incluidos `null` y `0`.
- Compara JSON plano: `Date`, `Map`, instancias de clase se recorren por claves propias (dos `Date`
  distintas dan `[]`). Normaliza con `JSON.parse(JSON.stringify(x))`.
- `1` y `'1'` son distintos (`'a: 1 -> 1'` en el mensaje).
- `include` no ignora claves de más en `expected`: deben existir en `actual`.
- Afirma con `expect(diff).toEqual([])` (no `toBeTruthy`: `[]` es truthy).
- Un override `null`/`undefined` en `DtoObjectMother.create` cae al valor por defecto: para quitar
  una propiedad usa `exclude`.
- `ExpectExtends<VALUE, EXPECTED>` es `true` si `EXPECTED extends VALUE` (ojo al orden).
- No supongas `JsonCompare.equals`, `assert`, `toMatch`, otros marcadores, `ObjectMother`, `build`,
  `createMany` ni `random`: compruébalo en el README instalado.
- Las aserciones de tipos se importan con `import type`: con `verbatimModuleSyntax`,
  `import { Expect }` da el error TS1484.
