---
name: archi-code-criteria
description: Builds database-independent search criteria with @archi-code/criteria (typed where, orderBy, limit/offset), sends them through URLs with toUrl/fromUrl, validates request input with defineCriteriaSchema and writes adapters that follow the shared semantics. Use it whenever the code imports @archi-code/criteria, when a repository needs search/filter/order/pagination, when request parameters become a search, or when writing a criteria adapter.
---

# archi-code-criteria

Typed, immutable search criteria for repositories, independent of the database. The adapters of
`@archi-code/criteria-adapters` (`/memory`, `/mongodb`, `/indexeddb`) run them.

## Full API

Before using a method, option, operator or type that does not appear in this skill, read
`node_modules/@archi-code/criteria/README.md`: it matches the installed version. Do not guess
signatures or options. If the package is not installed: `npm install @archi-code/criteria`.

If that path does not exist (monorepo with workspaces, pnpm…), locate the package with
`node -p "require.resolve('@archi-code/criteria/package.json')"` and read the `README.md` in that
folder.

## Related skills

If they are installed in the project, use them together with this one:

- `archi-code-criteria-adapters`: runs criteria in memory, on MongoDB or on IndexedDB.
- `archi-code-domain`: aggregates whose primitives are the type the criteria searches on.

## Import

```ts
import { Criteria, CriteriaError, defineCriteriaSchema } from '@archi-code/criteria';
import type { SearchResult } from '@archi-code/criteria';
```

## Rules

- Type the criteria with the persisted/primitive shape of the entity (`Criteria<UserPrimitives>`),
  never with an aggregate made of value objects.
- The repository port receives a `Criteria<T>` and returns `SearchResult<T>`; the domain and the
  application never import a database adapter.
- Fields are typed paths (`'address.city'`); each field type only accepts its operators. Fix a type
  error by changing the search, never with `as never`/`as any`.
- `where` keys are joined with AND; use `OR`, `AND`, `NOT` for the rest. `undefined` values are
  ignored, so optional input can be passed directly.
- Text operators (`contains`, `startsWith`, `endsWith`) take literal text; `mode: 'insensitive'` (Unicode simple case folding)
  only applies to them.
- Input from a request (body, query, URL text) always goes through a schema:
  `schema.parse(input)` or `schema.fromUrl(text)`. Map `CriteriaError` to HTTP 400: input from
  outside only ever throws `CriteriaError`.
- Every schema sets `maxLimit` (required). Tighten `maxOffset` and `limits` (`maxListSize`,
  `maxDepth`…) to what the endpoint really needs instead of raising them.
- Dates from a request are ISO text with a zone (`'2024-01-01T10:00Z'`) or a plain ISO date (UTC
  midnight); milliseconds only as a JSON number, never as text (`'2024'` is refused).
- A criteria is immutable: `and`, `orderBy`, `paginate` and `page` return a new one.
- Adapters read `criteria.filter` by `kind` (with `visitFilter`), never with `instanceof`, and must
  return the same results as `@archi-code/criteria-adapters/memory` for the same data.

## Recommended patterns

Repository port and HTTP handler:

```ts
interface UserRepository {
  search(
    criteria: Criteria<UserPrimitives>,
    options?: { withTotal?: boolean },
  ): Promise<SearchResult<UserPrimitives>>;
}

const userSchema = defineCriteriaSchema<UserPrimitives>({
  fields: {
    id: 'string',
    status: 'string',
    age: 'number',
    createdAt: 'date',
    name: { type: 'string', operators: ['contains'] },
  },
  defaultLimit: 20,
  maxLimit: 100,
  tiebreaker: 'id',
});

async function searchUsers(query: { q?: string }) {
  try {
    const criteria = query.q ? userSchema.fromUrl(query.q) : userSchema.parse({});
    return await users.search(criteria, { withTotal: true });
  } catch (error) {
    if (error instanceof CriteriaError) throw new BadRequest(error.code, error.message);
    throw error;
  }
}
```

Client side, sending a search through the URL:

```ts
const criteria = Criteria.create<UserPrimitives>({
  where: { status: 'active', age: { gte: 18 } },
  orderBy: { createdAt: 'desc' },
}).page(2, 20);
fetch(`/users?q=${criteria.toUrl()}`);
```

Narrowing a criteria in the application layer (for example, by tenant):

```ts
const scoped = criteria.and({ tenantId: currentTenant });
```

## What not to do

- Do not build `FilterNode` objects by hand in application code: use `Criteria.create`.
- Do not trust `Criteria.fromUrl(text)` without a schema for input from outside: it only checks the
  shape, any field could be filtered.
- Do not write `%` or regular expressions in `contains`: the text is literal.
- Do not use `eq: undefined` to search for null: `undefined` is ignored; use `null` or
  `isNull: true`.
- Do not expect `isEmpty: true` to match a missing list, nor `gt`/`lt` to match null.
- Do not rely on the order of ties: give the schema a `tiebreaker` (`'id'`), or add `{ id: 'asc' }`
  last in code.
- Do not compare criteria with `toUrl()`: use `equals`, which ignores the order of the conditions.
- Do not filter with an empty `contains`/`startsWith`/`endsWith` to mean "any": leave the condition
  `undefined` instead.
- Do not paginate without `limit` on large collections: without `limit` every match is returned
  (schemas always set one through `maxLimit`/`defaultLimit`).
- Do not send local times without a zone (`'2024-01-01T10:00'`) nor free text dates: the schema
  rejects them.
- Do not raise `limits` or `maxOffset` to make a client request pass: change the request (page with
  a filter, fewer values).
- Do not invent operators, adapters or options (there is no `like`, `regex`, `groupBy` or cursor
  pagination): check the installed README.
