# @archi-code/criteria

Search criteria for repositories: filters (simple and composite), ordering, pagination and
grouping as plain DTOs, a serializer to send them as a string, and a converter to MongoDB queries.
No runtime dependencies; the package ships dual CJS and ESM builds.

```bash
npm install @archi-code/criteria
```

## Usage

```ts
import {
  FilterOperator,
  MongoCriteriaConverter,
  SearchCriteriaDto,
  SearchPaginatorDto,
  SimpleFilterDto,
} from '@archi-code/criteria';

const criteria = new SearchCriteriaDto(
  new SimpleFilterDto('age', FilterOperator.GT, 18),
  undefined,
  new SearchPaginatorDto(2, 10),
);

new MongoCriteriaConverter().convert(criteria);
// { filter: { age: { $gt: 18 } }, sort: {}, skip: 10, limit: 10 }
```

## Building blocks

| Export                                   | Purpose                                                                                  |
| ---------------------------------------- | ---------------------------------------------------------------------------------------- |
| `SearchCriteriaDto`                      | Filters, orders, paginator and group-by of one search                                    |
| `SimpleFilterDto` / `CompositeFilterDto` | One condition / conditions joined with a `LogicalOperator`                               |
| `FilterOperator`                         | `eq`, `ne`, `lt`, `lte`, `gt`, `gte`, `in`, `nin`, `between`, `like`, `ilike`, `inarray` |
| `SearchOrderDto` / `SearchOrderItemDto`  | Ordering                                                                                 |
| `SearchPaginatorDto`                     | Page and page size                                                                       |
| `SearchGroupByDto`                       | Grouping                                                                                 |
| `SearchQuerySerializer`                  | `serialize(criteria)` / `deserialize(text)`                                              |
| `MongoCriteriaConverter`                 | `convert(criteria)` to a `MongoQuery`                                                    |

## License

MIT
