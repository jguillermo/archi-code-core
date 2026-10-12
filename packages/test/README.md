# @archi-code/test

Test helpers: compare JSON-like values and get readable differences, build DTO fixtures with an
object mother, and assert types at compile time. The package ships dual CJS and ESM builds.

```bash
npm install --save-dev @archi-code/test
```

## Usage

```ts
import { JsonCompare } from '@archi-code/test';

JsonCompare.strict({ a: 1, b: 'x' }, { a: 1, b: 'y' }); // ['b: x -> y']
JsonCompare.strict({ a: 1 }, { a: 1 }); // []
```

| Export                                    | Purpose                                                                     |
| ----------------------------------------- | --------------------------------------------------------------------------- |
| `JsonCompare`                             | `strict(data, reference)` / `include(data, reference)`: list of differences |
| `DtoObjectMother<T>`                      | Base class for DTO fixtures: `create(level, override?, exclude?)`           |
| `Expect`, `Equal`, `NotEqual`, `IsAny`, … | Compile-time type assertions                                                |

## License

MIT
