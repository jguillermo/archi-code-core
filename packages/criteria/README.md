# @archi-code/criteria

Criterios de búsqueda para repositorios: filtros (simples y compuestos), orden, paginación y
agrupación como DTO sencillos que se validan al construirse, un serializador para enviarlos como texto
y un conversor a consultas de MongoDB. Sin dependencias en tiempo de ejecución; el paquete incluye
builds CJS y ESM.

## Instalación

```bash
npm install @archi-code/criteria
```

Requiere Node.js 24 o superior.

## Importación

ESM / TypeScript:

```ts
import {
  FilterOperator,
  MongoCriteriaConverter,
  SearchCriteriaDto,
  SimpleFilterDto,
} from '@archi-code/criteria';
```

CommonJS:

```js
const { FilterOperator, SimpleFilterDto } = require('@archi-code/criteria');

new SimpleFilterDto('age', FilterOperator.GT, 18).value; // 18
```

Los tipos (`LogicalOperator`, `SearchFilterDto`, `SearchOrderItemDto`, `MongoQuery`, `MongoFilter`,
`MongoSort`, `MongoFilterOperator`) se importan con `import type`.

## Ejemplo rápido

```ts
import {
  FilterOperator,
  MongoCriteriaConverter,
  SearchCriteriaDto,
  SearchOrderDto,
  SearchPaginatorDto,
  SimpleFilterDto,
} from '@archi-code/criteria';

const criteria = new SearchCriteriaDto(
  new SimpleFilterDto('age', FilterOperator.GTE, 18),
  new SearchOrderDto([{ field: 'name', direction: 'asc' }]),
  new SearchPaginatorDto(2, 10),
);

new MongoCriteriaConverter().convert(criteria);
// { filter: { age: { $gte: 18 } }, sort: { name: 1 }, skip: 10, limit: 10 }
```

## `SearchCriteriaDto`

Agrupa las cuatro partes de una búsqueda. Todas son opcionales y se pasan por posición:

```ts
new SearchCriteriaDto(filters?, orders?, paginator?, groupBy?);
```

| Propiedad   | Tipo                 |
| ----------- | -------------------- |
| `filters`   | `SearchFilterDto`    |
| `orders`    | `SearchOrderDto`     |
| `paginator` | `SearchPaginatorDto` |
| `groupBy`   | `SearchGroupByDto`   |

Para omitir una parte intermedia pasa `undefined`:
`new SearchCriteriaDto(undefined, orders, paginator)`.

## Filtros

`SearchFilterDto` es el tipo `SimpleFilterDto | CompositeFilterDto`.

### `SimpleFilterDto`

Una condición sobre un campo: `new SimpleFilterDto(field, operator, value)`. `value` es
`string | number | (string | number)[]`.

```ts
const byStatus = new SimpleFilterDto('status', FilterOperator.EQ, 'active');
byStatus.field; // 'status'
byStatus.operator; // 'eq'
byStatus.value; // 'active'
```

Con los operadores numéricos (`lt`, `lte`, `gt`, `gte`, `between`) el valor, o cada elemento si es un
array, se convierte con `Number()`; así puedes pasar directamente lo que llega de una query string. Si
el resultado es `NaN`, lanza:

```ts
new SimpleFilterDto('age', FilterOperator.GT, '18').value; // 18

new SimpleFilterDto('age', FilterOperator.GT, 'dieciocho');
// Error: SimpleFilterDto: Value "dieciocho" must be a number
```

También lanza `Error` si `field` está vacío (`SimpleFilterDto: "field" must be a non-empty string`),
si el operador no es de `FilterOperator` (`SimpleFilterDto: Invalid operator "<op>"`) o si `value` es
`undefined` (`SimpleFilterDto: "value" is required`).

### Operadores (`FilterOperator`)

`FilterOperator` es un `enum` de cadenas:

| Miembro   | Valor       | Significado                                   | MongoDB                                   |
| --------- | ----------- | --------------------------------------------- | ----------------------------------------- |
| `EQ`      | `'eq'`      | igual                                         | `{ campo: valor }`                        |
| `NE`      | `'ne'`      | distinto                                      | `{ campo: { $ne: valor } }`               |
| `LT`      | `'lt'`      | menor que (numérico)                          | `{ campo: { $lt: n } }`                   |
| `LTE`     | `'lte'`     | menor o igual (numérico)                      | `{ campo: { $lte: n } }`                  |
| `GT`      | `'gt'`      | mayor que (numérico)                          | `{ campo: { $gt: n } }`                   |
| `GTE`     | `'gte'`     | mayor o igual (numérico)                      | `{ campo: { $gte: n } }`                  |
| `IN`      | `'in'`      | está en la lista                              | `{ campo: { $in: [...] } }`               |
| `NIN`     | `'nin'`     | no está en la lista                           | `{ campo: { $nin: [...] } }`              |
| `BETWEEN` | `'between'` | entre dos valores, ambos incluidos (numérico) | `{ campo: { $gte: a, $lte: b } }`         |
| `LIKE`    | `'like'`    | expresión regular                             | `{ campo: { $regex: v } }`                |
| `ILIKE`   | `'ilike'`   | expresión regular sin distinguir mayúsculas   | `{ campo: { $regex: v, $options: 'i' } }` |
| `INARRAY` | `'inarray'` | existe en el modelo, pero no en el conversor  | lanza `Error`                             |

Con `IN` y `NIN` un valor que no es array se envuelve en uno (`'a'` → `['a']`). `LIKE` e `ILIKE` pasan
el valor tal cual a `$regex`: es una expresión regular, no un patrón SQL con `%`.

### `CompositeFilterDto`

Une filtros con un operador lógico (`LogicalOperator` = `'and' | 'or'`) y se puede anidar:

```ts
import type { SearchFilterDto } from '@archi-code/criteria';

const filter: SearchFilterDto = new CompositeFilterDto('and', [
  new SimpleFilterDto('status', FilterOperator.EQ, 'active'),
  new CompositeFilterDto('or', [
    new SimpleFilterDto('role', FilterOperator.IN, ['admin', 'editor']),
    new SimpleFilterDto('age', FilterOperator.BETWEEN, [18, 65]),
  ]),
]);

new MongoCriteriaConverter().convert(new SearchCriteriaDto(filter)).filter;
// {
//   $and: [
//     { status: 'active' },
//     { $or: [{ role: { $in: ['admin', 'editor'] } }, { age: { $gte: 18, $lte: 65 } }] },
//   ],
// }
```

Lanza `Error` si el operador lógico no es `'and'` ni `'or'` o si `filters` está vacío
(`CompositeFilterDto: "filters" must be a non-empty array`).

## Orden: `SearchOrderDto`

Recibe un array de `SearchOrderItemDto` (`{ field: string; direction: 'asc' | 'desc' }`); el orden
del array es la prioridad:

```ts
const orders = new SearchOrderDto([
  { field: 'createdAt', direction: 'desc' },
  { field: 'name', direction: 'asc' },
]);

orders.orders[0]; // { field: 'createdAt', direction: 'desc' }
```

Lanza `Error` si no recibe un array, si un `field` está vacío o si `direction` no es `'asc'` ni
`'desc'`.

## Paginación: `SearchPaginatorDto`

`new SearchPaginatorDto(page, perPage)`: `page` empieza en 1 y ambos deben ser enteros positivos.

```ts
const page = new SearchPaginatorDto(3, 25);
page.page; // 3
page.perPage; // 25

new SearchPaginatorDto(0, 10);
// Error: SearchPaginatorDto: "page" and "perPage" must be positive integers
new SearchPaginatorDto(1.5, 10);
// Error: SearchPaginatorDto: "page" and "perPage" must be integers
```

## Agrupación: `SearchGroupByDto`

Acepta un campo o una lista de campos y los expone siempre como array en `fields`:

```ts
new SearchGroupByDto('country').fields; // ['country']
new SearchGroupByDto(['country', 'city']).fields; // ['country', 'city']
```

Lanza `Error` con `null`/`undefined`, con algo que no sea cadena o array, o si algún elemento del
array no es cadena. El conversor de MongoDB no usa `groupBy`; queda disponible para tu propio
repositorio y el serializador lo conserva.

## Conversión a MongoDB: `MongoCriteriaConverter`

`convert(criteria)` devuelve un `MongoQuery`:

```ts
interface MongoQuery {
  filter: MongoFilter;
  sort: MongoSort; // Record<string, 1 | -1>
  skip: number;
  limit: number;
}
```

```ts
import type { MongoQuery } from '@archi-code/criteria';

const converter = new MongoCriteriaConverter();

const query: MongoQuery = converter.convert(
  new SearchCriteriaDto(
    new SimpleFilterDto('name', FilterOperator.ILIKE, '^ana'),
    new SearchOrderDto([{ field: 'id', direction: 'desc' }]),
    new SearchPaginatorDto(3, 20),
  ),
);
// {
//   filter: { name: { $regex: '^ana', $options: 'i' } },
//   sort: { _id: -1 },
//   skip: 40,
//   limit: 20,
// }

converter.convert(new SearchCriteriaDto());
// { filter: {}, sort: {}, skip: 0, limit: 0 }
```

- `skip = (page - 1) * perPage` y `limit = perPage`. Sin paginador, `skip` y `limit` son `0` (en
  MongoDB `limit(0)` significa sin límite).
- En el orden, el campo `id` se traduce a `_id`. En los filtros no: filtra por `_id` si es lo que
  guardas.
- `INARRAY` lanza `Error: Operator inarray is not supported for Mongo conversion`, y `BETWEEN` sin un
  array de exactamente dos valores lanza
  `Error: BETWEEN operator requires an array of two values for field <campo>`.

El paquete no depende del driver de MongoDB: `filter`, `sort`, `skip` y `limit` son objetos y
números planos que pasas tú a la consulta (`find`, `sort`, `skip`, `limit`).

## Serialización: `SearchQuerySerializer`

Métodos estáticos para enviar un criterio como texto (por ejemplo, en una URL o en un mensaje) y
reconstruirlo con sus clases y validaciones:

```ts
const text = SearchQuerySerializer.serialize(
  new SearchCriteriaDto(
    new SimpleFilterDto('age', FilterOperator.GTE, 18),
    new SearchOrderDto([{ field: 'name', direction: 'asc' }]),
    new SearchPaginatorDto(1, 10),
    new SearchGroupByDto('country'),
  ),
);
// '{"filters":{"type":"simple","field":"age","operator":"gte","value":18},"orders":[{"field":"name","direction":"asc"}],"paginator":{"page":1,"perPage":10},"groupBy":["country"]}'

const restored = SearchQuerySerializer.deserialize(text);
restored.filters instanceof SimpleFilterDto; // true
restored.paginator?.perPage; // 10
restored.groupBy?.fields; // ['country']
```

Los filtros compuestos se serializan como `{ "type": "composite", "logicalOperator", "filters" }`. Las
partes ausentes se escriben como `null`. `deserialize` lanza `Error: Invalid JSON string` si el texto
no es JSON y `Error: Unknown filter format` si un filtro no tiene `type` `'simple'` o `'composite'`;
cualquier otro dato inválido lanza el error del DTO correspondiente.

## Resumen de exports

| Export                   | Clase / tipo | Uso                                                                                      |
| ------------------------ | ------------ | ---------------------------------------------------------------------------------------- |
| `SearchCriteriaDto`      | clase        | Filtros, orden, paginación y agrupación de una búsqueda                                  |
| `SimpleFilterDto`        | clase        | Una condición `campo operador valor`                                                     |
| `CompositeFilterDto`     | clase        | Filtros unidos con `'and'` / `'or'`, anidables                                           |
| `FilterOperator`         | enum         | `eq`, `ne`, `lt`, `lte`, `gt`, `gte`, `in`, `nin`, `between`, `like`, `ilike`, `inarray` |
| `SearchOrderDto`         | clase        | Lista ordenada de `SearchOrderItemDto`                                                   |
| `SearchPaginatorDto`     | clase        | `page` (desde 1) y `perPage`                                                             |
| `SearchGroupByDto`       | clase        | Campos de agrupación (`fields`)                                                          |
| `SearchQuerySerializer`  | clase        | `serialize(criteria)` / `deserialize(text)` (estáticos)                                  |
| `MongoCriteriaConverter` | clase        | `convert(criteria)` → `MongoQuery`                                                       |
| `LogicalOperator`        | tipo         | `'and' \| 'or'`                                                                          |
| `SearchFilterDto`        | tipo         | `SimpleFilterDto \| CompositeFilterDto`                                                  |
| `SearchOrderItemDto`     | interfaz     | `{ field: string; direction: 'asc' \| 'desc' }`                                          |
| `MongoQuery`             | interfaz     | `{ filter, sort, skip, limit }`                                                          |
| `MongoFilter`            | tipo         | Filtro de MongoDB generado                                                               |
| `MongoSort`              | tipo         | `Record<string, 1 \| -1>`                                                                |
| `MongoFilterOperator`    | tipo         | `'$eq' \| '$ne' \| '$gt' \| '$gte' \| '$lt' \| '$lte' \| '$regex' \| '$in' \| '$nin'`    |

## Skill para asistentes de IA

El paquete incluye `SKILL.md`, una skill de Claude Code con las reglas, los patrones recomendados y
los errores habituales. Para la API completa remite a este README dentro de `node_modules`, así que
sigue valiendo al actualizar el paquete. Para instalarla en tu proyecto:

```bash
mkdir -p .claude/skills/archi-code-criteria && cp node_modules/@archi-code/criteria/SKILL.md .claude/skills/archi-code-criteria/SKILL.md
```

### Cómo se usa

Invócala con una petición:

```text
/archi-code-criteria crea el endpoint GET /users con filtro por status y edad mínima, orden y paginación
```

O pide la tarea sin nombrarla y Claude la carga sola porque encaja con su descripción:

```text
Implementa el repositorio MongoDB de pedidos con búsqueda por SearchCriteriaDto
```

También sirve para revisar código que ya usa el paquete:

```text
/archi-code-criteria revisa los repositorios y avisa de filtros que no se pueden convertir a MongoDB
```

Con la skill cargada, Claude sigue sus reglas, evita los errores de su lista "Qué no hacer" y, antes de
usar algo que la skill no muestra, lee este README en `node_modules`.

### Mantenerla al día

- La copia no se actualiza sola: después de actualizar `@archi-code/criteria`, vuelve a ejecutar el comando
  de arriba.
- Sube `.claude/skills/archi-code-criteria/` al repositorio para que todo el equipo la use.

## Licencia

MIT
