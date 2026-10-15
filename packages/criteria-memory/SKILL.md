---
name: archi-code-criteria-memory
description: Runs @archi-code/criteria searches over in-memory arrays with searchMemory and matches (the reference semantics every criteria adapter follows). Use it whenever the code imports @archi-code/criteria-memory, when writing an in-memory or test repository with search(criteria), or when an adapter needs to filter in memory what its engine cannot.
---

# archi-code-criteria-memory

Filters, sorts and paginates arrays with an `@archi-code/criteria` `Criteria`. Its results are the
reference every other criteria adapter must match.

## Full API

Before using anything this skill does not show, read
`node_modules/@archi-code/criteria-memory/README.md`: it matches the installed version. Do not
guess signatures or options. If the package is not installed:
`npm install @archi-code/criteria @archi-code/criteria-memory`.

If that path does not exist (workspaces, pnpm…), locate the package with
`node -p "require.resolve('@archi-code/criteria-memory/package.json')"` and read the `README.md` in
that folder.

## Related skills

- `archi-code-criteria`: builds the criteria, schemas and the contract.
- `archi-code-domain`: aggregates whose primitives are stored in the repository.

## Import

```ts
import { Criteria } from '@archi-code/criteria';
import type { SearchOptions } from '@archi-code/criteria';
import { searchMemory } from '@archi-code/criteria-memory';
```

## Rules

- Store the primitive shape of the entity (`UserPrimitives`) and search with
  `Criteria<UserPrimitives>`.
- `searchMemory` returns `{ items }`, plus `total` only with `{ withTotal: true }`.
- Returned items are the stored objects: copy them before handing them out if callers may mutate
  them.
- The in-memory repository implements the same port as the database one, so the application code
  does not change between them.

## Recommended patterns

```ts
class InMemoryUserRepository implements UserRepository {
  private readonly users: UserPrimitives[] = [];

  async save(user: UserPrimitives): Promise<void> {
    this.users.push(user);
  }

  async search(criteria: Criteria<UserPrimitives>, options?: SearchOptions) {
    return searchMemory(this.users, criteria, options);
  }
}
```

## What not to do

- Do not filter arrays by hand next to a criteria (`items.filter(...)`): put the condition in the
  criteria so every adapter applies it.
- Do not expect `contains` to accept regular expressions or `%`: text is literal.
- Do not sort by a list field or expect a stable order of ties: add `{ id: 'asc' }` last.
