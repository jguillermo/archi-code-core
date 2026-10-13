# @archi-code/criteria

Search criteria for repositories: filters (simple and composite), ordering, pagination and grouping
as plain DTOs that validate themselves when constructed, a serializer to send them as text and a
converter to MongoDB queries. No runtime dependencies; the package ships CJS and ESM builds.

## Installation

```bash
npm install @archi-code/criteria
```

Requires Node.js 24 or later.

## Import

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

The types (`LogicalOperator`, `SearchFilterDto`, `SearchOrderItemDto`, `MongoQuery`, `MongoFilter`,
`MongoSort`, `MongoFilterOperator`) are imported with `import type`.

## Quick example

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

Groups the four parts of a search. All of them are optional and are passed by position:

```ts
new SearchCriteriaDto(filters?, orders?, paginator?, groupBy?);
```

| Property    | Type                 |
| ----------- | -------------------- |
| `filters`   | `SearchFilterDto`    |
| `orders`    | `SearchOrderDto`     |
| `paginator` | `SearchPaginatorDto` |
| `groupBy`   | `SearchGroupByDto`   |

To skip a part in the middle, pass `undefined`:
`new SearchCriteriaDto(undefined, orders, paginator)`.

## Filters

`SearchFilterDto` is the type `SimpleFilterDto | CompositeFilterDto`.

### `SimpleFilterDto`

A condition on one field: `new SimpleFilterDto(field, operator, value)`. `value` is
`string | number | (string | number)[]`.

```ts
const byStatus = new SimpleFilterDto('status', FilterOperator.EQ, 'active');
byStatus.field; // 'status'
byStatus.operator; // 'eq'
byStatus.value; // 'active'
```

With the numeric operators (`lt`, `lte`, `gt`, `gte`, `between`) the value, or each element if it is
an array, is converted with `Number()`, so you can pass whatever comes from a query string directly.
If the result is `NaN`, it throws:

```ts
new SimpleFilterDto('age', FilterOperator.GT, '18').value; // 18

new SimpleFilterDto('age', FilterOperator.GT, 'eighteen');
// Error: SimpleFilterDto: Value "eighteen" must be a number
```

It also throws `Error` if `field` is empty (`SimpleFilterDto: "field" must be a non-empty string`),
if the operator is not a `FilterOperator` (`SimpleFilterDto: Invalid operator "<op>"`) or if `value`
is `undefined` (`SimpleFilterDto: "value" is required`).

### Operators (`FilterOperator`)

`FilterOperator` is a string `enum`:

| Member    | Value       | Meaning                                       | MongoDB                                   |
| --------- | ----------- | --------------------------------------------- | ----------------------------------------- |
| `EQ`      | `'eq'`      | equal                                         | `{ field: value }`                        |
| `NE`      | `'ne'`      | not equal                                     | `{ field: { $ne: value } }`               |
| `LT`      | `'lt'`      | less than (numeric)                           | `{ field: { $lt: n } }`                   |
| `LTE`     | `'lte'`     | less than or equal (numeric)                  | `{ field: { $lte: n } }`                  |
| `GT`      | `'gt'`      | greater than (numeric)                        | `{ field: { $gt: n } }`                   |
| `GTE`     | `'gte'`     | greater than or equal (numeric)               | `{ field: { $gte: n } }`                  |
| `IN`      | `'in'`      | is in the list                                | `{ field: { $in: [...] } }`               |
| `NIN`     | `'nin'`     | is not in the list                            | `{ field: { $nin: [...] } }`              |
| `BETWEEN` | `'between'` | between two values, both inclusive (numeric)  | `{ field: { $gte: a, $lte: b } }`         |
| `LIKE`    | `'like'`    | regular expression                            | `{ field: { $regex: v } }`                |
| `ILIKE`   | `'ilike'`   | case-insensitive regular expression           | `{ field: { $regex: v, $options: 'i' } }` |
| `INARRAY` | `'inarray'` | exists in the model, but not in the converter | throws `Error`                            |

With `IN` and `NIN` a value that is not an array is wrapped in one (`'a'` → `['a']`). `LIKE` and
`ILIKE` pass the value as is to `$regex`: it is a regular expression, not an SQL pattern with `%`.

### `CompositeFilterDto`

Joins filters with a logical operator (`LogicalOperator` = `'and' | 'or'`) and can be nested:

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

It throws `Error` if the logical operator is neither `'and'` nor `'or'` or if `filters` is empty
(`CompositeFilterDto: "filters" must be a non-empty array`).

## Ordering: `SearchOrderDto`

Takes an array of `SearchOrderItemDto` (`{ field: string; direction: 'asc' | 'desc' }`); the order
of the array is the priority:

```ts
const orders = new SearchOrderDto([
  { field: 'createdAt', direction: 'desc' },
  { field: 'name', direction: 'asc' },
]);

orders.orders[0]; // { field: 'createdAt', direction: 'desc' }
```

It throws `Error` if it does not receive an array, if a `field` is empty or if `direction` is
neither `'asc'` nor `'desc'`.

## Pagination: `SearchPaginatorDto`

`new SearchPaginatorDto(page, perPage)`: `page` starts at 1 and both must be positive integers.

```ts
const page = new SearchPaginatorDto(3, 25);
page.page; // 3
page.perPage; // 25

new SearchPaginatorDto(0, 10);
// Error: SearchPaginatorDto: "page" and "perPage" must be positive integers
new SearchPaginatorDto(1.5, 10);
// Error: SearchPaginatorDto: "page" and "perPage" must be integers
```

## Grouping: `SearchGroupByDto`

Accepts one field or a list of fields and always exposes them as an array in `fields`:

```ts
new SearchGroupByDto('country').fields; // ['country']
new SearchGroupByDto(['country', 'city']).fields; // ['country', 'city']
```

It throws `Error` with `null`/`undefined`, with anything that is not a string or an array, or if an
element of the array is not a string. The MongoDB converter does not use `groupBy`; it stays
available for your own repository and the serializer keeps it.

## MongoDB conversion: `MongoCriteriaConverter`

`convert(criteria)` returns a `MongoQuery`:

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

- `skip = (page - 1) * perPage` and `limit = perPage`. Without a paginator, `skip` and `limit` are
  `0` (in MongoDB `limit(0)` means no limit).
- In the ordering, the `id` field is translated to `_id`. Not in the filters: filter by `_id` if that
  is what you store.
- `INARRAY` throws `Error: Operator inarray is not supported for Mongo conversion`, and `BETWEEN`
  without an array of exactly two values throws
  `Error: BETWEEN operator requires an array of two values for field <field>`.

The package does not depend on the MongoDB driver: `filter`, `sort`, `skip` and `limit` are plain
objects and numbers that you pass to the query yourself (`find`, `sort`, `skip`, `limit`).

## Serialization: `SearchQuerySerializer`

Static methods to send a criterion as text (for example, in a URL or in a message) and rebuild it
with its classes and validations:

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

Composite filters are serialized as `{ "type": "composite", "logicalOperator", "filters" }`. Missing
parts are written as `null`. `deserialize` throws `Error: Invalid JSON string` if the text is not
JSON and `Error: Unknown filter format` if a filter does not have `type` `'simple'` or
`'composite'`; any other invalid data throws the error of the corresponding DTO.

## Exports summary

| Export                   | Class / type | Use                                                                                      |
| ------------------------ | ------------ | ---------------------------------------------------------------------------------------- |
| `SearchCriteriaDto`      | class        | Filters, ordering, pagination and grouping of a search                                   |
| `SimpleFilterDto`        | class        | One `field operator value` condition                                                     |
| `CompositeFilterDto`     | class        | Filters joined with `'and'` / `'or'`, nestable                                           |
| `FilterOperator`         | enum         | `eq`, `ne`, `lt`, `lte`, `gt`, `gte`, `in`, `nin`, `between`, `like`, `ilike`, `inarray` |
| `SearchOrderDto`         | class        | Ordered list of `SearchOrderItemDto`                                                     |
| `SearchPaginatorDto`     | class        | `page` (from 1) and `perPage`                                                            |
| `SearchGroupByDto`       | class        | Grouping fields (`fields`)                                                               |
| `SearchQuerySerializer`  | class        | `serialize(criteria)` / `deserialize(text)` (static)                                     |
| `MongoCriteriaConverter` | class        | `convert(criteria)` → `MongoQuery`                                                       |
| `LogicalOperator`        | type         | `'and' \| 'or'`                                                                          |
| `SearchFilterDto`        | type         | `SimpleFilterDto \| CompositeFilterDto`                                                  |
| `SearchOrderItemDto`     | interface    | `{ field: string; direction: 'asc' \| 'desc' }`                                          |
| `MongoQuery`             | interface    | `{ filter, sort, skip, limit }`                                                          |
| `MongoFilter`            | type         | Generated MongoDB filter                                                                 |
| `MongoSort`              | type         | `Record<string, 1 \| -1>`                                                                |
| `MongoFilterOperator`    | type         | `'$eq' \| '$ne' \| '$gt' \| '$gte' \| '$lt' \| '$lte' \| '$regex' \| '$in' \| '$nin'`    |

## AI assistant skill

The package ships `SKILL.md`, a Claude Code skill with the rules, the recommended patterns and the
common mistakes. For the full API it points to this README inside `node_modules`, so it stays valid
when you update the package. To install it in your project:

```bash
mkdir -p .claude/skills/archi-code-criteria && cp node_modules/@archi-code/criteria/SKILL.md .claude/skills/archi-code-criteria/SKILL.md
```

### How to use

Invoke it with a request:

```text
/archi-code-criteria create the GET /users endpoint with a filter by status and minimum age, ordering and pagination
```

Or ask for the task without naming it and Claude loads it on its own because it matches its
description:

```text
Implement the MongoDB orders repository with search by SearchCriteriaDto
```

It also works to review code that already uses the package:

```text
/archi-code-criteria review the repositories and flag filters that cannot be converted to MongoDB
```

With the skill loaded, Claude follows its rules, avoids the mistakes in its "What not to do" list
and, before using anything the skill does not show, reads this README in `node_modules`.

### Keeping it up to date

- The copy does not update itself: after updating `@archi-code/criteria`, run the command above
  again.
- Commit `.claude/skills/archi-code-criteria/` to the repository so the whole team uses it.

## License

MIT
