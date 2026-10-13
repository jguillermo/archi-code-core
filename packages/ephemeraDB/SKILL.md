---
name: archi-code-ephemeradb
description: Asynchronous in-memory store of entities with a string id (EphemeraDb) from @archi-code/ephemeradb, for fake repositories in tests and prototypes. Use it whenever the code imports @archi-code/ephemeradb, when using EphemeraDb, writing an in-memory repository or a repository double/fake for tests, or replacing a real database with an in-memory one.
---

# archi-code-ephemeradb

The `EphemeraDb` class, an in-memory store with an asynchronous API for fake repositories in tests
and prototypes. It is usually installed as a development dependency.

## Full API

Before using a method, option or type that does not appear in this skill, read
`node_modules/@archi-code/ephemeradb/README.md`: it matches the installed version. Do not guess
signatures or options. If the package is not installed: `npm install @archi-code/ephemeradb`.

If that path does not exist (monorepo with workspaces, pnpm…), locate the package with
`node -p "require.resolve('@archi-code/ephemeradb/package.json')"` and read the `README.md` in that
folder.

## Related skills

If they are installed in the project, use them together with this one:

- `archi-code-domain`: aggregates the repository stores (it stores their primitives).
- `archi-code-test`: compare the stored data with `JsonCompare`.

## Import

```ts
import { EphemeraDb } from '@archi-code/ephemeradb';
```

CJS: `const { EphemeraDb } = require('@archi-code/ephemeradb');`

There is no default export and no subpaths.

## Rules

- `EphemeraDb<T extends { id: string }>`: constructor without arguments; each instance has its own
  data.
- `persist` is an upsert: it replaces the entity with the same `id` in its same position.
- No operation throws or rejects.

## Recommended patterns

In-memory repository that implements the domain port:

```ts
class InMemoryUserRepository implements UserRepository {
  private readonly db = new EphemeraDb<User>();

  save(user: User): Promise<void> {
    return this.db.persist(user);
  }

  byId(id: string): Promise<User | null> {
    return this.db.findById(id);
  }
}
```

In tests, a new instance per test (`beforeEach`) or `await db.clear()`, so they do not share state.
Always `await` each call.

If the entity does not have a plain string `id` (for example an aggregate with a value object),
store a DTO/primitives `{ id: string; ... }` and rebuild the entity when reading.

## What not to do

- `T` must have `id: string`; `{ id: number }` or no `id` does not compile. There is no id
  generation: the caller sets the `id`.
- It stores references, not copies: mutating an object after `persist` changes what is stored, and
  `findById` returns the same object. If the test needs isolation, use `structuredClone(item)` when
  saving and when reading in your repository.
- `findAll()` returns a copy of the array (not of the objects), in insertion order.
- Do not assume `find(predicate)`, `findBy`, `update`, `delete`, `count`, `save`, `get`, `set`,
  `has`, TTL or disk persistence: check the installed README. To filter:
  `(await db.findAll()).filter(...)`.
- `findById` returns `null`, not `undefined`. `remove` of an id that does not exist returns `false`,
  it does not throw.
- The methods are asynchronous: without `await` you get a `Promise`, not the value.
- Do not use it as a production database: it is process memory and is lost when the process ends.
