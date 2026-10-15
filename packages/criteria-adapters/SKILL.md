---
name: archi-code-criteria-adapters
description: Runs @archi-code/criteria searches on a storage engine with @archi-code/criteria-adapters, one entry point per engine - /memory (searchMemory, matches; reference semantics), /mongodb (searchMongo, MongoCriteriaTranslator) and /indexeddb (searchIndexedDb). Use it whenever the code imports @archi-code/criteria-adapters, when a repository implements search(criteria) on arrays, MongoDB or IndexedDB, or when a query is filtered by hand next to a criteria.
---

# archi-code-criteria-adapters

Adapters that run an `@archi-code/criteria` `Criteria` on arrays in memory, MongoDB or IndexedDB,
each from its own entry point and with the same results.

## Full API

Before using anything this skill does not show, read
`node_modules/@archi-code/criteria-adapters/README.md`: it matches the installed version. Do not
guess signatures or options. If the package is not installed:
`npm install @archi-code/criteria @archi-code/criteria-adapters` (and `mongodb` for `/mongodb`).

If that path does not exist (workspaces, pnpm…), locate the package with
`node -p "require.resolve('@archi-code/criteria-adapters/package.json')"` and read the `README.md`
in that folder.

## Related skills

- `archi-code-criteria`: builds the criteria, schemas for request input and URL texts.
- `archi-code-domain`: aggregates whose primitives are stored in the repository.

## Import

```ts
import { Criteria } from '@archi-code/criteria';
import type { SearchOptions, SearchResult } from '@archi-code/criteria';
import { searchMemory } from '@archi-code/criteria-adapters/memory';
import { searchMongo } from '@archi-code/criteria-adapters/mongodb';
import { searchIndexedDb } from '@archi-code/criteria-adapters/indexeddb';
```

## Rules

- Import the adapter by its entry point (`/memory`, `/mongodb`, `/indexeddb`); the package has no
  root entry.
- Store the primitive shape of the entity and search with `Criteria<UserPrimitives>`; every adapter
  returns `{ items }`, plus `total` only with `{ withTotal: true }`.
- The repositories of every engine implement the same port, so the application code does not change
  between them (an in-memory one for tests, MongoDB on the server, IndexedDB in the browser).
- `/memory` returns the stored objects: copy them before handing them out if callers may mutate
  them.
- `/mongodb`: name entity fields in the criteria and storage names only in `fields`; when the id is
  stored in `_id`, pass `fields: { id: '_id' }` and a `map` that turns `_id` back into `id`. Ask for
  `withTotal` only when the total is shown: it runs a second count query.
- `/mongodb` inside a transaction: always pass `session`; give searches from requests a
  `maxTimeMS`.
- Lists are searched with list operators (`has`, `hasSome`, `hasEvery`, `isEmpty`) or `NOT`:
  scalar operators (also `ne`/`nin`) never match a field that holds a list in any adapter, and a
  path never crosses a list by name.
- `/mongodb` with an `ObjectId` (or any non-scalar) `_id`: pass `fields: { id: '_id' }`, a
  `convert` for `id` (`(id) => new ObjectId(String(id))`) and a `map` back. A converter that throws
  makes the search reject with `CriteriaError` `INVALID_VALUE` (map it to 400; the original error is
  its `cause`).
- `/indexeddb`: open a `readonly` transaction per search and pass its object store, without awaiting
  unrelated work in between. Create single-key-path indexes on fields filtered by equality or
  ranges; the rest is filtered in memory after the cursor.

## Recommended patterns

```ts
class InMemoryUserRepository implements UserRepository {
  private readonly users: UserPrimitives[] = [];

  async search(criteria: Criteria<UserPrimitives>, options?: SearchOptions) {
    return searchMemory(this.users, criteria, options);
  }
}

class MongoUserRepository implements UserRepository {
  constructor(private readonly users: Collection<{ _id: string } & Omit<UserPrimitives, 'id'>>) {}

  search(
    criteria: Criteria<UserPrimitives>,
    options?: SearchOptions,
  ): Promise<SearchResult<UserPrimitives>> {
    return searchMongo(this.users, criteria, {
      ...options,
      fields: { id: '_id' },
      map: ({ _id, ...rest }) => ({ id: _id, ...rest }),
    });
  }
}

class IndexedDbUserRepository implements UserRepository {
  constructor(private readonly database: IDBDatabase) {}

  search(
    criteria: Criteria<UserPrimitives>,
    options?: SearchOptions,
  ): Promise<SearchResult<UserPrimitives>> {
    const store = this.database.transaction('users', 'readonly').objectStore('users');
    return searchIndexedDb(store, criteria, options);
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
- Do not call `searchMongo` without `session` inside `withTransaction`: it reads outside the
  transaction.
- Do not expect `eq: 'vip'` to match `tags: ['vip']`, `ne: 'vip'` to match it either, or
  `'lines.sku'` to match any element: use `has` and store what you search as its own field.
- Do not sort by a field that holds a list, nor store `null` inside a list you filter with
  `isNull: false` (MongoDB skips it).
- Do not sort by a list field or rely on the order of ties: add `{ id: 'asc' }` last (or use a
  schema `tiebreaker`).
- Do not store booleans or `null` in IndexedDB fields you expect an index to speed up (not valid
  keys), nor reuse a store from a finished transaction.
