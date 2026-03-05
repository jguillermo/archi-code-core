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
| `common` | `@code-core/common` | 0.0.7 | Shared utilities (`universalToString`) |
| `domain` | `@code-core/domain` | 0.0.7 | DDD framework — aggregates, value objects, validators, exceptions |
| `criteria` | `@code-core/criteria` | 0.0.1 | Search/filter/order/paginate query builders + MongoDB converter |
| `crypto-tools` | `@code-core/cypto-tools` | 0.0.1 | Encryption, password hashing, JWT signing ⚠️ see known issues |
| `ephemeraDB` | `@code-core/ephemeradb` | 0.0.1 | Async in-memory key-value store |
| `test` | `@code-core/test` | 0.0.7 | Test helpers: ObjectMother, JsonCompare, TypeExpectEqual |

### Dependency graph

```
@code-core/common  (zero dependencies — true foundation)
    ↑
    ├── @code-core/domain   (runtime: ajv, class-validator, reflect-metadata, uuid)
    └── @code-core/test

@code-core/criteria    (standalone — no runtime deps)
@code-core/ephemeradb  (standalone — no runtime deps)
@code-core/cypto-tools (peer deps: bcrypt, jsonwebtoken, libsodium-wrappers-sumo)
```

### domain package internals

The core DDD package. Key concepts:

- **`AggregateRoot`** (`aggregate/aggregate-root.ts`) — Base for aggregates; event sourcing via `record()` / `pullDomainEvents()`.
- **`AbstractType<T>`** (`type/abstract-type.ts`) — Base for all value objects. Uses `class-validator` decorators. Nullable variants via generics. Methods: `isValid()`, `validatorMessageObj()`, `validatorMessageStr()`.
- **Primitive types** — `AbstractStringType`, `AbstractNumberType`, `AbstractBooleanType`, `AbstractDateType`, `AbstractUuidType`, `AbstractEnumType`, `AbstractArrayType`, `AbstractJsonType`.
- **`DomainValidator`** (`validator/`) — Custom `class-validator` constraint that validates nested `AbstractType` instances. Supports level-based validation skipping.
- **Exceptions** — `AbstractException` → `DomainException` / `ApplicationException` / `InfrastructureException`. Specifics: `ValidationException`, `AggregateNotFoundException`, `TypePrimitiveException`.
- **Builder** (`builder/builder.ts`) — Proxy-based fluent builder for type-safe object construction.
- **`EventBase`** (`event/event-base.ts`) — Abstract base for domain events; must implement `eventName()`.

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

### Testing

- Jest + ts-jest. Coverage thresholds per package (20–60% minimum).
- Use `ObjectMother` from `@code-core/test` to build test fixtures.
- Use `EphemeraDb` for in-memory repository stubs in tests.

## Known issues

### 1. Package name typo — crypto-tools
`packages/crypto-tools/package.json` has `"name": "@code-core/cypto-tools"` (missing `r`).
Should be `@code-core/crypto-tools`. Any external project installing this package must use the typo'd name until fixed.

### 2. Version inconsistency
`criteria`, `crypto-tools`, `ephemeraDB` are at `0.0.1`; `common`, `domain`, `test` are at `0.0.7`.
Lerna versioning is not synchronized across all packages.

### 3. Node engine mismatch
`domain` requires `"node": ">=22"`, all other packages require `"node": ">=16"`.

### 4. Unused declared dependencies
- `criteria/package.json` declares `@code-core/common` but never imports it.
- `ephemeraDB/package.json` declares `@code-core/common` but never imports it.