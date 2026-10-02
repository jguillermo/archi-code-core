# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Root (all packages via Lerna)
```bash
npm run build        # Build all packages (CJS + ESM)
npm run test         # Run all tests
npm run coverage     # Run tests with coverage
npm run lint         # Lint all packages
npm run lint:fix     # Auto-fix lint issues
npm run format       # Check formatting
npm run format:fix   # Auto-fix formatting
npm run clean        # Remove all node_modules
```

### Single package
```bash
cd packages/<name> && npm run test                # Tests for one package
cd packages/<name> && npm run build               # Build one package
cd packages/<name> && npx jest src/path.spec.ts   # Run a single test file
```

### Build output structure (each package)
```
dist/
├── cjs/    # CommonJS (require)
└── esm/    # ES Modules (import) — also contains .d.ts declarations
```

Each package's `package.json` entry points:
- `main`: `./dist/cjs/index.js`
- `module`: `./dist/esm/index.js`
- `types`: `./dist/esm/index.d.ts`
- `exports`: dual CJS/ESM support via `import`/`require` conditions

## Architecture

Lerna monorepo publishing independent npm packages implementing DDD patterns. All packages compile to both CJS and ESM targeting ES2020.

### Packages and npm names

| Directory | npm name | Version | Purpose |
|---|---|---|---|
| `common` | `@archi-code/common` | 0.0.7 | Shared utilities (`universalToString`) |
| `domain` | `@archi-code/domain` | 0.0.7 | DDD framework — aggregates, value objects, validators, exceptions |
| `criteria` | `@archi-code/criteria` | 0.0.1 | Search/filter/order/paginate query builders + MongoDB converter |
| `crypto-tools` | `@archi-code/cypto-tools` | 0.0.1 | Encryption, password hashing, JWT signing ⚠️ see known issues |
| `ephemeraDB` | `@archi-code/ephemeradb` | 0.0.1 | Async in-memory key-value store |
| `test` | `@archi-code/test` | 0.0.7 | Test helpers: ObjectMother, JsonCompare, TypeExpectEqual |

### Dependency graph

```
@archi-code/common  (zero dependencies — true foundation)
    ↑
    ├── @archi-code/domain   (runtime: @archi-code/validation, uuid)
    └── @archi-code/test

@archi-code/criteria    (standalone — no runtime deps)
@archi-code/ephemeradb  (standalone — no runtime deps)
@archi-code/cypto-tools (peer deps: bcrypt, jsonwebtoken, libsodium-wrappers-sumo)
```

### domain package internals

The core DDD package. Key concepts:

- **`AggregateRoot`** (`aggregate/aggregate-root.ts`) — Base for aggregates; event sourcing via `record()` / `pullDomainEvents()`.
- **`AbstractType<T>`** (`type/abstract-type.ts`) — Base for all value objects. Only exposes the value (`value`, `isNull`, `isNotNull`, `toString`, `validate()`) and delegates by composition to `type/input/` (empty input → null, `filter`, required check), `type/validation/` (`TypeValidation`, cached `validate()` result) and `type/required/`.
- **Value objects** — `StringType`, `NumberType`, `BooleanType`, `DateType`, `UuidType`, `EnumType`, `JsonType`, `ArrayType` (`type/<name>-type.ts`). Optional by default (`T | null`); `Required(XType)` makes the constructor ask for `T` and throws `RequiredValueException` when empty. Conversions come from `@archi-code/validation`; validations are declared with its `@Validations`. Values are immutable (`type/immutable/`). `CreatedAt`, `UpdatedAt` and `IdType` are required types.
- **Exceptions** — `AbstractException` → `DomainException` / `ApplicationException` / `InfrastructureException`. Specifics: `ValidationException`, `AggregateNotFoundException`, `TypePrimitiveException`, `RequiredValueException`.
- **`EventBase`** (`event/event-base.ts`) — Abstract base for domain events; must implement `eventName()`.
- **Gate** — `npm run check:domain` (root): prettier → eslint → tsc → jest at 100% coverage → build (CJS + ESM with `scripts/fix-esm.js`) → `scripts/check-dist.js`.

### TypeScript config hierarchy (per package)

```
tsconfig.json  (extends ../../tsconfig.base.json)
└── tsconfig.build.json  (excludes *.spec.ts, tests/)
    ├── tsconfig.cjs.json  → outDir: ./dist/cjs, module: CommonJS
    └── tsconfig.esm.json  → outDir: ./dist/esm, module: ES2020
```

### Code style

- **Prettier**: single quotes, trailing commas, print width 180, 2-space indent, semicolons.
- **ESLint**: TypeScript strict + Prettier enforced. `any` and `Function` types are allowed.
- Test files: `*.spec.ts` convention.
- **No comments**: code must describe itself through names (variables, functions, classes, tests) and structure. Do not add comments, docblocks or section banners. A comment is the exception, only when it is truly necessary to explain a non-obvious *why* that the code cannot express.

### Testing

- Jest + ts-jest. Coverage thresholds per package (20–60% minimum).
- Use `ObjectMother` from `@archi-code/test` to build test fixtures.
- Use `EphemeraDb` for in-memory repository stubs in tests.

## Known issues

### 1. Package name typo — crypto-tools
`packages/crypto-tools/package.json` has `"name": "@archi-code/cypto-tools"` (missing `r`).
Should be `@archi-code/crypto-tools`. Any external project installing this package must use the typo'd name until fixed.

### 2. Version inconsistency
`criteria`, `crypto-tools`, `ephemeraDB` are at `0.0.1`; `common`, `domain`, `test` are at `0.0.7`.
Lerna versioning is not synchronized across all packages.

### 3. Node engine mismatch
`domain` requires `"node": ">=22"`, all other packages require `"node": ">=16"`.

### 4. Unused declared dependencies
- `criteria/package.json` declares `@archi-code/common` but never imports it.
- `ephemeraDB/package.json` declares `@archi-code/common` but never imports it.
