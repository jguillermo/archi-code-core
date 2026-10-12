# @archi-code/ephemeradb

An asynchronous in-memory store of entities with an `id`, meant for repository stubs in tests and
prototypes. No runtime dependencies; the package ships dual CJS and ESM builds.

```bash
npm install @archi-code/ephemeradb
```

## Usage

```ts
import { EphemeraDb } from '@archi-code/ephemeradb';

const db = new EphemeraDb<{ id: string; name: string }>();
await db.persist({ id: '1', name: 'a' });
await db.findById('1'); // { id: '1', name: 'a' }
await db.remove('1'); // true
await db.findById('1'); // null
```

| Method          | Returns              |
| --------------- | -------------------- |
| `persist(item)` | `Promise<void>`      |
| `findById(id)`  | `Promise<T \| null>` |
| `findAll()`     | `Promise<T[]>`       |
| `remove(id)`    | `Promise<boolean>`   |
| `clear()`       | `Promise<void>`      |

## License

MIT
