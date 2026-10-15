# @archi-code/criteria-mongodb

Runs `@archi-code/criteria` searches on MongoDB. `MongoCriteriaTranslator` turns a `Criteria<T>`
into a plain `{ filter, sort, skip, limit }` query and `searchMongo` runs it on a collection. The
results follow the same semantics as every other criteria adapter (checked with
`runCriteriaContract` against a real MongoDB).

## Installation

```bash
npm install @archi-code/criteria @archi-code/criteria-mongodb mongodb
```

Requires Node.js 24 or later. The package does not import the MongoDB driver: `mongodb` (6 or
later) is an optional peer dependency, and `searchMongo` takes any object with the driver's
`find(filter, options).toArray()` and `countDocuments(filter)`. The translator works without the
driver.

## Import

```ts
import { MongoCriteriaTranslator, searchMongo } from '@archi-code/criteria-mongodb';
```

CommonJS:

```js
const { searchMongo } = require('@archi-code/criteria-mongodb');
```

## `searchMongo(collection, criteria, options?)`

Translates the criteria, calls `collection.find(filter, { sort, skip, limit, projection })` and,
with `withTotal: true`, `collection.countDocuments(filter)` at the same time. Returns a
`SearchResult<T>` (`{ items, total? }`).

```ts
import { Criteria } from '@archi-code/criteria';
import { searchMongo } from '@archi-code/criteria-mongodb';
import { MongoClient } from 'mongodb';

const users = client.db('app').collection<UserPrimitives>('users');

const result = await searchMongo(
  users,
  Criteria.create<UserPrimitives>({
    where: { status: 'active', age: { gte: 18 } },
    orderBy: { createdAt: 'desc' },
    limit: 20,
  }),
  { withTotal: true },
);
// { items: [...], total: 42 }
```

Options:

| Option       | Default                                          | Use                                        |
| ------------ | ------------------------------------------------ | ------------------------------------------ |
| `fields`     | none                                             | `FieldMap<T>`: entity field → stored field |
| `withTotal`  | `false`                                          | Also count every match before paginating   |
| `projection` | `{ _id: 0 }`, or `{}` when a field maps to `_id` | Projection passed to `find`                |
| `map`        | the document as is                               | Turns each stored document into `T`        |

`_id` is left out of the results unless a field is stored in it. When the entity id lives in
`_id`, map it in both directions:

```ts
const result = await searchMongo<User, { _id: string; age: number }>(
  collection,
  Criteria.create<User>({ where: { age: { gte: 18 } }, orderBy: { id: 'asc' } }),
  { fields: { id: '_id' }, map: ({ _id, age }) => ({ id: _id, age }) },
);
// { items: [{ id: 'a', age: 30 }] }
```

## `MongoCriteriaTranslator`

`new MongoCriteriaTranslator<T>({ fields? }).translate(criteria)` returns a `MongoQuery`
(`limit` only when the criteria has one; it is never `0`):

```ts
new MongoCriteriaTranslator<User>({ fields: { id: '_id' } }).translate(
  Criteria.create<User>({
    where: { id: 'a', name: { startsWith: 'a.b', mode: 'insensitive' } },
    orderBy: { id: 'desc' },
    limit: 5,
  }),
);
// {
//   filter: { $and: [{ _id: { $eq: 'a' } }, { name: { $regex: '^a\\.b', $options: 'i' } }] },
//   sort: { _id: -1 },
//   skip: 0,
//   limit: 5,
// }
```

`translateFilter(criteria.filter)` translates only the filter (`{}` for `null`), for example to
use it in an aggregation `$match`.

| Criteria                               | MongoDB                                                                             |
| -------------------------------------- | ----------------------------------------------------------------------------------- |
| `eq` `ne` `gt` `gte` `lt` `lte`        | `$eq` `$ne` `$gt` `$gte` `$lt` `$lte`                                               |
| `between: [a, b]`                      | `{ $gte: a, $lte: b }`                                                              |
| `in` / `nin`                           | `$in` / `$nin`                                                                      |
| `contains` / `startsWith` / `endsWith` | `$regex` with the text escaped (`x`, `^x`, `x\z`), `$options: 'i'` when insensitive |
| `isNull: true` / `false`               | `{ $eq: null }` / `{ $ne: null }`                                                   |
| `has` / `hasSome`                      | `{ $type: 'array', $in: [...] }`                                                    |
| `hasEvery`                             | `{ $type: 'array', $all: [...] }`                                                   |
| `isEmpty: true` / `false`              | `{ $size: 0 }` / `{ $type: 'array', $not: { $size: 0 } }`                           |
| `AND` / `OR` / `NOT`                   | `$and` / `$or` / `$nor`                                                             |
| `orderBy`                              | `sort` with `1` / `-1`                                                              |
| `limit` / `offset`                     | `limit` / `skip`                                                                    |

Text is always escaped, so input from users never becomes a regular expression. Strings are
compared with MongoDB's default binary order; do not set a collation on the collection or the
query if you want the same results as the other adapters.

## Indexes

The translator does not create indexes. Create them for the fields you filter and sort by most;
`contains`, `endsWith` and any insensitive text search cannot use a normal index.

## Exports summary

| Export                                         | Kind     | Use                                              |
| ---------------------------------------------- | -------- | ------------------------------------------------ |
| `searchMongo`                                  | function | Runs a criteria on a collection → `SearchResult` |
| `MongoCriteriaTranslator`                      | class    | `translate(criteria)`, `translateFilter(filter)` |
| `escapeRegex`                                  | function | Escapes text for a MongoDB regular expression    |
| `MongoQuery`                                   | type     | `{ filter, sort, skip, limit? }`                 |
| `MongoFilter`, `MongoSort`                     | type     | Filter object and `Record<string, 1 \| -1>`      |
| `MongoCollection`, `MongoFindOptions`          | type     | What `searchMongo` needs from a collection       |
| `SearchMongoOptions`, `MongoTranslatorOptions` | type     | Options                                          |

## AI assistant skill

The package ships `SKILL.md`, a Claude Code skill with the rules, recommended patterns and common
mistakes. For the full API it points to this README inside `node_modules`, so it stays valid when
the package is updated. To install it in your project:

```bash
mkdir -p .claude/skills/archi-code-criteria-mongodb && cp node_modules/@archi-code/criteria-mongodb/SKILL.md .claude/skills/archi-code-criteria-mongodb/SKILL.md
```

### How to use

Invoke it with a request:

```text
/archi-code-criteria-mongodb implement MongoUserRepository.search(criteria) with the total
```

Or ask for the task without naming it and Claude loads it on its own because it matches its
description:

```text
Make the orders repository search MongoDB with a Criteria
```

It also reviews code that already uses the package:

```text
/archi-code-criteria-mongodb review the Mongo repositories and replace hand-written filters
```

With the skill loaded, Claude follows its rules, avoids the mistakes in its "What not to do" list
and, before using anything the skill does not show, reads this README in `node_modules`.

### Keeping it up to date

- The copy does not update itself: after updating `@archi-code/criteria-mongodb`, run the command
  above again.
- Commit `.claude/skills/archi-code-criteria-mongodb/` so the whole team uses it.

## License

MIT
