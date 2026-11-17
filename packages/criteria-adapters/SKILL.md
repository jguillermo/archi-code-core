---
name: archi-code-criteria-adapters
description: Turns the Criteria searches of @archi-code/ddd/domain into what a storage engine runs with @archi-code/criteria-adapters, one entry point per engine - /memory (searchMemory, matches; runs on arrays, reference semantics), /mongodb (MongoCriteriaTranslator, a native MongoDB query) and /indexeddb (toIndexedDbQuery, the native reads of an object store); the MongoDB and IndexedDB adapters never touch the database. Use it whenever the code imports @archi-code/criteria-adapters, when a repository implements search(criteria) on arrays, MongoDB or IndexedDB, or when a query is filtered by hand next to a criteria.
---

# archi-code-criteria-adapters

Adapters for a `Criteria` of `@archi-code/ddd/domain`, each from its own entry point and with the same
results: `/memory` runs it on arrays; `/mongodb` and `/indexeddb` only convert it into the native
query of their engine, which the repository runs itself.

## Full API

Before using anything this skill does not show, read
`node_modules/@archi-code/criteria-adapters/README.md`: it matches the installed version. Do not
guess signatures or options. If the package is not installed:
`npm install @archi-code/ddd @archi-code/criteria-adapters`.

If that path does not exist (workspaces, pnpm…), locate the package with
`node -p "require.resolve('@archi-code/criteria-adapters/package.json')"` and read the `README.md`
in that folder.

## Related skills

- `archi-code-ddd`: builds the `Criteria` over its aggregates (value objects as values, schemas for request input, URL texts), and the repository they implement.

## Import

```ts
import { AggregateRepository, Criteria } from '@archi-code/ddd/domain';
import type {
  AggregateSearcher,
  CriteriaDocument,
  PrimitiveTypes,
  SearchOptions,
  SearchResult,
} from '@archi-code/ddd/domain';
import { searchMemory } from '@archi-code/criteria-adapters/memory';
import { MongoCriteriaTranslator } from '@archi-code/criteria-adapters/mongodb';
import { toIndexedDbQuery } from '@archi-code/criteria-adapters/indexeddb';
import { IndexedDbDatabase, IndexedDbSchema } from '@archi-code/ddd/infrastructure';
import type { IndexedDbStored, IndexedDbTable } from '@archi-code/ddd/infrastructure';
```

## Rules

- Import the adapter by its entry point (`/memory`, `/mongodb`, `/indexeddb`); the package has no
  root entry.
- Search with `Criteria<User>` (the aggregate, values as value objects) and store its primitives
  (`toPrimitives()`, `CriteriaDocument<User>`); every repository returns aggregates in
  `{ items }`, plus `total` only with `{ withTotal: true }`. MongoDB and IndexedDB rebuild them
  with `User.fromPrimitives` after reading.
- `/memory` filters aggregates through `toPrimitives()`: its keys must be the field names (the ddd
  rule: getters named like the primitive keys).
- `/mongodb` and `/indexeddb` never run anything: the repository passes their query to the driver
  or the IndexedDB API, with its own session, transaction, time limit and projection.
- The repositories of every engine implement the same port, so the application code does not change
  between them (an in-memory one for tests, MongoDB on the server, IndexedDB in the browser).
- `/memory` returns the same aggregate objects it received.
- `/mongodb`: name aggregate fields in the criteria and storage names only in `fields`; when the id is
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
- `/indexeddb`: the repository is `IndexedDb<Aggregate>Repository extends <Aggregate>Repository`
  (the abstract repository of the domain, with `AggregateSearcher<Aggregate>` among its roles) and
  works on the table of `@archi-code/ddd/infrastructure`: its constructor receives the database
  (`<Name>Db extends IndexedDbDatabase`) and gets its table with
  `database.table(new <Aggregate>Schema())`, whose row is `PrimitiveTypes<Aggregate>`. `search` is
  one call, `this.table.find(toIndexedDbQuery(criteria, this.table.indexes))`: the table runs the
  index, key range, direction, `filter`, `compare`, `offset` and `limit` in one short transaction
  and returns `{ items, total }`. The repository only rebuilds every row with
  `<Aggregate>.fromPrimitives`, remembers its `rowVersion` (so a found aggregate can be saved) and
  returns `total` only with `{ withTotal: true }`. Declare in the schema single-field indexes on
  the fields searched by equality or ranges (`table.indexes` lists them for the planner).
  `readIndexes(store)` is only for a raw object store the project did not create with
  `IndexedDbDatabase`.

## Recommended patterns

Every engine implements the abstract repository the domain declares for the aggregate:

```ts
abstract class UserRepository extends AggregateRepository<User> implements AggregateSearcher<User> {
  abstract search(criteria: Criteria<User>, options?: SearchOptions): Promise<SearchResult<User>>;
}
```

```ts
class InMemoryUserRepository extends UserRepository {
  private readonly users = new Map<string, User>();

  async search(criteria: Criteria<User>, options?: SearchOptions): Promise<SearchResult<User>> {
    return searchMemory([...this.users.values()], criteria, options);
  }
}

class MongoUserRepository extends UserRepository {
  private readonly translator = new MongoCriteriaTranslator<User>({ fields: { id: '_id' } });

  constructor(
    private readonly users: Collection<{ _id: string } & Omit<CriteriaDocument<User>, 'id'>>,
  ) {
    super();
  }

  async search(criteria: Criteria<User>, options?: SearchOptions): Promise<SearchResult<User>> {
    const { filter, sort, skip, limit } = this.translator.translate(criteria);
    const [documents, total] = await Promise.all([
      this.users.find(filter, { sort, skip, limit }).toArray(),
      options?.withTotal ? this.users.countDocuments(filter) : undefined,
    ]);
    const items = documents.map(({ _id, ...rest }) => User.fromPrimitives({ id: _id, ...rest }));
    return total === undefined ? { items } : { items, total };
  }
}

type UserRow = PrimitiveTypes<User>;

class UserSchema extends IndexedDbSchema<UserRow> {
  constructor() {
    super({ name: 'users', indexes: { byEmail: 'email', byCreatedAt: 'createdAt' } });
  }
}

class ShopDb extends IndexedDbDatabase {
  constructor() {
    super({ name: 'shop' });
  }
}

class IndexedDbUserRepository extends UserRepository {
  private readonly table: IndexedDbTable<UserRow>;
  private readonly rowVersions = new WeakMap<User, number>();

  constructor(database: ShopDb) {
    super();
    this.table = database.table(new UserSchema());
  }

  async search(criteria: Criteria<User>, options?: SearchOptions): Promise<SearchResult<User>> {
    const page = await this.table.find(toIndexedDbQuery(criteria, this.table.indexes));
    const items = page.items.map((row) => this.load(row));
    return options?.withTotal ? { items, total: page.total } : { items };
  }

  private load(row: IndexedDbStored<UserRow>): User {
    const user = User.fromPrimitives(row);
    this.rowVersions.set(user, row.rowVersion);
    return user;
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
- Do not open `indexedDB`, an `IDBDatabase` or a cursor in an IndexedDB repository, nor sort,
  filter or slice the rows after `table.find`: pass the whole `toIndexedDbQuery` result to
  `table.find`, which applies `filter`, `compare`, `offset` and `limit` itself. Do not build the
  query with `readIndexes` on a table of `IndexedDbDatabase`: use `this.table.indexes`.
- Do not return the stored rows (they carry `rowVersion`) nor forget their `rowVersion` on load:
  return aggregates rebuilt with `fromPrimitives`, which the repository can then save.
- Do not hand `searchMemory` plain documents nor DTOs: it takes aggregates and reads their
  `toPrimitives()`.
- Do not expect `eq` to match a list field (`tags: ['vip']`), `ne` to match it either, or
  `'lines.sku'` to match any element: use `has` and store what you search as its own field.
- Do not sort by a field that holds a list, nor store `null` inside a list you filter with
  `isNull: false` (MongoDB skips it).
- Do not sort by a list field or rely on the order of ties: add `{ id: 'asc' }` last (or use a
  schema `tiebreaker`).
- Do not store booleans or `null` in IndexedDB fields you expect an index to speed up (not valid
  keys), nor reuse a store from a finished transaction.
