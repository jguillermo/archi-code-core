# @archi-code/criteria-indexeddb

Runs `@archi-code/criteria` searches on an IndexedDB object store in the browser. It uses the
store's key and indexes to read fewer records when the filter allows it, checks every record
against the whole filter with `@archi-code/criteria-memory`, and returns the same results as every
other criteria adapter (checked with `runCriteriaContract`).

## Installation

```bash
npm install @archi-code/criteria @archi-code/criteria-indexeddb
```

Use it from a bundler (Vite, webpack, esbuild…): the package imports `@archi-code/criteria` and
`@archi-code/criteria-memory` by name. It has no side effects (`sideEffects: false`). Outside a
browser it needs a global `indexedDB`/`IDBKeyRange`, for example from `fake-indexeddb/auto` in tests.

## Import

```ts
import { searchIndexedDb } from '@archi-code/criteria-indexeddb';
```

## `searchIndexedDb(store, criteria, options?)`

Searches the object store you pass (from a transaction you open) and returns a
`SearchResult<T>`: `{ items }`, plus `total` (every match before paginating) with
`{ withTotal: true }`. Records are returned as stored.

```ts
import { Criteria } from '@archi-code/criteria';
import { searchIndexedDb } from '@archi-code/criteria-indexeddb';

const store = database.transaction('users', 'readonly').objectStore('users');

const result = await searchIndexedDb(
  store,
  Criteria.create<UserPrimitives>({
    where: { age: { gte: 18 }, status: 'active' },
    orderBy: { age: 'desc' },
    limit: 20,
  }),
  { withTotal: true },
);
```

Store the primitive shape of the entity as is: the criteria fields are the record's properties
(nested ones with dots, like the index key paths).

## How it uses indexes

`planIndexedDbQuery(criteria, readIndexes(store))` decides how to read; `searchIndexedDb` calls it
for you:

1. Among the conditions every match must meet (the top level and nested `AND`), it picks one on a
   field that is the store key path or the key path of an index: equality first, then `between` or a
   case-sensitive `startsWith`, then `gt`/`gte`/`lt`/`lte`. That condition becomes the
   `IDBKeyRange` of the cursor.
2. When the criteria sorts by that same field only, the cursor walks the index in that direction
   and stops as soon as the page is full (unless `withTotal`). With no filter range it can also walk
   the store by its key path. Otherwise matches are sorted in memory.
3. Every record the cursor returns is checked against the whole filter, so `OR`, `NOT`, insensitive
   text and any other condition keep the same semantics as the other adapters.

| Uses an index                   | Never uses an index                                                 |
| ------------------------------- | ------------------------------------------------------------------- |
| `eq` on string, number, `Date`  | `ne`, `in`, `nin`, `OR`, `NOT`, `contains`, `endsWith`              |
| `gt` `gte` `lt` `lte` `between` | insensitive text, booleans and `null` (not valid IndexedDB keys)    |
| case-sensitive `startsWith`     | lists (`has`…), compound (array) key paths and `multiEntry` indexes |

A secondary index is never walked only to sort, because records whose field is null or missing
are not in it and must come first. Create indexes on the fields you filter by equality or ranges
most often.

`readIndexes(store)` lists the usable indexes as `{ name, keyPath }` (`name: null` is the store key
path).

## Exports summary

| Export                                   | Kind     | Use                                                     |
| ---------------------------------------- | -------- | ------------------------------------------------------- |
| `searchIndexedDb`                        | function | Runs a criteria on an object store → `SearchResult`     |
| `planIndexedDbQuery`                     | function | Chooses index, key range, direction and whether to sort |
| `readIndexes`                            | function | Usable key paths of a store                             |
| `IndexedDbPlan`                          | type     | `{ index, bounds, direction, presorted }`               |
| `IndexInfo`, `KeyBounds`, `IndexedDbKey` | type     | Plan details                                            |

## AI assistant skill

The package ships `SKILL.md`, a Claude Code skill with the rules, recommended patterns and common
mistakes. For the full API it points to this README inside `node_modules`, so it stays valid when
the package is updated. To install it in your project:

```bash
mkdir -p .claude/skills/archi-code-criteria-indexeddb && cp node_modules/@archi-code/criteria-indexeddb/SKILL.md .claude/skills/archi-code-criteria-indexeddb/SKILL.md
```

### How to use

Invoke it with a request:

```text
/archi-code-criteria-indexeddb write an offline UserRepository on IndexedDB with search(criteria)
```

Or ask for the task without naming it and Claude loads it on its own because it matches its
description:

```text
Let the browser app search the cached orders with the same criteria as the API
```

It also reviews code that already uses the package:

```text
/archi-code-criteria-indexeddb review the IndexedDB stores and suggest the indexes the searches need
```

With the skill loaded, Claude follows its rules, avoids the mistakes in its "What not to do" list
and, before using anything the skill does not show, reads this README in `node_modules`.

### Keeping it up to date

- The copy does not update itself: after updating `@archi-code/criteria-indexeddb`, run the command
  above again.
- Commit `.claude/skills/archi-code-criteria-indexeddb/` so the whole team uses it.

## License

MIT
