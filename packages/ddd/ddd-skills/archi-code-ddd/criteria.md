# Criteria

Part of the `archi-code-ddd` skill: read it only when that skill routes here.

Typed, immutable search criteria over aggregates (`@archi-code/ddd/domain`), run by the adapters of
`@archi-code/criteria-adapters` (`/memory`, `/mongodb`, `/indexeddb`). Whole API: README section
"Criteria: searching aggregates".

## Rules

- Type it with the aggregate (`Criteria<User>`), never primitives nor a DTO. A read model is
  filtered with its query port methods.
- Every value is a VO of the field's class (`status: new UserStatus('active')`); only the text of
  `contains`/`startsWith`/`endsWith` is a plain string, and `null`, `isNull`, `isEmpty`, `mode` take
  plain values. A VO holding no value means `null`; a primitive throws `INVALID_VALUE`.
- Fields are typed paths to the aggregate's VOs (`'address.city'`), each kind with only its
  operators; fix type errors by changing the search, never `as never`/`as any`.
- `where` keys are AND; use `OR`/`AND`/`NOT`. `undefined` is ignored (use `null` or `isNull: true`).
- Request input (body, query, URL) always goes through a schema (`defineCriteriaSchema`, each field
  its VO class, never a type name; no `JsonType` nor composite fields): `schema.parse(input)` or
  `schema.fromUrl(text)`; never a bare `Criteria.fromUrl` for outside input (it only checks the
  shape). Outside input only throws `CriteriaError` → 400.
- Every schema sets `maxLimit`; tighten `maxOffset` and `limits`, never raise them; give a `tiebreaker` (`'id'`) or
  add `{ id: 'asc' }` last.
- Request dates: ISO with a zone or plain ISO date; milliseconds only as a JSON number.
- Immutable: `and`, `orderBy`, `paginate`, `page` return a new one. Compare with `equals`, never
  `toUrl()`.
- Narrow in the application with `criteria.and({ tenantId: new TenantId(t) })`.
- The repository searches with `search(criteria, options?)` (`AggregateSearcher`), never a method
  per query; its adapter runs the criteria. Domain and application never import a database adapter.
- Never build `FilterNode`s by hand (`Criteria.create`); `contains` text is literal (no `%`, regex);
  paginate large collections with `limit`; no invented operators or options (`like`, `regex`,
  `groupBy`, cursor pagination): check the installed README.

## Pattern

```ts
const userSchema = defineCriteriaSchema<User>({
  fields: { id: UserId, status: UserStatus, age: UserAge, createdAt: CreatedAt,
    name: { type: UserName, operators: ['contains'] } },
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

const client = Criteria.create<User>({
  where: { status: new UserStatus('active'), age: { gte: new UserAge(18) } },
  orderBy: { createdAt: 'desc' },
}).page(2, 20);
fetch(`/users?q=${client.toUrl()}`);
```
