# Criteria

Part of the `archi-code-ddd` skill: read it only when that skill routes here.

Typed, immutable search criteria over the aggregates of this package, exported by
`@archi-code/ddd/domain`: fields are the value objects of the aggregate and values are value
objects. The adapters of `@archi-code/criteria-adapters` (`/memory`, `/mongodb`, `/indexeddb`)
run them; the README section "Criteria: searching aggregates" has the whole API.

```ts
import { CreatedAt, Criteria, CriteriaError, defineCriteriaSchema } from '@archi-code/ddd/domain';
import type { SearchResult } from '@archi-code/ddd/domain';
```

`User`, `UserId`, `UserStatus`, `UserAge`, `UserName`, `UserTag` and `TenantId` below are the
aggregate and value objects of your own domain.

## Rules

- Type the criteria with the aggregate (`Criteria<User>`), never with its primitives nor a DTO. A
  read model with its own table is not an aggregate: filter it with the methods of its query port.
- Every value is a value object of the field's class (`status: new UserStatus('active')`,
  `age: { gte: new UserAge(18) }`, `tags: { has: new UserTag('vip') }`), never a primitive. Only the
  text of `contains`/`startsWith`/`endsWith` is a plain string; `null`, `isNull`, `isEmpty` and
  `mode` take plain values. A value object that holds no value means `null`.
- Fields are typed paths to the value objects of the aggregate (`'address.city'` through a
  composite); each kind of value object only accepts its operators. Fix a type error by changing
  the search, never with `as never`/`as any`.
- `where` keys are joined with AND; use `OR`, `AND`, `NOT` for the rest. `undefined` values are
  ignored, so optional input can be passed directly.
- A schema declares each field with its value object class (`age: UserAge`), so request input is
  converted and validated by the same value objects as the domain. Input from a request (body,
  query, URL text) always goes through it: `schema.parse(input)` or `schema.fromUrl(text)`. Map
  `CriteriaError` to HTTP 400: input from outside only ever throws `CriteriaError`.
- Every schema sets `maxLimit` (required). Tighten `maxOffset` and `limits` to what the endpoint
  really needs instead of raising them.
- Dates from a request are ISO text with a zone (`'2024-01-01T10:00Z'`) or a plain ISO date (UTC
  midnight); milliseconds only as a JSON number, never as text.
- A criteria is immutable: `and`, `orderBy`, `paginate` and `page` return a new one.
- The repository port or query port receives a `Criteria<A>`; the domain and the application never
  import a database adapter.

## Recommended patterns

A query port of the application and its HTTP handler:

```ts
interface UserSearch {
  search(criteria: Criteria<User>, options?: { withTotal?: boolean }): Promise<SearchResult<User>>;
}

const userSchema = defineCriteriaSchema<User>({
  fields: {
    id: UserId,
    status: UserStatus,
    age: UserAge,
    createdAt: CreatedAt,
    name: { type: UserName, operators: ['contains'] },
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
const criteria = Criteria.create<User>({
  where: { status: new UserStatus('active'), age: { gte: new UserAge(18) } },
  orderBy: { createdAt: 'desc' },
}).page(2, 20);
fetch(`/users?q=${criteria.toUrl()}`);
```

Narrowing a criteria in the application layer (for example, by tenant):

```ts
const scoped = criteria.and({ tenantId: new TenantId(currentTenant) });
```

## What not to do

- Do not pass primitives as values (`status: 'active'`) nor cast them: build the value object; a
  primitive throws `INVALID_VALUE` at run time.
- Do not declare schema fields with type names (`'number'`): give the value object class. A
  `JsonType` or a composite cannot be a schema field.
- Do not build `FilterNode` objects by hand in application code: use `Criteria.create`.
- Do not trust `Criteria.fromUrl(text)` without a schema for input from outside: it only checks the
  shape, any field could be filtered and no value object checks the values.
- Do not write `%` or regular expressions in `contains`: the text is literal.
- Do not use `eq: undefined` to search for null: `undefined` is ignored; use `null` or
  `isNull: true`.
- Do not rely on the order of ties: give the schema a `tiebreaker` (`'id'`), or add `{ id: 'asc' }`
  last in code.
- Do not compare criteria with `toUrl()`: use `equals`, which ignores the order of the conditions.
- Do not paginate without `limit` on large collections.
- Do not invent operators or options (there is no `like`, `regex`, `groupBy` or cursor
  pagination): check the installed README.
