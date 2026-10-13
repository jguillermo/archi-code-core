# @archi-code/ephemeradb

Asynchronous in-memory store of entities with an `id`, meant for repository doubles in tests and
prototypes. All its operations return a `Promise`, like a real repository, so you can swap one for
the other without changing the code that uses it. No runtime dependencies; the package ships CJS
and ESM builds.

## Installation

```bash
npm install --save-dev @archi-code/ephemeradb
```

Use `--save-dev` if you only need it in tests. Requires Node.js 24 or later.

## Import

ESM / TypeScript:

```ts
import { EphemeraDb } from '@archi-code/ephemeradb';
```

CommonJS:

```js
const { EphemeraDb } = require('@archi-code/ephemeradb');

const db = new EphemeraDb();
db.persist({ id: '1', name: 'Ana' })
  .then(() => db.findById('1'))
  .then((user) => console.log(user)); // { id: '1', name: 'Ana' }
```

## `EphemeraDb<T extends { id: string }>`

Each instance is an independent store. The entity type must have an `id` of type `string`; with any
other `id` type TypeScript does not compile:

```ts
new EphemeraDb<{ id: number }>();
// error TS2344: Type '{ id: number; }' does not satisfy the constraint '{ id: string; }'.
```

### Save: `persist(item)`

Inserts the entity or, if another one with the same `id` already exists, replaces it in the same
position (_upsert_). Returns `Promise<void>`.

```ts
interface User {
  id: string;
  name: string;
}

const db = new EphemeraDb<User>();

await db.persist({ id: '1', name: 'Ana' });
await db.persist({ id: '2', name: 'Luis' });
await db.persist({ id: '1', name: 'Ana María' });

await db.findAll();
// [{ id: '1', name: 'Ana María' }, { id: '2', name: 'Luis' }]
```

### Find by id: `findById(id)`

Returns `Promise<T | null>`: the entity, or `null` if it does not exist.

```ts
await db.findById('1'); // { id: '1', name: 'Ana María' }
await db.findById('99'); // null
```

### List: `findAll()`

Returns `Promise<T[]>` with every entity in insertion order. The array is a copy: adding or removing
elements from it does not change the store.

```ts
const all = await db.findAll();
all.pop();
(await db.findAll()).length; // 2
```

### Delete: `remove(id)`

Returns `Promise<boolean>`: `true` if there was an entity with that `id` and it was deleted, `false`
if it did not exist.

```ts
await db.remove('2'); // true
await db.remove('2'); // false
```

### Empty: `clear()`

Deletes every entity. Returns `Promise<void>`.

```ts
await db.clear();
await db.findAll(); // []
```

## References, not copies

The store keeps the references it receives and `findById`/`findAll` return those same objects. If
you modify an object after saving it, the store sees the change:

```ts
const user = { id: 'r', name: 'Eva' };
await db.persist(user);
user.name = 'changed';

await db.findById('r'); // { id: 'r', name: 'changed' }
```

If you need isolation (for example, to check that your code calls `persist`), store and return
copies in your repository (`structuredClone(item)`).

## Example: in-memory repository

```ts
interface UserRepository {
  save(user: User): Promise<void>;
  byId(id: string): Promise<User | null>;
}

class InMemoryUserRepository implements UserRepository {
  private readonly db = new EphemeraDb<User>();

  save(user: User): Promise<void> {
    return this.db.persist(user);
  }

  byId(id: string): Promise<User | null> {
    return this.db.findById(id);
  }
}

const repository = new InMemoryUserRepository();
await repository.save({ id: 'x', name: 'X' });
await repository.byId('x'); // { id: 'x', name: 'X' }
```

Create a new instance (or call `clear()`) in each test so they do not share data.

## Errors

No operation throws or rejects: finding or deleting an `id` that does not exist returns `null` /
`false`.

## Exports summary

| Export       | Type  | Methods                                                                                                                                                 |
| ------------ | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EphemeraDb` | class | `persist(item): Promise<void>`, `findById(id): Promise<T \| null>`, `findAll(): Promise<T[]>`, `remove(id): Promise<boolean>`, `clear(): Promise<void>` |

## AI assistant skill

The package ships `SKILL.md`, a Claude Code skill with the rules, the recommended patterns and the
common mistakes. For the full API it points to this README inside `node_modules`, so it stays valid
when you update the package. To install it in your project:

```bash
mkdir -p .claude/skills/archi-code-ephemeradb && cp node_modules/@archi-code/ephemeradb/SKILL.md .claude/skills/archi-code-ephemeradb/SKILL.md
```

### How to use

Invoke it with a request:

```text
/archi-code-ephemeradb create an InMemoryOrderRepository for the tests of the CreateOrder use case
```

Or ask for the task without naming it and Claude loads it on its own because it matches its
description:

```text
Replace the MongoDB repository with an in-memory one in the integration tests
```

It also works to review code that already uses the package:

```text
/archi-code-ephemeradb review the tests and keep them from sharing state with each other
```

With the skill loaded, Claude follows its rules, avoids the mistakes in its "What not to do" list
and, before using anything the skill does not show, reads this README in `node_modules`.

### Keeping it up to date

- The copy does not update itself: after updating `@archi-code/ephemeradb`, run the command above
  again.
- Commit `.claude/skills/archi-code-ephemeradb/` to the repository so the whole team uses it.

## License

MIT
