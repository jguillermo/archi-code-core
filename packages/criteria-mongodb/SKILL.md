---
name: archi-code-criteria-mongodb
description: Runs @archi-code/criteria searches on MongoDB with searchMongo and MongoCriteriaTranslator (filter/sort/skip/limit, field maps such as id → _id, totals). Use it whenever the code imports @archi-code/criteria-mongodb or a MongoDB repository has to search with a Criteria.
---

# archi-code-criteria-mongodb

Translates a `Criteria<T>` into a MongoDB query and runs it on a collection, with the same results
as every other criteria adapter.

## Full API

Before using anything this skill does not show, read
`node_modules/@archi-code/criteria-mongodb/README.md`: it matches the installed version. Do not
guess signatures or options. If the package is not installed:
`npm install @archi-code/criteria @archi-code/criteria-mongodb mongodb`.

If that path does not exist (workspaces, pnpm…), locate the package with
`node -p "require.resolve('@archi-code/criteria-mongodb/package.json')"` and read the `README.md` in
that folder.

## Related skills

- `archi-code-criteria`: builds criteria, schemas for request input and the contract.
- `archi-code-criteria-memory`: the in-memory repository with the same port, for tests.
- `archi-code-domain`: aggregates whose primitives are stored.

## Import

```ts
import type { Criteria, SearchOptions, SearchResult } from '@archi-code/criteria';
import { searchMongo } from '@archi-code/criteria-mongodb';
import type { Collection } from 'mongodb';
```

## Rules

- The repository receives a `Criteria<T>` and calls `searchMongo`; no hand-written Mongo filters for
  searches.
- Name entity fields in the criteria; storage names (`_id`, `addr.city`) go only in `fields`.
- When the id is stored in `_id`, pass `fields: { id: '_id' }` and a `map` that turns `_id` back
  into `id`.
- `_id` is left out of the results unless a field maps to it.
- Ask for `withTotal: true` only when the total is shown: it runs a second count query.

## Recommended patterns

```ts
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
```

## What not to do

- Do not set a collation on the collection or the queries: strings must compare in binary order to
  match the other adapters.
- Do not build `$regex` from user text: use `contains`/`startsWith`/`endsWith`, which escape it.
- Do not pass `limit: 0` to mean "no limit": leave `limit` out of the criteria.
- Do not translate `criteria.filter` by hand or with `instanceof`: use `MongoCriteriaTranslator`.
