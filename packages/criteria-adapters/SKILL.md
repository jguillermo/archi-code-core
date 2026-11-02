---
name: archi-code-criteria-adapters
description: Turns @archi-code/criteria searches into what a storage engine runs with @archi-code/criteria-adapters, one entry point per engine - /memory (searchMemory, matches; runs on arrays, reference semantics), /mongodb (MongoCriteriaTranslator, a native MongoDB query) and /indexeddb (toIndexedDbQuery, the native reads of an object store); the MongoDB and IndexedDB adapters never touch the database. Use it whenever the code imports @archi-code/criteria-adapters, when a repository implements search(criteria) on arrays, MongoDB or IndexedDB, or when a query is filtered by hand next to a criteria.
---

# archi-code-criteria-adapters

Adapters for an `@archi-code/criteria` `Criteria`, each from its own entry point and with the same
results: `/memory` runs it on arrays; `/mongodb` and `/indexeddb` only convert it into the native
query of their engine, which the repository runs itself.

## Full API

Before using anything this skill does not show, read
`node_modules/@archi-code/criteria-adapters/README.md`: it matches the installed version. Do not
guess signatures or options. If the package is not installed:
`npm install @archi-code/criteria @archi-code/criteria-adapters`.

If that path does not exist (workspaces, pnpm…), locate the package with
`node -p "require.resolve('@archi-code/criteria-adapters/package.json')"` and read the `README.md`
in that folder.

## Related skills

- `archi-code-criteria`: builds the criteria, schemas for request input and URL texts.
- `archi-code-ddd`: aggregates whose primitives are stored in the repository, and the `Repository` port they implement.

## Import

```ts
import { Criteria } from '@archi-code/criteria';
import type { SearchOptions, SearchResult } from '@archi-code/criteria';
import { searchMemory } from '@archi-code/criteria-adapters/memory';
import { MongoCriteriaTranslator } from '@archi-code/criteria-adapters/mongodb';
import { readIndexes, toIndexedDbQuery } from '@archi-code/criteria-adapters/indexeddb';
```

## Rules

- Import the adapter by its entry point (`/memory`, `/mongodb`, `/indexeddb`); the package has no
  root entry.
- Store the primitive shape of the entity and search with `Criteria<UserPrimitives>`; every
  repository returns `{ items }`, plus `total` only with `{ withTotal: true }`.
- `/mongodb` and `/indexeddb` never run anything: the repository passes their query to the driver
  or the IndexedDB API, with its own session, transaction, time limit and projection.
- The repositories of every engine implement the same port, so the application code does not change
  between them (an in-memory one for tests, MongoDB on the server, IndexedDB in the browser).
- `/memory` returns the stored objects: copy them before handing them out if callers may mutate
  them.
- `/mongodb`: name entity fields in the criteria and storage names only in `fields`; when the id is
  stored in `_id`, pass `fields: { id: '_id' }` and turn `_id` back into `id` after `find`. Run
  `countDocuments(filter)` only when the total is shown.
- `/mongodb` inside a transaction: pass `session` to `find` and `countDocuments`; give searches
  from requests a `maxTimeMS`.
- Lists are searched with list operators (`has`, `hasSome`, `hasEvery`, `isEmpty`) or `NOT`:
  scalar operators (also `ne`/`nin`) never match a field that holds a list in any adapter, and a
  path never crosses a list by name.
- `/mongodb` with an `ObjectId` (or any non-scalar) `_id`: pass `fields: { id: '_id' }`, a
  `convert` for `id` (`(id) => new ObjectId(String(id))`) and map the documents back. A converter
  that throws makes `translate` throw `CriteriaError` `INVALID_VALUE` (map it to 400; the original
  error is its `cause`).
- `/indexeddb`: open a `readonly` transaction per search, build the query with
  `toIndexedDbQuery(criteria, readIndexes(store))`, open the cursor on `query.index`/`query.range`/
  `query.direction`, keep only the records `query.filter` accepts, sort with `query.compare` when it
  is not `null` and slice `offset`/`limit`. Create single-key-path indexes on fields filtered by
  equality or ranges.

## Recommended patterns

```ts
class InMemoryUserRepository implements UserRepository {
  private readonly users: UserPrimitives[] = [];

  async search(criteria: Criteria<UserPrimitives>, options?: SearchOptions) {
    return searchMemory(this.users, criteria, options);
  }
}

class MongoUserRepository implements UserRepository {
  private readonly translator = new MongoCriteriaTranslator<UserPrimitives>({
    fields: { id: '_id' },
  });

  constructor(private readonly users: Collection<{ _id: string } & Omit<UserPrimitives, 'id'>>) {}

  async search(
    criteria: Criteria<UserPrimitives>,
    options?: SearchOptions,
  ): Promise<SearchResult<UserPrimitives>> {
    const { filter, sort, skip, limit } = this.translator.translate(criteria);
    const [documents, total] = await Promise.all([
      this.users.find(filter, { sort, skip, limit }).toArray(),
      options?.withTotal ? this.users.countDocuments(filter) : undefined,
    ]);
    const items = documents.map(({ _id, ...rest }) => ({ id: _id, ...rest }));
    return total === undefined ? { items } : { items, total };
  }
}

class IndexedDbUserRepository implements UserRepository {
  constructor(private readonly database: IDBDatabase) {}

  async search(
    criteria: Criteria<UserPrimitives>,
    options?: SearchOptions,
  ): Promise<SearchResult<UserPrimitives>> {
    const store = this.database.transaction('users', 'readonly').objectStore('users');
    const query = toIndexedDbQuery(criteria, readIndexes(store));
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
    const items = matched.slice(query.offset, end);
    return options?.withTotal ? { items, total: matched.length } : { items };
  }
}
```

## What not to do

- Do not import `@archi-code/criteria-adapters` without an entry point, nor reach into its `dist/`
  files.
- Do not filter arrays or build Mongo queries by hand next to a criteria: put the condition in the
  criteria so every adapter applies it.
- Do not expect `contains` to accept regular expressions or `%`, nor build `$regex` from user text:
  text is literal and always escaped.
- Do not set a collation on a MongoDB collection or query: strings must compare in code point
  order to match the other adapters.
- Do not pass `limit: 0` to mean "no limit": leave `limit` out of the criteria.
- Do not call `find` without `session` inside `withTransaction`: it reads outside the
  transaction.
- Do not pass only `query.range` to IndexedDB and skip `query.filter` or `query.compare`: the key
  range covers one condition and the cursor order is not always the criteria order.
- Do not expect `eq: 'vip'` to match `tags: ['vip']`, `ne: 'vip'` to match it either, or
  `'lines.sku'` to match any element: use `has` and store what you search as its own field.
- Do not sort by a field that holds a list, nor store `null` inside a list you filter with
  `isNull: false` (MongoDB skips it).
- Do not sort by a list field or rely on the order of ties: add `{ id: 'asc' }` last (or use a
  schema `tiebreaker`).
- Do not store booleans or `null` in IndexedDB fields you expect an index to speed up (not valid
  keys), nor reuse a store from a finished transaction.
