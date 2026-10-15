---
name: archi-code-criteria-indexeddb
description: Runs @archi-code/criteria searches on IndexedDB object stores in the browser with searchIndexedDb (uses key paths and indexes for ranges, same results as the other criteria adapters). Use it whenever the code imports @archi-code/criteria-indexeddb, or a browser/offline repository on IndexedDB has to search with a Criteria.
---

# archi-code-criteria-indexeddb

Searches an IndexedDB object store with a `Criteria<T>`, using indexes when a condition allows it
and returning the same results as every other criteria adapter.

## Full API

Before using anything this skill does not show, read
`node_modules/@archi-code/criteria-indexeddb/README.md`: it matches the installed version. Do not
guess signatures or options. If the package is not installed:
`npm install @archi-code/criteria @archi-code/criteria-indexeddb`.

If that path does not exist (workspaces, pnpm…), locate the package with
`node -p "require.resolve('@archi-code/criteria-indexeddb/package.json')"` and read the `README.md`
in that folder.

## Related skills

- `archi-code-criteria`: builds criteria and URL texts the server and the browser share.
- `archi-code-criteria-memory`: the reference semantics this adapter reuses.

## Import

```ts
import type { Criteria, SearchOptions, SearchResult } from '@archi-code/criteria';
import { searchIndexedDb } from '@archi-code/criteria-indexeddb';
```

## Rules

- Store the primitive shape of the entity as is; criteria fields are the record's property paths.
- Open a `readonly` transaction per search and pass its object store; do not await unrelated work
  in between, or the transaction closes.
- Create indexes (single string key path, not `multiEntry`) on the fields filtered by equality or
  ranges; everything else is filtered in memory after the cursor.
- Sorting by one indexed field together with a range on it reads only the page; other orders read
  every match and sort in memory.

## Recommended patterns

```ts
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

- Do not store booleans or `null` in fields you expect an index to speed up: they are not valid
  IndexedDB keys.
- Do not expect `contains`, insensitive text, `OR` or `in` to use an index.
- Do not reuse a store from a finished transaction.
- Do not load the package as a raw `<script type="module">` without an import map or a bundler: it
  imports `@archi-code/criteria` by name.
