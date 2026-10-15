# @archi-code/criteria-memory

Runs `@archi-code/criteria` searches over arrays in memory. It is the reference implementation of
the criteria semantics: every other adapter (MongoDB, IndexedDB) must return the same results,
which `runCriteriaContract` checks. Use it for in-memory repositories, tests and small local lists.

## Installation

```bash
npm install @archi-code/criteria @archi-code/criteria-memory
```

Requires Node.js 24 or later. The package has no side effects (`sideEffects: false`).

## Import

```ts
import { searchMemory, matches } from '@archi-code/criteria-memory';
```

CommonJS:

```js
const { searchMemory } = require('@archi-code/criteria-memory');
```

## `searchMemory(items, criteria, options?)`

Filters, sorts and paginates `items` and returns a `SearchResult<T>`. With `{ withTotal: true }`
it adds `total`, the number of matches before paginating. The input list is not changed and the
returned items are the same objects.

```ts
import { Criteria } from '@archi-code/criteria';
import { searchMemory } from '@archi-code/criteria-memory';

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

## `matches(item, criteria)` and `matchesFilter(item, filter)`

Whether one item meets the filter of a criteria (order and pagination are ignored).
`matchesFilter` takes a `FilterNode` (or `null`, which matches everything); adapters use it to
check the part of a filter their engine cannot run.

```ts
matches(users[0], Criteria.create({ where: { age: { between: [18, 65] } } })); // true
```

## `compareBy(order)` and `readPath(item, field)`

`compareBy(criteria.order)` returns a comparison function for `Array.prototype.sort` with the
criteria ordering (null and missing first in `asc`, last in `desc`). `readPath(item, 'address.city')`
reads a dotted field and gives `undefined` when a parent is missing or is not an object.

## Semantics

This package implements the rules described in the "Semantics" section of the
`@archi-code/criteria` README: missing fields are null, `ne`/`nin`/`NOT` also match null,
comparisons only between values of the same type, literal and optionally case-insensitive text
(`toLowerCase`), binary string order, `isEmpty` only on lists, and nulls first when ascending. It
passes every case of `runCriteriaContract`.

## Exports summary

| Export          | Use                                                 |
| --------------- | --------------------------------------------------- |
| `searchMemory`  | Filter, sort and paginate an array → `SearchResult` |
| `matches`       | Whether an item meets a criteria                    |
| `matchesFilter` | Whether an item meets a `FilterNode` (or `null`)    |
| `compareBy`     | Sort function for a criteria order                  |
| `readPath`      | Reads a dotted field                                |

## AI assistant skill

The package ships `SKILL.md`, a Claude Code skill with the rules, recommended patterns and common
mistakes. For the full API it points to this README inside `node_modules`, so it stays valid when
the package is updated. To install it in your project:

```bash
mkdir -p .claude/skills/archi-code-criteria-memory && cp node_modules/@archi-code/criteria-memory/SKILL.md .claude/skills/archi-code-criteria-memory/SKILL.md
```

### How to use

Invoke it with a request:

```text
/archi-code-criteria-memory write an in-memory UserRepository with search(criteria)
```

Or ask for the task without naming it and Claude loads it on its own because it matches its
description:

```text
Add an in-memory implementation of the orders repository for the tests
```

It also reviews code that already uses the package:

```text
/archi-code-criteria-memory review the in-memory repositories and replace hand-written filters
```

With the skill loaded, Claude follows its rules, avoids the mistakes in its "What not to do" list
and, before using anything the skill does not show, reads this README in `node_modules`.

### Keeping it up to date

- The copy does not update itself: after updating `@archi-code/criteria-memory`, run the command
  above again.
- Commit `.claude/skills/archi-code-criteria-memory/` so the whole team uses it.

## License

MIT
