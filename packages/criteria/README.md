# @archi-code/criteria

The Criteria pattern for repositories, independent of any database. You describe a search (filters,
order and pagination) with a typed object; the editor autocompletes the fields of your entity and
offers only the operators that fit each field type. The result is an immutable `Criteria<T>` holding
a plain tree of filter nodes that every adapter translates or runs. `@archi-code/criteria-memory`
runs it over arrays in memory and defines the reference semantics; adapters for other engines
(MongoDB, IndexedDB) implement the same contract.

The package also turns a criteria into a URL-safe text and back, validates untrusted input with a
schema (allowed fields, operators and limits) and ships the contract every adapter must pass. No
runtime dependencies; CJS and ESM builds.

## Installation

```bash
npm install @archi-code/criteria
```

Requires Node.js 24 or later. The package has no side effects (`sideEffects: false`), so bundlers
drop whatever you do not import.

## Import

```ts
import { Criteria, CriteriaError, defineCriteriaSchema } from '@archi-code/criteria';
import type { SearchResult, Where } from '@archi-code/criteria';
```

CommonJS:

```js
const { Criteria } = require('@archi-code/criteria');
```

## Which type to search on

`T` is the plain, persisted shape of your entity (its primitives), not an aggregate built from value
objects. With `@archi-code/domain` that is `PrimitiveTypes<User>` or your own `UserPrimitives`:

```ts
interface UserPrimitives {
  id: string;
  name: string | null;
  age?: number | null;
  status: 'active' | 'pending' | 'blocked';
  createdAt: Date;
  tags: string[];
  address?: { city: string; zip: string };
}
```

Fields are the paths to its values, nested ones with dots (`'address.city'`), up to four levels.
Values are `string`, `number`, `boolean`, `Date` or lists of them; methods are skipped.

## `Criteria.create`

```ts
const criteria = Criteria.create<UserPrimitives>({
  where: { status: 'active', age: { gte: 18 } },
  orderBy: { createdAt: 'desc' },
  limit: 20,
});

criteria.filter;
// { kind: 'and', filters: [
//   { kind: 'compare', field: 'status', operator: 'eq', value: 'active' },
//   { kind: 'compare', field: 'age', operator: 'gte', value: 18 } ] }
criteria.order; // [{ field: 'createdAt', direction: 'desc' }]
criteria.pagination; // { kind: 'offset', limit: 20, offset: 0 }
```

Every part is optional: `Criteria.create()` matches everything, in no particular order, without
limit. The criteria and its nodes are frozen; lists and dates are copied.

### `where`

Each key is a field; its value is either a plain value (equality), `null` (the field is null or
missing) or an object with operators. Several keys, or several operators on one field, are joined
with AND. `AND`, `OR` (lists) and `NOT` combine conditions and can be nested.

```ts
Criteria.create<UserPrimitives>({
  where: {
    status: { in: ['active', 'pending'] },
    age: { gte: 18, lt: 65 },
    'address.city': 'Huelva',
    name: { contains: 'an', mode: 'insensitive' },
    OR: [{ tags: { has: 'vip' } }, { createdAt: { gt: new Date('2024-01-01') } }],
    NOT: { tags: { isEmpty: true } },
  },
});
```

| Field type     | Operators                                                                                               |
| -------------- | ------------------------------------------------------------------------------------------------------- |
| string         | `eq` `ne` `gt` `gte` `lt` `lte` `between` `in` `nin` `contains` `startsWith` `endsWith` `mode` `isNull` |
| number, `Date` | `eq` `ne` `gt` `gte` `lt` `lte` `between` `in` `nin` `isNull`                                           |
| boolean        | `eq` `ne` `isNull`                                                                                      |
| list (`E[]`)   | `has` (one value) `hasSome` (any of) `hasEvery` (all of) `isEmpty` `isNull`                             |

A field of a union of string literals (`status`) only accepts those literals in `eq`, `ne`, `in` and
`nin`. An operator that does not fit the field, an unknown field or a wrong value type is a
compile error.

Optional input: keys and operators whose value is `undefined` are ignored, so
`{ age: { gte: query.minAge } }` filters only when `minAge` is set. A condition left without
operators adds nothing; an `OR` with an empty branch matches everything.

### Semantics

These rules are the same in every adapter (the contract checks them):

- A missing field is `null`. `isNull: true` (or `field: null`, or `eq: null`) matches null and
  missing; `ne`, `nin` and `NOT` also match null and missing.
- `gt`, `gte`, `lt`, `lte` and `between` only match values of the same type, never null. `between`
  includes both ends.
- Strings compare by code unit (binary order: `'B' < 'a' < 'Á'`); dates by time.
- `contains`, `startsWith` and `endsWith` search literal text, not a pattern. `mode: 'insensitive'`
  lowercases both sides; it only applies to these three operators.
- `isEmpty: true` matches an empty list, not a missing one.
- Ordering puts null and missing first in `asc` and last in `desc`; booleans sort `false` first. Add
  a unique field (such as `id`) last when the order of ties matters.

### `orderBy`

One object or a list of objects; the order of the keys and of the list is the priority. Only
fields with a single value can be sorted.

```ts
Criteria.create<UserPrimitives>({ orderBy: [{ status: 'asc' }, { createdAt: 'desc' }] });
```

### `limit` and `offset`

`limit` is an integer from 1 and `offset` an integer from 0. Without `limit` the search returns
every match.

## Changing a criteria

Every method returns a new `Criteria`:

```ts
const base = Criteria.create<UserPrimitives>({ where: { status: 'active' } });

base.and({ age: { lt: 65 } }).filter;
// { kind: 'and', filters: [
//   { kind: 'compare', field: 'status', operator: 'eq', value: 'active' },
//   { kind: 'compare', field: 'age', operator: 'lt', value: 65 } ] }

base.orderBy({ name: 'asc' }); // replaces the order
base.paginate({ limit: 10, offset: 30 }); // replaces the pagination
base.page(3, 25).pagination; // { kind: 'offset', limit: 25, offset: 50 }
```

`criteria.equals(other)` compares two criteria by content.

## URL text: `toUrl` / `fromUrl`

`toUrl()` turns a criteria into text that only uses `A-Z a-z 0-9 - _`, so it goes into a URL as
is, with no escaping. `Criteria.fromUrl(text)` rebuilds it and validates it again. The same criteria
always gives the same text, which also makes it a cache key.

```ts
const text = criteria.toUrl();
// 'eyJ2IjoxLCJmIjpbImFuZCIsW1siZXEiLCJzdGF0dXMiLCJhY3RpdmUiXSxbImd0ZSIsImFnZSIsMThdXV0sIm8iOltbImNyZWF0ZWRBdCIsLTFdXSwibCI6MjB9'

fetch(`/users?q=${text}`);

Criteria.fromUrl<UserPrimitives>(text).equals(criteria); // true
```

Text from outside must be checked against a schema: `Criteria.fromUrl(text, userSchema)` or
`userSchema.fromUrl(text)` (see below). Without one, `fromUrl` only checks that the criteria is
well formed.

`toJSON()` / `Criteria.fromJSON(json, schema?)` do the same with the compact JSON form behind the
text:

```ts
criteria.toJSON();
// { v: 1, f: ['and', [['eq', 'status', 'active'], ['gte', 'age', 18]]], o: [['createdAt', -1]], l: 20 }
```

## Input from outside: `defineCriteriaSchema`

A schema lists the fields a search may use, their type, the allowed operators and the limits.
`parse` takes the input of a request (JSON body or parsed query) with the same shape as
`Criteria.create`, converts text to the field type (`'18'` → `18`, `'true'` → `true`, ISO text or
milliseconds → `Date`) and applies the limits:

```ts
const userSchema = defineCriteriaSchema<UserPrimitives>({
  fields: {
    status: 'string',
    age: 'number',
    createdAt: 'date',
    tags: 'string[]',
    name: { type: 'string', operators: ['contains', 'startsWith'] },
    'address.city': { type: 'string', sortable: false },
  },
  defaultLimit: 20,
  maxLimit: 100,
});

const criteria = userSchema.parse({
  where: { age: { gte: '18' } },
  orderBy: { createdAt: 'desc' },
});
criteria.filter; // { kind: 'compare', field: 'age', operator: 'gte', value: 18 }
criteria.pagination; // { kind: 'offset', limit: 20, offset: 0 }

userSchema.parse({ where: { password: 'x' } });
// CriteriaError UNKNOWN_FIELD: Field "password" cannot be used in a search
userSchema.parse({ limit: 500 });
// CriteriaError LIMIT_EXCEEDED: "limit" cannot be greater than 100
```

- Field types: `'string'`, `'number'`, `'boolean'`, `'date'` and their lists (`'string[]'`…). The
  type must match the entity (a compile error otherwise).
- `operators` narrows the operators of the table above; `sortable: false` forbids ordering by the
  field (lists are never sortable).
- `defaultLimit` applies when the input has no `limit` (or `maxLimit` when there is no default);
  a `limit` above `maxLimit` throws.
- `schema.check(criteria)` applies the same rules to a criteria you already have and
  `schema.fromUrl(text)` reads and checks a URL text.

## Errors: `CriteriaError`

Every validation throws a `CriteriaError` (`name` `'CriteriaError'`) with a `code`:

| Code                   | When                                                                    |
| ---------------------- | ----------------------------------------------------------------------- |
| `INVALID_FORMAT`       | the input, a `where`, a filter or the JSON has the wrong shape          |
| `INVALID_FIELD`        | empty field, empty segment, a segment starting with `$`, `__proto__`…   |
| `INVALID_OPERATOR`     | unknown operator, or `mode` without a text operator                     |
| `INVALID_VALUE`        | a value of the wrong type, `NaN`, an invalid `Date`, `NOT` with nothing |
| `EMPTY_LIST`           | `in`, `nin`, `hasSome`, `hasEvery`, `AND` or `OR` with an empty list    |
| `INVALID_RANGE`        | `between` with mixed types or `min` greater than `max`                  |
| `INVALID_ORDER`        | a direction other than `asc`/`desc`, or a field ordered twice           |
| `INVALID_PAGINATION`   | `limit` below 1, `offset` below 0, not integers                         |
| `UNKNOWN_FIELD`        | (schema) the field is not in the schema                                 |
| `OPERATOR_NOT_ALLOWED` | (schema) the operator is not allowed on the field                       |
| `NOT_SORTABLE`         | (schema) the field cannot be sorted                                     |
| `LIMIT_EXCEEDED`       | (schema) `limit` above `maxLimit`                                       |
| `INVALID_SCHEMA`       | (schema) a wrong schema definition                                      |
| `INVALID_TEXT`         | `fromUrl` got text that is not a criteria                               |
| `UNSUPPORTED_VERSION`  | the JSON or text comes from an unknown format version                   |

## Writing an adapter

`criteria.filter` is a tree of plain nodes told apart by `kind` (never by class):
`compare` (`eq` `ne` `gt` `gte` `lt` `lte`), `between`, `in`, `notIn`, `text`, `isNull`,
`arrayContains` (`match: 'some' | 'every'`), `arrayEmpty`, `and`, `or` and `not`. `visitFilter`
calls one method per kind; a visitor that misses a kind does not compile:

```ts
import { visitFilter } from '@archi-code/criteria';
import type { FilterNode } from '@archi-code/criteria';

const toText = (node: FilterNode): string =>
  visitFilter(node, {
    compare: (n) => `${n.field} ${n.operator} ${String(n.value)}`,
    and: (n) => n.filters.map(toText).join(' AND '),
    // ...one method per kind
  });

toText(criteria.filter); // 'status eq active AND age gte 18'
```

- `mapField(fields, field)` renames a field with a `FieldMap<T>` (`{ id: '_id' }`) and leaves the
  rest as they are: `mapField({ id: '_id' }, 'id')` → `'_id'`.
- `compareValues(a, b)` and `valuesEqual(a, b)` implement the ordering and the equality of the
  semantics above.
- `Criteria.fromNodes({ filter, order, pagination })` builds a criteria from nodes and validates
  them.
- An adapter returns a `SearchResult<T>`: `{ items, total? }`, with `total` (every match before
  paginating) only when it receives `{ withTotal: true }` (`SearchOptions`).

### The contract

`runCriteriaContract(adapter)` loads `createContractDocuments()` through `adapter.setup` and runs
every case of `CRITERIA_CONTRACT_CASES` through `adapter.search`. It resolves to the list of failures
(empty when the adapter follows the semantics) and does not depend on a test runner:

```ts
import { runCriteriaContract } from '@archi-code/criteria';
import type { ContractDocument } from '@archi-code/criteria';

let documents: ContractDocument[] = [];
const failures = await runCriteriaContract({
  setup: (seed) => {
    documents = seed;
  },
  search: (criteria, options) => searchMemory(documents, criteria, options),
});
// []
```

## Exports summary

| Export                                                                                           | Kind     | Use                                                      |
| ------------------------------------------------------------------------------------------------ | -------- | -------------------------------------------------------- |
| `Criteria`                                                                                       | class    | `create`, `fromNodes`, `fromJSON`, `fromUrl` and methods |
| `CriteriaError`                                                                                  | class    | Validation error with `code`                             |
| `defineCriteriaSchema`                                                                           | function | Schema for input from outside                            |
| `visitFilter`                                                                                    | function | Calls one visitor method per node kind                   |
| `mapField`                                                                                       | function | Renames a field with a `FieldMap`                        |
| `compareValues`, `valuesEqual`                                                                   | function | Ordering and equality of the semantics                   |
| `runCriteriaContract`                                                                            | function | Runs the contract against an adapter                     |
| `createContractDocuments`, `contractDay`                                                         | function | Contract documents and the date helper they use          |
| `CRITERIA_CONTRACT_CASES`                                                                        | constant | Contract cases                                           |
| `Where`, `FieldFilter`, `*Condition`                                                             | type     | Typed `where` and the operators of each field type       |
| `OrderBy`, `OrderItem`, `SortDirection`                                                          | type     | Typed `orderBy`                                          |
| `Path`, `PathValue`, `SortablePath`                                                              | type     | Paths of an entity and their value types                 |
| `FilterNode` and its node types                                                                  | type     | The filter tree adapters read                            |
| `OrderNode`, `Pagination`                                                                        | type     | Normalized order and pagination                          |
| `CriteriaInput`, `CriteriaNodes`                                                                 | type     | Input of `create` and of `fromNodes`                     |
| `CriteriaJson`, `EncodedScalar`                                                                  | type     | Compact JSON form                                        |
| `CriteriaSchema`, `CriteriaSchemaDefinition`, `FieldSpec`, `FieldType`, `FilterOperatorName`     | type     | Schema definition                                        |
| `SearchResult`, `SearchOptions`                                                                  | type     | Result and options every adapter shares                  |
| `FieldMap`, `FilterVisitor`                                                                      | type     | Adapter helpers                                          |
| `CriteriaContractAdapter`, `CriteriaContractCase`, `CriteriaContractFailure`, `ContractDocument` | type     | Contract                                                 |

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
/archi-code-criteria add a search endpoint for users with filters by status and age, ordering and pagination
```

Or ask for the task without naming it and Claude loads it on its own because it matches its
description:

```text
Add a search method to the orders repository that takes a criteria
```

It also works to review code that already uses the package:

```text
/archi-code-criteria review the repositories and flag searches that skip the schema
```

With the skill loaded, Claude follows its rules, avoids the mistakes in its "What not to do" list
and, before using anything the skill does not show, reads this README in `node_modules`.

### Keeping it up to date

- The copy does not update itself: after updating `@archi-code/criteria`, run the command above
  again.
- Commit `.claude/skills/archi-code-criteria/` to the repository so the whole team uses it.

## License

MIT
