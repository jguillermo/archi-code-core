# @archi-code/criteria-adapters

Turns `@archi-code/criteria` searches into what a storage engine runs. Each adapter is its own entry
point, so an application loads only the one it uses and the adapters never depend on each other's
code:

| Entry point                               | Does                                                         | Runs in              |
| ----------------------------------------- | ------------------------------------------------------------ | -------------------- |
| `@archi-code/criteria-adapters/memory`    | runs a criteria on arrays in memory (reference semantics)    | Node.js and browsers |
| `@archi-code/criteria-adapters/mongodb`   | converts a criteria into a native MongoDB query              | Node.js              |
| `@archi-code/criteria-adapters/indexeddb` | converts a criteria into the native reads of an object store | browsers             |

`/mongodb` and `/indexeddb` never touch the database: they only build the query. Your code passes
it to the driver or to the IndexedDB API, inside the session or transaction it already manages.

The package has no root entry: `import '@archi-code/criteria-adapters'` fails on purpose, always
import the adapter you need.

## Installation

```bash
npm install @archi-code/criteria @archi-code/criteria-adapters
```

Requires Node.js 24 or later. `@archi-code/criteria` is the only dependency. `/mongodb` does not
need the `mongodb` driver: it only builds the query, which your code passes to the driver it already
uses (the query is checked with the driver 6 and 7). The
package has no side effects (`sideEffects: false`). The entry points import `@archi-code/criteria`
by name, so in a browser use a bundler (Vite, webpack, esbuild…) or an import map. `/memory` and
`/indexeddb` are checked in Chromium and WebKit, `/indexeddb` on each browser's own
IndexedDB. TypeScript
resolves the entry points with every `moduleResolution`, including the old `node`.

## Import

```ts
import { searchMemory, matches } from '@archi-code/criteria-adapters/memory';
import { MongoCriteriaTranslator } from '@archi-code/criteria-adapters/mongodb';
import { readIndexes, toIndexedDbQuery } from '@archi-code/criteria-adapters/indexeddb';
```

CommonJS:

```js
const { searchMemory } = require('@archi-code/criteria-adapters/memory');
```

## Same results in every adapter

Every adapter gives exactly what `/memory` returns for the same data and criteria: the rules of
the "Semantics" section of the `@archi-code/criteria` README (missing fields are null, comparisons
only between values of the same type, strings in code point order, literal text with Unicode
simple case folding, nulls first when ascending…). Four rules matter for stored lists:

- A field is read as the stored value itself. A scalar operator (`eq`, `ne`, ranges, `in`, `nin`,
  text) never matches a field that holds a list, neither positive nor negated: `eq: 'vip'` and
  `ne: 'vip'` both skip `tags: ['vip']`. Search lists with `has`, `hasSome`, `hasEvery`, `isEmpty`
  or `NOT`.
- A dotted path reads a list element only by its index (`lines.0.sku`); a path that crosses a list
  by name (`lines.sku`) reads as missing, never as "any element".
- Do not sort by a field that holds a list: the criteria order puts a list after every other value
  and compares two lists as equal, while MongoDB sorts it by its smallest (`asc`) or largest
  (`desc`) element. Typed criteria and schemas never sort by a list field.
- Do not store `null` inside a list you filter with `isNull: false`: MongoDB's `$ne: null` (kept
  because it can use an index) skips a list that holds a `null` element, which the other adapters
  match.

MongoDB does the opposite by default; `/mongodb` adds the conditions that make it follow these
rules. The package checks every rule with one shared contract
(fixed documents, cases and expected results) that runs against each adapter: in memory, with the
translated query on a real MongoDB and with the IndexedDB query on real object stores. An adapter only joins the package when it passes the whole contract.

## `/memory`

### `searchMemory(items, criteria, options?)`

Filters, sorts and paginates `items` and returns a `SearchResult<T>`. With `{ withTotal: true }`
it adds `total`, the number of matches before paginating. The input list is not changed and the
returned items are the same objects.

```ts
import { Criteria } from '@archi-code/criteria';
import { searchMemory } from '@archi-code/criteria-adapters/memory';

const users = [
  { id: '1', status: 'active', age: 30 },
  { id: '2', status: 'active', age: 15 },
  { id: '3', status: 'blocked', age: 40 },
];

searchMemory(
  users,
  Criteria.create<(typeof users)[number]>({
    where: { status: 'active' },
    orderBy: { age: 'desc' },
    limit: 1,
  }),
  { withTotal: true },
);
// { items: [{ id: '1', status: 'active', age: 30 }], total: 2 }
```

An in-memory repository:

```ts
class InMemoryUserRepository implements UserRepository {
  private readonly users: UserPrimitives[] = [];

  async search(criteria: Criteria<UserPrimitives>, options?: SearchOptions) {
    return searchMemory(this.users, criteria, options);
  }
}
```

### `matches(item, criteria)` and `matchesFilter(item, filter)`

Whether one item meets the filter of a criteria (order and pagination are ignored).
`matchesFilter` takes a `FilterNode` (or `null`, which matches everything); adapters use it to
check the part of a filter their engine cannot run.

```ts
matches(users[0], Criteria.create({ where: { age: { between: [18, 65] } } })); // true
```

### `compareBy(order)` and `readPath(item, field)`

`compareBy(criteria.order)` returns a comparison function for `Array.prototype.sort` with the
criteria ordering (null and missing first in `asc`, last in `desc`). `readPath(item, 'address.city')`
reads a dotted field and gives `undefined` when a parent is missing or is not an object. It reads
only own properties (never inherited ones or getters of a class), and inside a list only indexes
(`'tags.0'`).

### Semantics

This module implements the rules described in the "Semantics" section of the
`@archi-code/criteria` README: missing fields are null, `ne`/`nin`/`NOT` also match null,
comparisons only between values of the same type, literal and optionally case-insensitive text
(Unicode simple case folding, a regular expression with the `iu` flags), code point string order,
`isEmpty` only on lists, and nulls first when ascending.

### `/memory` exports

| Export          | Use                                                 |
| --------------- | --------------------------------------------------- |
| `searchMemory`  | Filter, sort and paginate an array → `SearchResult` |
| `matches`       | Whether an item meets a criteria                    |
| `matchesFilter` | Whether an item meets a `FilterNode` (or `null`)    |
| `compareBy`     | Sort function for a criteria order                  |
| `readPath`      | Reads a dotted field                                |

## `/mongodb`

The module only translates. It never calls the driver: pass what it returns to `find`,
`countDocuments` or an aggregation yourself, with your own session, time limit and projection.

### `MongoCriteriaTranslator`

`new MongoCriteriaTranslator<T>({ fields?, convert? }).translate(criteria)` returns a `MongoQuery`
(`limit` only when the criteria has one; it is never `0`):

```ts
new MongoCriteriaTranslator<User>({ fields: { id: '_id' } }).translate(
  Criteria.create<User>({
    where: { id: 'a', name: { startsWith: 'a.b', mode: 'insensitive' } },
    orderBy: { id: 'desc' },
    limit: 5,
  }),
);
// {
//   filter: {
//     $and: [
//       { _id: { $eq: 'a', $not: { $type: 'array' } } },
//       { name: { $regex: '^a\\.b', $options: 'i', $not: { $type: 'array' } } },
//     ],
//   },
//   sort: { _id: -1 },
//   skip: 0,
//   limit: 5,
// }
```

Run it with the driver, counting only when the total is shown:

```ts
import { Criteria } from '@archi-code/criteria';
import { MongoCriteriaTranslator } from '@archi-code/criteria-adapters/mongodb';

const users = client.db('app').collection<UserPrimitives>('users');
const { filter, sort, skip, limit } = new MongoCriteriaTranslator<UserPrimitives>().translate(
  Criteria.create<UserPrimitives>({
    where: { status: 'active', age: { gte: 18 } },
    orderBy: { createdAt: 'desc' },
    limit: 20,
  }),
);
const [items, total] = await Promise.all([
  users.find(filter, { sort, skip, limit, projection: { _id: 0 } }).toArray(),
  users.countDocuments(filter),
]);
```

Inside a transaction pass the session to `find` and `countDocuments`, or the read happens outside
it and does not see what the transaction wrote.

`translateFilter(criteria.filter)` translates only the filter (`{}` for `null`), for example to
use it in an aggregation `$match`.

Options:

| Option    | Default | Use                                        |
| --------- | ------- | ------------------------------------------ |
| `fields`  | none    | `FieldMap<T>`: entity field → stored field |
| `convert` | none    | Per field: criteria value → stored value   |

`convert` turns the criteria values of a field (comparisons, ranges, `in`/`nin`, `has`…) into the
type MongoDB stores, such as an `ObjectId` `_id`; turn the documents back yourself after `find`.
When a converter throws (an id that is not 24 hex characters, for example), `translate` throws a
`CriteriaError` `INVALID_VALUE` whose `cause` is the converter error, so it maps to a 400 like any
other invalid criteria:

```ts
import { ObjectId } from 'mongodb';

const translator = new MongoCriteriaTranslator<Order>({
  fields: { id: '_id' },
  convert: { id: (id) => new ObjectId(String(id)) },
});
const { filter } = translator.translate(
  Criteria.create<Order>({ where: { id: request.params.id } }),
);
const items = (await orders.find(filter).toArray()).map(({ _id, total }) => ({
  id: _id.toHexString(),
  total,
}));
```

| Criteria                               | MongoDB                                                                             |
| -------------------------------------- | ----------------------------------------------------------------------------------- |
| `eq` `gt` `gte` `lt` `lte`             | `$eq` `$gt` `$gte` `$lt` `$lte`, plus `$not: { $type: 'array' }`                    |
| `between: [a, b]`                      | `{ $gte: a, $lte: b }`, plus `$not: { $type: 'array' }`                             |
| `in`                                   | `$in`, plus `$not: { $type: 'array' }`                                              |
| `ne` / `nin`                           | `$ne` / `$nin`, plus `$not: { $type: 'array' }`                                     |
| `contains` / `startsWith` / `endsWith` | `$regex` with the text escaped (`x`, `^x`, `x\z`), `$options: 'i'` when insensitive |
| `isNull: true` / `false`               | `{ $eq: null, $not: { $type: 'array' } }` / `{ $ne: null }`                         |
| a dotted path `a.b`                    | `$and` with `{ a: { $not: { $type: 'array' } } }` (not for index segments)          |
| `has` / `hasSome`                      | `{ $type: 'array', $in: [...] }`                                                    |
| `hasEvery`                             | `{ $type: 'array', $all: [...] }`                                                   |
| `isEmpty: true` / `false`              | `{ $size: 0 }` / `{ $type: 'array', $not: { $size: 0 } }`                           |
| `AND` / `OR` / `NOT`                   | `$and` / `$or` / `$nor`                                                             |
| `orderBy`                              | `sort` with `1` / `-1`                                                              |
| `limit` / `offset`                     | `limit` / `skip`                                                                    |

Text is always escaped, so input from users never becomes a regular expression. Strings are
compared with MongoDB's default binary (code point) order and `$options: 'i'` folds case with
Unicode simple case folding, which is the semantics every adapter follows; do not set a collation on
the collection or the query if you want the same results as the other adapters. The
`$not: { $type: 'array' }` conditions keep an index on the field usable for `$eq`, `$ne`, `$in`,
`$nin` and ranges: the package checks with `explain` that `eq`, `ne`, `nin`, ranges, `isNull: false`
and dotted paths read only the matching documents through an index.
`/mongodb` is checked with the driver 6 and 7 against MongoDB 8.2.

### Indexes

The translator does not create indexes. Create them for the fields you filter and sort by most;
`contains`, `endsWith` and any insensitive text search cannot use a normal index.

### `/mongodb` exports

| Export                     | Kind     | Use                                              |
| -------------------------- | -------- | ------------------------------------------------ |
| `MongoCriteriaTranslator`  | class    | `translate(criteria)`, `translateFilter(filter)` |
| `escapeRegex`              | function | Escapes text for a MongoDB regular expression    |
| `MongoQuery`               | type     | `{ filter, sort, skip, limit? }`                 |
| `MongoFilter`, `MongoSort` | type     | Filter object and `Record<string, 1 \| -1>`      |
| `MongoTranslatorOptions`   | type     | `{ fields?, convert? }`                          |
| `MongoValueConverters`     | type     | `convert`: entity field → value converter        |

## `/indexeddb`

### `toIndexedDbQuery(criteria, indexes)`

Converts a criteria into what the IndexedDB API reads, without opening any request:
`readIndexes(store)` gives the usable indexes of the store you pass (from a transaction you open)
and `toIndexedDbQuery` returns an `IndexedDbQuery<T>`:

| Field       | Use                                                                                   |
| ----------- | ------------------------------------------------------------------------------------- |
| `index`     | Index to read (`store.index(index)`), or `null` to read the store itself              |
| `range`     | `IDBKeyRange` for `openCursor`/`getAll`/`count`, or `null` for every record           |
| `direction` | `'next'` or `'prev'` for `openCursor`                                                 |
| `filter`    | `(record) => boolean`: the whole criteria filter, which the key range cannot express  |
| `compare`   | Criteria order for `Array.prototype.sort`, or `null` when the cursor already gives it |
| `offset`    | Matches to skip after filtering and sorting                                           |
| `limit`     | Matches to keep after `offset`, or `null`                                             |

Read the range with a cursor, keep the records `filter` accepts, sort them with `compare` when it
is not `null` and slice `offset`/`limit`. When `compare` is `null` the cursor walks in criteria
order, so you may stop once `offset + limit` records matched (unless you also count the total):

```ts
import { Criteria } from '@archi-code/criteria';
import type { SearchResult } from '@archi-code/criteria';
import { readIndexes, toIndexedDbQuery } from '@archi-code/criteria-adapters/indexeddb';

const store = database.transaction('users', 'readonly').objectStore('users');
const query = toIndexedDbQuery(
  Criteria.create<UserPrimitives>({
    where: { age: { gte: 18 }, status: 'active' },
    orderBy: { age: 'desc' },
    limit: 20,
  }),
  readIndexes(store),
);
const source = query.index === null ? store : store.index(query.index);
const matched = await new Promise<UserPrimitives[]>((resolve, reject) => {
  const found: UserPrimitives[] = [];
  const request = source.openCursor(query.range, query.direction);
  request.onerror = () => reject(request.error);
  request.onsuccess = () => {
    const cursor = request.result;
    if (cursor === null) return resolve(found);
    if (query.filter(cursor.value)) found.push(cursor.value);
    cursor.continue();
  };
});
if (query.compare !== null) matched.sort(query.compare);
const end = query.limit === null ? undefined : query.offset + query.limit;
const result: SearchResult<UserPrimitives> = {
  items: matched.slice(query.offset, end),
  total: matched.length,
};
```

With `IndexedDbTable` of `@archi-code/ddd/infrastructure`, which takes the `IDBKeyRange` and a
`null` index as they are, read the indexes with `withStore` and pass the query to `find`:

```ts
let indexes: IndexInfo[] = [];
await users.withStore('readonly', (store) => {
  indexes = readIndexes(store);
  return undefined;
});
const query = toIndexedDbQuery(criteria, indexes);
if (query.compare === null) {
  return users.find({ ...query, limit: query.limit ?? undefined });
}
const { items, total } = await users.find({ ...query, offset: undefined, limit: undefined });
const end = query.limit === null ? undefined : query.offset + query.limit;
return { items: items.sort(query.compare).slice(query.offset, end), total };
```

Store the primitive shape of the entity as is: the criteria fields are the record's properties
(nested ones with dots, like the index key paths). `toIndexedDbQuery` builds the `IDBKeyRange`
with the global `IDBKeyRange`, so it runs where IndexedDB exists.

### How it uses indexes

`planIndexedDbQuery(criteria, indexes)` decides how to read, without the `IDBKeyRange` (it
returns plain `bounds`, so it also runs without IndexedDB); `toIndexedDbQuery` calls it for you:

1. Among the conditions every match must meet (the top level and nested `AND`), it picks one on a
   field that is the store key path or the key path of an index: equality first, then `between` or a
   case-sensitive `startsWith`, then `gt`/`gte`/`lt`/`lte`. That condition becomes the
   `IDBKeyRange`.
2. When the criteria sorts by that same field only, and the field is a number or a date (or the
   condition is an equality), the cursor walks the index in that direction and `compare` is `null`.
   Otherwise `compare` sorts the matches in memory.
3. IndexedDB orders strings by UTF-16 code unit and the criteria semantics by code point; they only
   differ for characters from U+D800 up. A text range whose bound holds such a character is not
   used as a key range, and a text order is always applied with `compare`, so the results never
   depend on that difference.
4. `filter` holds the whole criteria filter, so `OR`, `NOT`, insensitive text and any other
   condition keep the same semantics as the other adapters when every record the cursor returns
   passes through it.

| Uses an index                   | Never uses an index                                                 |
| ------------------------------- | ------------------------------------------------------------------- |
| `eq` on string, number, `Date`  | `ne`, `in`, `nin`, `OR`, `NOT`, `contains`, `endsWith`              |
| `gt` `gte` `lt` `lte` `between` | insensitive text, booleans and `null` (not valid IndexedDB keys)    |
| case-sensitive `startsWith`     | lists (`has`…), compound (array) key paths and `multiEntry` indexes |

A walk without a key range never gives the order: a secondary index skips records whose field is
null or missing, which must come first, and a store key may hold dates and text, which IndexedDB
orders apart from the criteria. Create indexes on the fields you filter by equality or ranges most
often.

`readIndexes(store)` lists the usable indexes as `{ name, keyPath }` (`name: null` is the store key
path); it reads only the store definition, never its records.

### `/indexeddb` exports

| Export                                   | Kind     | Use                                                           |
| ---------------------------------------- | -------- | ------------------------------------------------------------- |
| `toIndexedDbQuery`                       | function | Criteria → native reads of an object store                    |
| `readIndexes`                            | function | Usable key paths of a store                                   |
| `planIndexedDbQuery`                     | function | Chooses index, key bounds, direction and whether to sort      |
| `IndexedDbQuery`                         | type     | `{ index, range, direction, filter, compare, offset, limit }` |
| `IndexedDbPlan`                          | type     | `{ index, bounds, direction, presorted }`                     |
| `IndexInfo`, `KeyBounds`, `IndexedDbKey` | type     | Plan details                                                  |

## AI assistant skill

The package ships `SKILL.md`, a Claude Code skill with the rules, recommended patterns and common
mistakes. For the full API it points to this README inside `node_modules`, so it stays valid when
the package is updated.

To install it in your project, run this from the project root; it links the skill into the Claude
Code skills folder:

```bash
mkdir -p .claude/skills/archi-code-criteria-adapters && ln -sf "./node_modules/@archi-code/criteria-adapters/SKILL.md" .claude/skills/archi-code-criteria-adapters/SKILL.md
```

### How to use

Invoke it with a request:

```text
/archi-code-criteria-adapters write a MongoDB UserRepository with search(criteria) and an in-memory one for the tests
```

Or ask for the task without naming it and Claude loads it on its own because it matches its
description:

```text
Store the orders in IndexedDB and search them with the same criteria the server uses
```

It also reviews code that already uses the package:

```text
/archi-code-criteria-adapters review the repositories and replace hand-written filters and Mongo queries
```

With the skill loaded, Claude follows its rules, avoids the mistakes in its "What not to do" list
and, before using anything the skill does not show, reads this README in `node_modules`.

### Keeping it up to date

- The link points to the `SKILL.md` installed in `node_modules`, so it follows the version of
  `@archi-code/criteria-adapters` you have installed.
- Each person runs the command in their own copy of the project. Do not commit it; add `.claude/skills/archi-code-criteria-adapters/` to `.gitignore`.

## License

MIT
