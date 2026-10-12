# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Root (all packages via npm workspaces)
```bash
npm run build           # Build all packages (CJS + ESM) in dependency order
npm run test            # Run all tests
npm run test:coverage   # Run tests with coverage
npm run check           # Prettier + ESLint in every package, editorconfig over the repo
npm run check:lint      # ESLint in every package
npm run check:format    # Prettier in every package
npm run fix             # Auto-fix lint and formatting
npm run clean           # Remove all node_modules
npm run check:packages  # Full gate (check:all) in every package
npm run check:<name>    # Full gate in one package: validator, domain, criteria, crypto-tools, ephemeradb, test
```

Every package's `check:all` runs the same gate: editorconfig-checker → prettier (`src`, `test` and the package's own `*.json`/`*.md`) → eslint → tsc (src + test) → jest with coverage → build (CJS + ESM) → dist check. CI and the husky `pre-push` hook run `npm run check:packages`.

The root `scripts/` holds only the general tools (packages have no `scripts/` folder); each package calls them as `node ../../scripts/<name>.js` and they act on the current package directory:
- `scripts/fix-esm.js` — adds `.js` to relative imports in `dist/esm`, gives files that call `require()` a `createRequire` shim (so optional deps loaded with `require` also work in ESM) and writes `dist/esm/package.json` (`type: module`).
- `scripts/check-dist.js` — `main`/`module`/`types` exist, CJS and ESM load and expose the same exports.
- `scripts/check-types.js` — a throwaway TypeScript consumer imports the package by name from an ESM (`.mts`) and a CJS (`.cts`) file under `node16`, `nodenext` and `bundler` resolution. Each `exports` condition must carry its own `types` (`import` → `dist/esm`, `require` → `dist/cjs`).
- `scripts/check-web.js` — `browser` field points to the ESM build, `dist/esm` has no bare imports nor Node-only globals, and the build loads in a realm without Node APIs.

Checks specific to one package's build live in that package, in `test/dist/dist.check.js` (every package has one; jest ignores it because it is not a `.spec.ts`). They must exercise the real API, not just load it. It may export `smoke(m)` (run on CJS and ESM), `crossBuild(cjs, esm)` (check-dist) and `web(webModule, nodeModule)` (check-web); each returns `[name, check]` pairs where `check()` returns (or resolves to) `true` or an error message. `scripts/lib/package-checks.js` loads and runs them.
- Root `npm run check:scripts` / `fix:scripts` run Prettier over `scripts/`.

### Single package
```bash
cd packages/<name> && npm run test                # Tests for one package
cd packages/<name> && npm run build               # Build one package
cd packages/<name> && npx jest test/path.spec.ts  # Run a single test file
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

npm workspaces monorepo publishing independent npm packages implementing DDD patterns (released with semantic-release, `scripts/build-all.js` builds them in dependency order). All packages compile to both CJS and ESM targeting ES2020.

### Packages and npm names

| Directory | npm name | Version | Purpose |
|---|---|---|---|
| `validation` | `@archi-code/validation` | 0.0.1 | Validators (TypeScript port of validator.js), `canBe*`/`to*` conversions, `@Validations` decorator |
| `domain` | `@archi-code/domain` | 1.0.0-alpha.3 | DDD framework — aggregates, value objects, exceptions, domain events |
| `criteria` | `@archi-code/criteria` | 1.0.0-alpha.1 | Search/filter/order/paginate query builders + MongoDB converter |
| `crypto-tools` | `@archi-code/crypto-tools` | 1.0.0-alpha.1 | Encryption, password hashing, JWT signing |
| `ephemeraDB` | `@archi-code/ephemeradb` | 1.0.0-alpha.3 | Async in-memory key-value store |
| `test` | `@archi-code/test` | 1.0.0-alpha.3 | Test helpers: ObjectMother, JsonCompare, TypeExpectEqual |

### Dependency graph

```
@archi-code/validation  (zero runtime dependencies — foundation)
    ↑
    ├── @archi-code/domain   (runtime: @archi-code/validation, uuid)
    └── @archi-code/test     (runtime: @archi-code/validation)

@archi-code/criteria     (standalone — no runtime deps)
@archi-code/ephemeradb   (standalone — no runtime deps)
@archi-code/crypto-tools (optional peer deps, loaded on demand: bcrypt, jsonwebtoken, libsodium-wrappers-sumo)
```

### domain package internals

The core DDD package. Key concepts:

- **`AggregateRoot`** (`aggregate/aggregate-root.ts`) — Base for aggregates; event sourcing via `record()` / `pullDomainEvents()`.
- **`AbstractType<T>`** (`type/abstract-type.ts`) — Base for all value objects. Only exposes the value (`value`, `isNull`, `isNotNull`, `toString`, `validate()`) and delegates by composition to static classes: `TypeInput` (`type/input/`: empty input → null, `filter`, required check), `TypeValidation` (`type/validation/`: cached `validate()` result), `RequiredMark` (`type/required/`) and `Immutable` (`type/immutable/`). Helpers are grouped as one static class per folder, never loose functions; `Required(...)` is the only function.
- **Value objects** — `StringType`, `NumberType`, `BooleanType`, `DateType`, `UuidType`, `EnumType`, `JsonType`, `ArrayType` (`type/<name>-type.ts`). Optional by default (`T | null`); `Required(XType)` makes the constructor ask for `T` and throws `RequiredValueException` when empty. Conversions come from `@archi-code/validation`; validations are declared with its `@Validations`. Values are immutable (`type/immutable/`). `CreatedAt`, `UpdatedAt` and `IdType` are required types.
- **Exceptions** — `AbstractException` → `DomainException` / `ApplicationException` / `InfrastructureException`. Specifics: `ValidationException`, `AggregateNotFoundException`, `TypePrimitiveException`, `RequiredValueException`.
- **`EventBase`** (`event/event-base.ts`) — Abstract base for domain events; must implement `eventName()`.
- **Tests** — `src/` holds only code; every spec lives in `packages/domain/test/`, mirroring the `src/` folder tree (`src/type/string-type.ts` → `test/type/string-type.spec.ts`).
- **Gate** — `npm run check:domain` (root): the common `check:all` gate with 100% coverage; `test/dist/dist.check.js` smoke-tests the value objects in both builds.

### TypeScript config hierarchy (per package)

```
tsconfig.json  (extends ../../tsconfig.base.json, includes src/ and test/)
└── tsconfig.build.json  (rootDir ./src, compiles only src/)
    ├── tsconfig.cjs.json  → outDir: ./dist/cjs, module: CommonJS
    └── tsconfig.esm.json  → outDir: ./dist/esm, module: ES2020
```

### Code style

- **Prettier**: single quotes, trailing commas, print width 100, 2-space indent, semicolons.
- **ESLint**: TypeScript strict + Prettier enforced. `any` and `Function` types are allowed.
- Test files: `*.spec.ts` convention. In `domain`, `test`, `criteria`, `ephemeraDB` and `crypto-tools`, `src/` holds only code and specs live in the package's `test/` folder, mirroring `src/`.
- **No comments**: code must describe itself through names (variables, functions, classes, tests) and structure. Do not add comments, docblocks or section banners. A comment is the exception, only when it is truly necessary to explain a non-obvious *why* that the code cannot express.

### Testing

- Jest + ts-jest. Coverage thresholds per package: 100% in `domain`, `validation` and `ephemeraDB`; the others are pinned to their current coverage so it can only go up.
- Use `ObjectMother` from `@archi-code/test` to build test fixtures.
- Use `EphemeraDb` for in-memory repository stubs in tests.

## Known issues

### 1. Version inconsistency
Package versions are not synchronized: `validation` is at `0.0.1`; `criteria` and `crypto-tools` at `1.0.0-alpha.1`; `domain`, `ephemeraDB` and `test` at `1.0.0-alpha.3`.
`domain` and `test` pin `@archi-code/validation` to exactly `0.0.1`.

### 2. ESLint does not lint `scripts/*.js`
`eslint.config.js` ignores every `**/*.js`, so the shared `scripts/` are only covered by Prettier (`check:scripts`) and editorconfig.
