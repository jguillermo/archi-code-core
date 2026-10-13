# @archi-code/test

Utilidades para tests: compara valores JSON y obtiene una lista legible de diferencias (con marcadores
para UUID, fechas y valores no vacíos), construye DTO de prueba con un _object mother_ por niveles y
comprueba tipos en tiempo de compilación. El paquete incluye builds CJS y ESM y depende de
`@archi-code/validation`.

## Instalación

```bash
npm install --save-dev @archi-code/test
```

Requiere Node.js 24 o superior. Funciona con cualquier runner (Jest, Vitest, `node:test`…): no
depende de ninguno.

## Importación

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

Las aserciones de tipos son solo tipos: impórtalas con `import type` (no existen en tiempo de
ejecución).

## `JsonCompare`

Compara dos valores tipo JSON (objetos, arrays, cadenas, números, booleanos y `null`) y devuelve un
`string[]` con las diferencias; un array vacío significa que coinciden. No lanza por diferencias: tú
decides cómo afirmar (`expect(diff).toEqual([])`, `assert.deepEqual(diff, [])`…), y el mensaje del
fallo ya enseña qué no coincide.

El primer argumento es lo **esperado** (puede llevar marcadores) y el segundo el valor **real**. Cada
diferencia de valor se escribe como `ruta: esperado -> real`.

### `JsonCompare.strict(expected, actual)`

Exige las mismas claves y la misma longitud en los arrays:

```ts
JsonCompare.strict({ a: 1, b: 'x' }, { a: 1, b: 'y' }); // ['b: x -> y']
JsonCompare.strict({ a: 1 }, { a: 1 }); // []
JsonCompare.strict({ a: 1 }, { a: 1, b: 2 }); // ['b: key not found']
JsonCompare.strict({ a: 1, c: 3 }, { a: 1 }); // ['c: extra key found']
JsonCompare.strict({ user: { tags: ['a'] } }, { user: { tags: ['a', 'b'] } });
// ['user.tags: length of ["a"] is not equal to length of ["a","b"]']
```

- `key not found`: la clave está en el valor real y falta en lo esperado.
- `extra key found`: la clave está en lo esperado y falta en el valor real.
- Los primitivos se comparan con `===`: `JsonCompare.strict({ a: 1 }, { a: '1' })` devuelve
  `['a: 1 -> 1']` (número frente a cadena).

### `JsonCompare.include(expected, actual)`

Comprueba que lo esperado está contenido en el valor real: las claves que el real tiene de más se
ignoran, y en los arrays solo se comparan las posiciones que tiene lo esperado.

```ts
JsonCompare.include({ a: 1 }, { a: 1, b: 2 }); // []
JsonCompare.include({ a: 1, c: 3 }, { a: 1 }); // ['c: extra key found']
JsonCompare.include([{ id: 1 }], [{ id: 1, name: 'x' }, { id: 2 }]); // []
```

### Marcadores

En lo esperado, estas cadenas exactas validan un formato en lugar de un valor concreto:

| Marcador           | Acepta en el valor real                                                                                    |
| ------------------ | ---------------------------------------------------------------------------------------------------------- |
| `'UUID()'`         | una cadena UUID en minúsculas (versión 0–5; el primer carácter del cuarto grupo, `0`, `8`, `9`, `a` o `b`) |
| `'IS_TIME()'`      | una cadena ISO 8601 UTC con milisegundos, como `new Date().toISOString()` (`2024-01-31T10:20:30.123Z`)     |
| `'IS_NOT_EMPTY()'` | cualquier valor distinto de la cadena vacía `''`                                                           |

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

Los marcadores solo funcionan en el primer argumento. `UUID()` e `IS_TIME()` esperan una cadena en el
valor real: con otro tipo lanzan `TypeError` (con un número, `value.search is not a function`).

### Constructor

`new JsonCompare(expected, actual, strict = false)` hace lo mismo y expone el resultado en
`differences`:

```ts
new JsonCompare({ a: 1 }, { a: 1, b: 2 }).differences; // []
new JsonCompare({ a: 1 }, { a: 1, b: 2 }, true).differences; // ['b: key not found']
```

### Uso en un test

```ts
expect(JsonCompare.include({ id: 'UUID()', name: 'Ana' }, await response.json())).toEqual([]);
```

Compara datos ya serializados a JSON. Los objetos que no son planos (por ejemplo `Date`) se recorren
por sus claves propias y dos `Date` distintas no producen diferencias: pásalos por
`JSON.parse(JSON.stringify(valor))` o compara sus cadenas ISO.

## `DtoObjectMother<T>`

Clase abstracta para crear DTO de prueba por niveles: el nivel 1 rellena las propiedades mínimas y
cada nivel superior añade más. Se extiende implementando tres métodos:

| Método                   | Devuelve                      | Uso                                 |
| ------------------------ | ----------------------------- | ----------------------------------- |
| `getNewDto()`            | `T`                           | Instancia vacía del DTO             |
| `getDefaultValues()`     | `Partial<T>`                  | Valor por defecto de cada propiedad |
| `getPropertiesByLevel()` | `Record<number, (keyof T)[]>` | Propiedades que añade cada nivel    |

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

Método estático que se llama sobre la subclase y devuelve una instancia de `T` (la de `getNewDto()`).
Incluye las propiedades de todos los niveles `<= level` con sus valores por defecto. En los resultados
se muestran las propiedades con valor:

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

- `override`: sustituye valores y añade propiedades aunque sean de un nivel superior. Un override
  `null` o `undefined` se ignora y se usa el valor por defecto.
- `exclude`: propiedades que no se asignan, aunque estén en el nivel o en `override`.
- Siempre asigna `levelValidation = level` al resultado. Si quieres leerla con tipos, declárala en tu
  DTO (`levelValidation?: number`).

## Aserciones de tipos

Tipos para comprobar en tiempo de compilación lo que infiere TypeScript. Una aserción que no se cumple
es un error de `tsc` (`Type 'false' does not satisfy the constraint 'true'`), así que se comprueban con
`tsc --noEmit` o con un runner que haga type-check (por ejemplo, ts-jest).

| Tipo                                        | Resultado                                                                              |
| ------------------------------------------- | -------------------------------------------------------------------------------------- |
| `Expect<T>` / `ExpectTrue<T>` / `IsTrue<T>` | exige que `T` sea `true`                                                               |
| `ExpectFalse<T>` / `IsFalse<T>`             | exige que `T` sea `false`                                                              |
| `Equal<X, Y>`                               | `true` si `X` e `Y` son idénticos (distingue `any`, y `A & B` de su objeto)            |
| `NotEqual<X, Y>`                            | negación de `Equal`                                                                    |
| `IsAny<T>` / `NotAny<T>`                    | `true` si `T` es (o no es) `any`                                                       |
| `Alike<X, Y>`                               | como `Equal`, pero aplanando intersecciones (`{ a: 1 } & { b: 2 }` ≈ `{ a: 1; b: 2 }`) |
| `ExpectExtends<VALUE, EXPECTED>`            | `true` si `EXPECTED` es asignable a `VALUE`                                            |
| `ExpectValidArgs<FUNC, ARGS>`               | `true` si la tupla `ARGS` es válida como argumentos de `FUNC`                          |
| `Debug<T>`                                  | aplana un nivel de `T` (útil para ver el tipo resultante)                              |
| `MergeInsertions<T>`                        | aplana `T` recursivamente                                                              |
| `UnionToIntersection<U>`                    | convierte `A \| B` en `A & B`                                                          |

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
  Expect<ExpectValidArgs<typeof greet, ['hola', 2]>>,
  ExpectFalse<ExpectValidArgs<typeof greet, [2, 'hola']>>,
  Expect<Alike<{ a: 1 } & { b: 2 }, { a: 1; b: 2 }>>,
  ExpectFalse<Equal<{ a: 1 } & { b: 2 }, { a: 1; b: 2 }>>,
  Expect<Equal<Debug<{ a: 1 } & { b: 2 }>, { a: 1; b: 2 }>>,
  Expect<Equal<MergeInsertions<{ x: { a: 1 } & { b: 2 } }>, { x: { a: 1; b: 2 } }>>,
  Expect<Equal<UnionToIntersection<{ a: 1 } | { b: 2 }>, { a: 1 } & { b: 2 }>>,
];

// @ts-expect-error: string y number no son iguales
type fails = Expect<Equal<string, number>>;
```

## Resumen de exports

| Export                | Tipo            | Uso                                                                                                                 |
| --------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------- |
| `JsonCompare`         | clase           | `strict(expected, actual)` / `include(expected, actual)` → `string[]`; `new JsonCompare(e, a, strict?).differences` |
| `DtoObjectMother<T>`  | clase abstracta | `create(level, override?, exclude?)` sobre subclases con `getNewDto`, `getDefaultValues`, `getPropertiesByLevel`    |
| `Expect`              | tipo            | exige `true`                                                                                                        |
| `ExpectTrue`          | tipo            | exige `true`                                                                                                        |
| `ExpectFalse`         | tipo            | exige `false`                                                                                                       |
| `IsTrue`              | tipo            | exige `true`                                                                                                        |
| `IsFalse`             | tipo            | exige `false`                                                                                                       |
| `Equal`               | tipo            | igualdad exacta de tipos                                                                                            |
| `NotEqual`            | tipo            | desigualdad de tipos                                                                                                |
| `IsAny`               | tipo            | `T` es `any`                                                                                                        |
| `NotAny`              | tipo            | `T` no es `any`                                                                                                     |
| `Alike`               | tipo            | igualdad aplanando intersecciones                                                                                   |
| `ExpectExtends`       | tipo            | asignabilidad                                                                                                       |
| `ExpectValidArgs`     | tipo            | argumentos válidos para una función                                                                                 |
| `Debug`               | tipo            | aplana un nivel                                                                                                     |
| `MergeInsertions`     | tipo            | aplana recursivamente                                                                                               |
| `UnionToIntersection` | tipo            | unión → intersección                                                                                                |

## Skill para asistentes de IA

El paquete incluye `SKILL.md`, una skill de Claude Code con las reglas, los patrones recomendados y
los errores habituales. Para la API completa remite a este README dentro de `node_modules`, así que
sigue valiendo al actualizar el paquete. Para instalarla en tu proyecto:

```bash
mkdir -p .claude/skills/archi-code-test && cp node_modules/@archi-code/test/SKILL.md .claude/skills/archi-code-test/SKILL.md
```

### Cómo se usa

Invócala con una petición:

```text
/archi-code-test crea un UserDtoMother con nivel 1 para los obligatorios y nivel 2 para los opcionales
```

O pide la tarea sin nombrarla y Claude la carga sola porque encaja con su descripción:

```text
Escribe un test que compare la respuesta de POST /users con JsonCompare aceptando cualquier id y createdAt
```

También sirve para revisar código que ya usa el paquete:

```text
/archi-code-test revisa los tests de tipos y pásalos a Expect<Equal<...>>
```

Con la skill cargada, Claude sigue sus reglas, evita los errores de su lista "Qué no hacer" y, antes de
usar algo que la skill no muestra, lee este README en `node_modules`.

### Mantenerla al día

- La copia no se actualiza sola: después de actualizar `@archi-code/test`, vuelve a ejecutar el comando
  de arriba.
- Sube `.claude/skills/archi-code-test/` al repositorio para que todo el equipo la use.

## Licencia

MIT
