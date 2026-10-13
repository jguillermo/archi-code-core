---
name: archi-code-criteria
description: Construye criterios de búsqueda con @archi-code/criteria (filtros simples y compuestos, orden, paginación, agrupación), los serializa a texto y los convierte a consultas de MongoDB. Úsala cuando haya que importar @archi-code/criteria, escribir un repositorio con búsqueda/filtrado/orden/paginación, traducir parámetros de una petición a SearchCriteriaDto o generar filter/sort/skip/limit para MongoDB.
---

# archi-code-criteria

DTO de criterios de búsqueda que se validan en el constructor (lanzan `Error` si son inválidos), un
serializador JSON y un conversor a MongoDB. Sin dependencias en tiempo de ejecución.

## API completa

Antes de usar una clase, método, operador, opción o tipo que no aparezca en esta skill, lee
`node_modules/@archi-code/criteria/README.md`: corresponde a la versión instalada. No supongas firmas
ni opciones. Si el paquete no está instalado: `npm install @archi-code/criteria`.

Si esa ruta no existe (monorepo con workspaces, pnpm…), localiza el paquete con
`node -p "require.resolve('@archi-code/criteria/package.json')"` y lee el `README.md` de esa
carpeta.

## Skills relacionadas

Si están instaladas en el proyecto, úsalas junto a esta:

- `archi-code-domain`: agregados y value objects que devuelve el repositorio.
- `archi-code-ephemeradb`: repositorio en memoria para tests.

## Importación

```ts
import {
  CompositeFilterDto,
  FilterOperator,
  MongoCriteriaConverter,
  SearchCriteriaDto,
  SearchOrderDto,
  SearchPaginatorDto,
  SimpleFilterDto,
} from '@archi-code/criteria';
import type { MongoQuery, SearchFilterDto } from '@archi-code/criteria';
```

CJS: `const { SimpleFilterDto, FilterOperator } = require('@archi-code/criteria');`

Solo named exports desde la raíz del paquete; no hay export por defecto ni subrutas.

## Reglas

- Los DTO (`SimpleFilterDto`, `CompositeFilterDto`, `SearchOrderDto`, `SearchPaginatorDto`,
  `SearchGroupByDto`) validan en el constructor y lanzan `Error`; `SearchCriteriaDto` no valida nada.
- `SearchCriteriaDto(filters?, orders?, paginator?, groupBy?)` es posicional: para saltar una parte
  se pasa `undefined`.
- Con operadores numéricos (`LT`, `LTE`, `GT`, `GTE`, `BETWEEN`) el valor se convierte con
  `Number()`: `'18'` se guarda como `18`.
- Los filtros compuestos admiten anidamiento (`CompositeFilterDto` dentro de otro).
- El orden del array de `SearchOrderDto` es la prioridad.
- En `MongoCriteriaConverter`, `groupBy` se ignora; sin filtros ni orden da `filter: {}` y `sort: {}`.

## Patrones recomendados

Traducir parámetros HTTP a un criterio (los DTO validan, captura el `Error` y devuelve 400):

```ts
function toCriteria(q: { status?: string; minAge?: string; page?: string; perPage?: string }) {
  const filters: SearchFilterDto[] = [];
  if (q.status) filters.push(new SimpleFilterDto('status', FilterOperator.EQ, q.status));
  if (q.minAge) filters.push(new SimpleFilterDto('age', FilterOperator.GTE, q.minAge));
  return new SearchCriteriaDto(
    filters.length === 0
      ? undefined
      : filters.length === 1
        ? filters[0]
        : new CompositeFilterDto('and', filters),
    new SearchOrderDto([{ field: 'createdAt', direction: 'desc' }]),
    new SearchPaginatorDto(Number(q.page ?? 1), Number(q.perPage ?? 20)),
  );
}
```

Repositorio MongoDB:

```ts
const { filter, sort, skip, limit } = new MongoCriteriaConverter().convert(criteria);
// collection.find(filter).sort(sort).skip(skip).limit(limit)
```

Para distinguir filtros al recorrerlos usa `instanceof SimpleFilterDto` / `instanceof CompositeFilterDto`.

## Qué no hacer

- No crees un `CompositeFilterDto` con un array vacío: lanza. Si no hay filtros pasa `undefined`.
- No uses `%` en `LIKE`/`ILIKE`: el valor es una expresión regular (`'^ana'`, `'ana$'`). Escapa los
  caracteres especiales si el texto viene del usuario.
- No uses operadores numéricos (`GT`, `BETWEEN`...) con fechas ISO o texto: `Number()` da `NaN` y
  lanza. Para fechas guarda/compara números (timestamps).
- `BETWEEN` necesita exactamente `[min, max]`; con otra forma el constructor no falla pero
  `convert` lanza. Ambos extremos incluidos.
- No esperes que `INARRAY` funcione con `MongoCriteriaConverter`: lanza
  `Operator inarray is not supported for Mongo conversion`.
- El campo `id` se renombra a `_id` solo en el orden, no en los filtros.
- `page` empieza en 1, no en 0; `page` y `perPage` son enteros >= 1 (convierte los de una query
  string con `Number(...)`). `limit: 0` sin paginador significa "sin límite" en MongoDB.
- Las direcciones son `'asc'`/`'desc'` en minúsculas (no `'ASC'`, `1` ni `-1`); los operadores
  lógicos `'and'`/`'or'` (no hay `'not'`).
- `SearchQuerySerializer` no tiene instancia: `SearchQuerySerializer.serialize(...)`, nunca `new`.
- No construyas objetos planos con la forma de los DTO para pasarlos al conversor: usa las clases
  (`convert` distingue filtros con `instanceof`).
- No inventes exports, operadores ni conversores (no hay builders fluidos, `Criteria`, `Filter`,
  conversores SQL/TypeORM/Prisma...): compruébalo en el README instalado.
