# @archi-code/criteria

The Criteria pattern for repositories, independent of any database. You describe a search (filters,
order and pagination) with a typed object; the editor autocompletes the fields of your entity and
offers only the operators that fit each field type. The result is an immutable `Criteria<T>` holding
a plain tree of filter nodes that every adapter translates or runs. `@archi-code/criteria-adapters`
runs it over arrays in memory (`/memory`, the reference semantics), on MongoDB (`/mongodb`) and on
IndexedDB (`/indexeddb`), all checked against one shared contract.

The package also turns a criteria into a URL-safe text and back and validates untrusted input with
a schema (allowed fields, operators and limits). No runtime dependencies; CJS and ESM builds.

## Installation

```bash
npm install @archi-code/criteria
```

Requires Node.js 24 or later, or any current browser: the `browser` field and the `browser`
condition of `exports` point to the ESM build, which only uses Web APIs (`TextEncoder`, `btoa`) and
is checked in Chromium and WebKit under a strict Content-Security-Policy. The package has
no side effects (`sideEffects: false`), so bundlers drop whatever you do not import.

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
objects. With `@archi-code/ddd` that is `PrimitiveTypes<User>` or your own `UserPrimitives`:

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
limit. The criteria and its nodes are frozen; lists and dates are copied. The dates it holds are
still `Date` objects but read-only: their setters (`setTime`, `setFullYear`…) throw `TypeError`.

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
- Strings compare by Unicode code point, which is the binary order of UTF-8 (`'B' < 'a' < 'Á'`,
  and `'\uFF71' < '😀'` even though JavaScript's `<` says otherwise); dates by time.
  `compareText(a, b)` implements it.
- `contains`, `startsWith` and `endsWith` search literal text, not a pattern, and need at least one
  character (an empty text would match every string). `mode: 'insensitive'` compares with
  Unicode simple case folding, like a regular expression with the `iu` flags (`'Ω'` matches `'ω'`,
  the Kelvin sign matches `'k'`, but `'ß'` does not match `'ss'`); it only applies to these three
  operators.
- The values of one `in`, `nin`, `hasSome` or `hasEvery` share one type: `['1', 1]` throws.
- `isEmpty: true` matches an empty list, not a missing one.
- Scalar operators (`eq`, `ne`, ranges, `in`, `nin`, text) never match a field that holds a list,
  neither positive nor negated (`eq: 'vip'` and `ne: 'vip'` both skip `['vip']`; use `has` or
  `NOT`), and a dotted path reads a list element only by its index (`lines.0.sku`): `lines.sku`
  reads as missing.
- Only own properties are read, never inherited ones.
- Ordering puts null and missing first in `asc` and last in `desc`; booleans sort `false` first. Add
  a unique field (such as `id`) last when the order of ties matters (a schema does it for you with
  `tiebreaker`).

### `orderBy`

One object or a list of objects; the order of the keys and of the list is the priority. Only
fields with a single value can be sorted.

```ts
Criteria.create<UserPrimitives>({ orderBy: [{ status: 'asc' }, { createdAt: 'desc' }] });
```

### `limit` and `offset`

`limit` is an integer from 1 and `offset` an integer from 0, both safe integers
(`Number.isSafeInteger`). Without `limit` the search returns every match. `page(page, perPage)`
also throws when `(page - 1) * perPage` is not a safe integer.

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

`criteria.equals(other)` compares two criteria by meaning: the order of `AND`/`OR` conditions, the
order of the values of a list and repeated conditions or values do not matter; the order of
`orderBy` does.

## URL text: `toUrl` / `fromUrl`

`toUrl()` turns a criteria into text that only uses `A-Z a-z 0-9 - _`, so it goes into a URL as
is, with no escaping. `Criteria.fromUrl(text)` rebuilds it and validates it again. The text keeps
the order in which the conditions were written, so two equal criteria (`equals`) written in another
order give different texts.

```ts
const text = criteria.toUrl();
// 'eyJ2IjoxLCJmIjpbImFuZCIsW1siZXEiLCJzdGF0dXMiLCJhY3RpdmUiXSxbImd0ZSIsImFnZSIsMThdXV0sIm8iOltbImNyZWF0ZWRBdCIsLTFdXSwibCI6MjB9'

fetch(`/users?q=${text}`);

Criteria.fromUrl<UserPrimitives>(text).equals(criteria); // true
```

Text from outside must be checked against a schema: `Criteria.fromUrl(text, userSchema)` or
`userSchema.fromUrl(text)` (see below). Without one, `fromUrl` and `fromJSON` only check that the
criteria is well formed and within `DEFAULT_CRITERIA_LIMITS` (see "Limits"); any field can still be
filtered.

`toJSON()` / `Criteria.fromJSON(json, schema?)` do the same with the compact JSON form behind the
text:

```ts
criteria.toJSON();
// { v: 1, f: ['and', [['eq', 'status', 'active'], ['gte', 'age', 18]]], o: [['createdAt', -1]], l: 20 }
```

## Input from outside: `defineCriteriaSchema`

A schema lists the fields a search may use, their type, the allowed operators and the limits.
`parse` takes the input of a request (JSON body or parsed query) with the same shape as
`Criteria.create`, converts text to the field type and applies the limits:

```ts
const userSchema = defineCriteriaSchema<UserPrimitives>({
  fields: {
    id: 'string',
    status: 'string',
    age: 'number',
    createdAt: 'date',
    tags: 'string[]',
    name: { type: 'string', operators: ['contains', 'startsWith'] },
    'address.city': { type: 'string', sortable: false },
  },
  defaultLimit: 20,
  maxLimit: 100,
  tiebreaker: 'id',
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
- `maxLimit` is required: every criteria a schema returns has a `limit`. `defaultLimit` applies
  when the input has no `limit` (`maxLimit` when there is no default); a `limit` above `maxLimit`
  throws.
- `maxOffset` (default `10000`) caps `offset`: deep offsets make the database read and skip every
  previous row.
- `limits` overrides the complexity limits of the schema (see "Limits"); `schema.limits` holds the
  resolved values.
- `tiebreaker` names a unique sortable field of the schema (usually `'id'`). The schema adds it last
  to every order, ascending, unless the input already orders by it, so offset pages never repeat or
  skip rows that tie. Without `orderBy` the result is ordered by it alone.
- `schema.check(criteria)` applies the same rules to a criteria you already have and
  `schema.fromUrl(text)` reads and checks a URL text.

### Value conversion

Text and numbers from a query string are converted strictly, the same in every JavaScript engine:

| Field type | Accepted                                                                                 |
| ---------- | ---------------------------------------------------------------------------------------- |
| `string`   | text                                                                                     |
| `number`   | a finite number, or decimal text such as `'18'`, `'-0.5'` (no `'0x10'`, `'1e3'`, `' 1'`) |
| `boolean`  | `true`, `false`, `'true'`, `'false'`                                                     |
| `date`     | a valid `Date`; integer milliseconds as a number (`1700000000000`); ISO text             |

ISO text is either a date, read as UTC midnight (`'2024-01-01'`), or a date and time with a zone
(`'2024-01-01T10:00Z'`, `'2024-01-01T10:00:30.5+02:00'`). A time without a zone
(`'2024-01-01T10:00'`), dates that do not exist (`'2024-02-30'`) and any other text
(`'March 7'`) throw `INVALID_VALUE`. Text with only digits is refused too (`'2024'`,
`'1700000000000'`): it could be a year or milliseconds, so a query string sends dates as ISO text.

### Limits

A criteria that comes from outside is checked against limits, so a request cannot make the parser
or the database do unbounded work. `DEFAULT_CRITERIA_LIMITS` applies to `Criteria.fromUrl` and
`Criteria.fromJSON` without a schema and to every schema that does not override it:

| Limit            | Default | Checks                                                   |
| ---------------- | ------- | -------------------------------------------------------- |
| `maxDepth`       | `16`    | levels of `AND`/`OR`/`NOT` nesting (at most `64`)        |
| `maxNodes`       | `256`   | nodes of the filter tree, logical ones included          |
| `maxListSize`    | `1000`  | values of one `in`, `nin`, `hasSome` or `hasEvery`       |
| `maxTextLength`  | `1024`  | characters of a field name or a text value               |
| `maxOrderFields` | `8`     | fields in `orderBy`                                      |
| `maxUrlLength`   | `8192`  | characters of the text `fromUrl` receives, checked first |

```ts
const searchSchema = defineCriteriaSchema<UserPrimitives>({
  fields: { status: 'string', tags: 'string[]' },
  maxLimit: 50,
  limits: { maxListSize: 20, maxDepth: 4 },
});

searchSchema.parse({ where: { tags: { hasSome: manyTags } } });
// CriteriaError LIMIT_EXCEEDED: Field "tags" has more than 20 values
```

`Criteria.create` and the methods of a criteria built in code only refuse filters nested deeper than
64 levels, so a large `in` built by the application (for example, a batch of ids) still works.
Every limit throws `CriteriaError` with code `LIMIT_EXCEEDED`; input from outside never makes the
package throw anything else.

## Errors: `CriteriaError`

Every validation throws a `CriteriaError` (`name` `'CriteriaError'`) with a `code`. Messages
quote at most 64 characters of the input. `error instanceof CriteriaError` also works when an
application loads two copies of the package (its CommonJS and its ES module build, or two
versions): the class recognizes the errors of every copy.

`new CriteriaError(code, message, { cause })` keeps `cause` like a native `Error` (a non-enumerable
property, present only when given). `fromUrl` sets it on `INVALID_TEXT` to the error the text gave
while decoding:

```ts
try {
  Criteria.fromUrl('eyJ2Ijox');
} catch (error) {
  if (error instanceof CriteriaError) {
    error.code; // 'INVALID_TEXT'
    error.cause; // SyntaxError from JSON.parse
  }
}
```

| Code                   | When                                                                                                        |
| ---------------------- | ----------------------------------------------------------------------------------------------------------- |
| `INVALID_FORMAT`       | the input, a `where`, a filter or the JSON has the wrong shape                                              |
| `INVALID_FIELD`        | empty field, empty segment, a segment starting with `$`, `__proto__`…, a control character                  |
| `INVALID_OPERATOR`     | unknown operator, or `mode` without a text operator                                                         |
| `INVALID_VALUE`        | a value of the wrong type, `NaN`, an invalid `Date`, `NOT` with nothing, an empty text, a list mixing types |
| `EMPTY_LIST`           | `in`, `nin`, `hasSome`, `hasEvery`, `AND` or `OR` with an empty list                                        |
| `INVALID_RANGE`        | `between` with mixed types or `min` greater than `max`                                                      |
| `INVALID_ORDER`        | a direction other than `asc`/`desc`, or a field ordered twice                                               |
| `INVALID_PAGINATION`   | `limit` below 1, `offset` below 0, not safe integers                                                        |
| `UNKNOWN_FIELD`        | (schema) the field is not in the schema                                                                     |
| `OPERATOR_NOT_ALLOWED` | (schema) the operator is not allowed on the field                                                           |
| `NOT_SORTABLE`         | (schema) the field cannot be sorted                                                                         |
| `LIMIT_EXCEEDED`       | a limit of "Limits" passed, or (schema) `limit`/`offset` above the max                                      |
| `INVALID_SCHEMA`       | (schema) a wrong schema definition                                                                          |
| `INVALID_TEXT`         | `fromUrl` got text that is not a criteria                                                                   |
| `UNSUPPORTED_VERSION`  | the JSON or text comes from an unknown format version                                                       |

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
- `isDate(value)` tells a `Date` apart even when it comes from another realm (an iframe, `vm`, a
  structured clone made outside a test sandbox), where `instanceof Date` is `false`. Adapters use it
  instead of `instanceof Date` for the values they read from their engine.
- `Criteria.fromNodes({ filter, order, pagination })` builds a criteria from nodes and validates
  them.
- An adapter returns a `SearchResult<T>`: `{ items, total? }`, with `total` (every match before
  paginating) only when it receives `{ withTotal: true }` (`SearchOptions`).

### The contract

Every adapter must return the same results as `@archi-code/criteria-adapters/memory`, which
implements the semantics above. `@archi-code/criteria-adapters` keeps one internal contract
(documents, cases and expected results) that each of its adapters runs in its tests; a new engine
joins that package and passes the same contract.

## Exports summary

| Export                                                                                       | Kind     | Use                                                                         |
| -------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------- |
| `Criteria`                                                                                   | class    | `create`, `fromNodes`, `fromJSON`, `fromUrl` and methods                    |
| `CriteriaError`                                                                              | class    | Validation error with `code`                                                |
| `DEFAULT_CRITERIA_LIMITS`                                                                    | constant | Limits for input from outside                                               |
| `defineCriteriaSchema`                                                                       | function | Schema for input from outside                                               |
| `visitFilter`                                                                                | function | Calls one visitor method per node kind                                      |
| `mapField`                                                                                   | function | Renames a field with a `FieldMap`                                           |
| `compareValues`, `compareText`, `valuesEqual`, `isDate`                                      | function | Ordering (code point order for text), equality and cross-realm `Date` check |
| `Where`, `FieldFilter`, `*Condition`                                                         | type     | Typed `where` and the operators of each field type                          |
| `OrderBy`, `OrderItem`, `SortDirection`                                                      | type     | Typed `orderBy`                                                             |
| `Path`, `PathValue`, `SortablePath`                                                          | type     | Paths of an entity and their value types                                    |
| `FilterNode` and its node types                                                              | type     | The filter tree adapters read                                               |
| `OrderNode`, `Pagination`                                                                    | type     | Normalized order and pagination                                             |
| `CriteriaInput`, `CriteriaNodes`                                                             | type     | Input of `create` and of `fromNodes`                                        |
| `CriteriaJson`, `EncodedScalar`                                                              | type     | Compact JSON form                                                           |
| `CriteriaSchema`, `CriteriaSchemaDefinition`, `FieldSpec`, `FieldType`, `FilterOperatorName` | type     | Schema definition                                                           |
| `CriteriaLimits`                                                                             | type     | Complexity limits                                                           |
| `CriteriaErrorCode`, `CriteriaErrorOptions`                                                  | type     | Error codes and the `cause` option                                          |
| `SearchResult`, `SearchOptions`                                                              | type     | Result and options every adapter shares                                     |
| `FieldMap`, `FilterVisitor`                                                                  | type     | Adapter helpers                                                             |

## AI assistant skill

The package ships `SKILL.md`, a Claude Code skill with the rules, the recommended patterns and the
common mistakes. For the full API it points to this README inside `node_modules`, so it stays valid
when you update the package.

To install it in your project, run this from the project root; it links the skill into the Claude
Code skills folder:

```bash
mkdir -p .claude/skills/archi-code-criteria && ln -sf "./node_modules/@archi-code/criteria/SKILL.md" .claude/skills/archi-code-criteria/SKILL.md
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

- The link points to the `SKILL.md` installed in `node_modules`, so it follows the version of
  `@archi-code/criteria` you have installed.
- Each person runs the command in their own copy of the project. Do not commit it; add `.claude/skills/archi-code-criteria/` to `.gitignore`.

## License

MIT
