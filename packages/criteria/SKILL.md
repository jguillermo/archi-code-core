---
name: archi-code-criteria
description: Builds search criteria with @archi-code/criteria (simple and composite filters, ordering, pagination, grouping), serializes them to text and converts them to MongoDB queries. Use it whenever the code imports @archi-code/criteria, when writing a repository with search/filtering/ordering/pagination, translating request parameters into a SearchCriteriaDto or generating filter/sort/skip/limit for MongoDB.
---

# archi-code-criteria

Search criteria DTOs that validate in the constructor (they throw `Error` when invalid), a JSON
serializer and a MongoDB converter. No runtime dependencies.

## Full API

Before using a class, method, operator, option or type that does not appear in this skill, read
`node_modules/@archi-code/criteria/README.md`: it matches the installed version. Do not guess
signatures or options. If the package is not installed: `npm install @archi-code/criteria`.

If that path does not exist (monorepo with workspaces, pnpm…), locate the package with
`node -p "require.resolve('@archi-code/criteria/package.json')"` and read the `README.md` in that
folder.

## Related skills

If they are installed in the project, use them together with this one:

- `archi-code-domain`: aggregates and value objects returned by the repository.
- `archi-code-ephemeradb`: in-memory repository for tests.

## Import

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

Only named exports from the package root; there is no default export and no subpaths.

## Rules

- The DTOs (`SimpleFilterDto`, `CompositeFilterDto`, `SearchOrderDto`, `SearchPaginatorDto`,
  `SearchGroupByDto`) validate in the constructor and throw `Error`; `SearchCriteriaDto` validates
  nothing.
- `SearchCriteriaDto(filters?, orders?, paginator?, groupBy?)` is positional: to skip a part, pass
  `undefined`.
- With numeric operators (`LT`, `LTE`, `GT`, `GTE`, `BETWEEN`) the value is converted with
  `Number()`: `'18'` is stored as `18`.
- Composite filters can be nested (a `CompositeFilterDto` inside another one).
- The order of the `SearchOrderDto` array is the priority.
- In `MongoCriteriaConverter`, `groupBy` is ignored; with no filters and no ordering it gives
  `filter: {}` and `sort: {}`.

## Recommended patterns

Translating HTTP parameters into a criterion (the DTOs validate; catch the `Error` and return 400):

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

MongoDB repository:

```ts
const { filter, sort, skip, limit } = new MongoCriteriaConverter().convert(criteria);
// collection.find(filter).sort(sort).skip(skip).limit(limit)
```

To tell filters apart while walking them, use `instanceof SimpleFilterDto` /
`instanceof CompositeFilterDto`.

## What not to do

- Do not create a `CompositeFilterDto` with an empty array: it throws. If there are no filters, pass
  `undefined`.
- Do not use `%` in `LIKE`/`ILIKE`: the value is a regular expression (`'^ana'`, `'ana$'`). Escape
  special characters if the text comes from the user.
- Do not use numeric operators (`GT`, `BETWEEN`...) with ISO dates or text: `Number()` gives `NaN`
  and it throws. For dates, store/compare numbers (timestamps).
- `BETWEEN` needs exactly `[min, max]`; with any other shape the constructor does not fail but
  `convert` throws. Both ends are inclusive.
- Do not expect `INARRAY` to work with `MongoCriteriaConverter`: it throws
  `Operator inarray is not supported for Mongo conversion`.
- The `id` field is renamed to `_id` only in the ordering, not in the filters.
- `page` starts at 1, not 0; `page` and `perPage` are integers >= 1 (convert those from a query
  string with `Number(...)`). `limit: 0` without a paginator means "no limit" in MongoDB.
- Directions are lowercase `'asc'`/`'desc'` (not `'ASC'`, `1` or `-1`); logical operators are
  `'and'`/`'or'` (there is no `'not'`).
- `SearchQuerySerializer` has no instance: `SearchQuerySerializer.serialize(...)`, never `new`.
- Do not build plain objects shaped like the DTOs to pass them to the converter: use the classes
  (`convert` tells filters apart with `instanceof`).
- Do not invent exports, operators or converters (there are no fluent builders, `Criteria`,
  `Filter`, SQL/TypeORM/Prisma converters...): check the installed README.
