# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Root (all packages via npm workspaces)

```bash
npm run build           # Build all packages (CJS + ESM) in dependency order
npm run test            # Run all tests
npm run test:coverage   # Run tests with coverage
npm run check           # Root scripts (Prettier + node --test), editorconfig over the repo, then check:all in every package
npm run fix             # Auto-fix lint and formatting
npm run clean           # Remove all node_modules
npm run check:packages  # Full gate (check:all) in every package
npm run check:<name>    # Full gate in one package: validator, domain, criteria, crypto-tools, ephemeradb, test
npm run check:versions  # Every package version and internal dep is 0.0.0-development
npm run version         # Dry-run of the release: current and next version of each package, writes release-plan.json
npm run release         # Deploy (CI): publish the planned packages, tags and GitHub releases
```

Every package's `check:all` runs the same gate: editorconfig-checker → prettier (`src`, `test` and the package's own `*.json`/`*.md`) → eslint → tsc (src + test) → jest with coverage → build (CJS + ESM) → dist check. CI on pull requests runs `npm run check`; the release workflow (push to `main`/`release`, GitHub environment `deploy` with the `NPM_TOKEN` secret) only builds and publishes; the husky `pre-push` hook runs `npm run check:packages`.

The root `scripts/` holds only the general tools (packages have no `scripts/` folder); each package calls them as `node ../../scripts/<name>.js` and they act on the current package directory:

- `scripts/fix-esm.js` — adds `.js` to relative imports in `dist/esm`, gives files that call `require()` a `createRequire` shim (so optional deps loaded with `require` also work in ESM) and writes `dist/esm/package.json` (`type: module`).
- `scripts/check-dist.js` — `main`/`module`/`types` exist, CJS and ESM load and expose the same exports.
- `scripts/check-types.js` — a throwaway TypeScript consumer imports the package by name from an ESM (`.mts`) and a CJS (`.cts`) file under `node16`, `nodenext` and `bundler` resolution. Each `exports` condition must carry its own `types` (`import` → `dist/esm`, `require` → `dist/cjs`).
- `scripts/editorconfig.js` — runs editorconfig-checker with the shared excludes and the binary version pinned (`EC_VERSION`); the npm wrapper downloads the binary from GitHub, so `latest` would break when upstream renames its assets. Change the version only there.
- `scripts/check-web.js` — `browser` field points to the ESM build, `dist/esm` has no bare imports nor Node-only globals, and the build loads in a realm without Node APIs.

Checks specific to one package's build live in that package, in `test/dist/dist.check.js` (every package has one; jest ignores it because it is not a `.spec.ts`). They must exercise the real API, not just load it. It may export `smoke(m)` (run on CJS and ESM), `crossBuild(cjs, esm)` (check-dist) and `web(webModule, nodeModule)` (check-web); each returns `[name, check]` pairs where `check()` returns (or resolves to) `true` or an error message. `scripts/lib/package-checks.js` loads and runs them.

- Root `npm run check:scripts` / `fix:scripts` run Prettier over `scripts/`, the root `*.md` and `.claude/**/*.md`.

### Versions and release

In the repo every package `version` and every internal `@archi-code/*` dependency is `0.0.0-development`
(`npm run check:versions`, part of `npm run check`). Real versions live only in git tags (`<name>-vX.Y.Z`)
and npm. `scripts/lib/release-plan.js` computes the next release from them; `npm run version` (dry-run)
and `npm run release` (deploy) use the same plan:

- Branch `main` → `X.Y.Z-alpha.N` (dist-tag `main`); `release` → stable (dist-tag `latest`); the first
  stable promotes the open alpha (`1.0.0-alpha.4` → `1.0.0`). Other branches do not publish.
- Commits since the last tag touching `packages/<dir>`: breaking → major, `feat` → minor, `fix`/`perf` →
  patch, `chore|docs|test|style|ci|build|refactor|revert` → none, non conventional → patch with a warning.
- Cascade: if an internal runtime/peer dependency is released, its dependents release at least a patch,
  pinned to the exact versions.
- `scripts/release.js` aborts before publishing anything unless: clean tree, HEAD equals the remote
  branch, `check:versions` passes, npm and gh are authenticated, no target tag or npm version exists and
  every pinned dependency is on npm. Per package, in dependency order: writes the exact versions into
  `package.json`, builds, packs, verifies the packed `package.json`, restores the file, publishes that
  tarball, waits for npm, pushes the annotated tag and creates the GitHub release. It never commits.
- `npm run release -- --pack` runs the same steps up to the verified tarball without publishing.

### Single package

```bash
cd packages/<name> && npm run test                # Tests for one package
cd packages/<name> && npm run build               # Build one package
cd packages/<name> && npx jest test/path.spec.ts  # Run a single test file
```

### Build output structure (each package)

```
dist/
├── cjs/    # CommonJS (require) with its .d.ts declarations
└── esm/    # ES Modules (import) with its .d.ts declarations
```

Each package's `package.json` entry points:

- `main`: `./dist/cjs/index.js`
- `module`: `./dist/esm/index.js`
- `types`: `./dist/cjs/index.d.ts`
- `exports`: dual CJS/ESM support via `import`/`require` conditions, each with its own `types` (`import` → `./dist/esm/index.d.ts`, `require` → `./dist/cjs/index.d.ts`)

## Package standard

Every package follows `.claude/rules/packages.md` (layout, `package.json`, tsconfig, Jest, tests, build checks, allowed extensions and a checklist). Create new packages with `node scripts/new-package.js <folder> "<description>"` or the `/new-package` skill; the result passes `check:all` from the start.

## Architecture

npm workspaces monorepo publishing independent npm packages implementing DDD patterns (released with `scripts/release.js`, see Versions and release; `scripts/build-all.js` builds them in dependency order). All packages compile to both CJS and ESM targeting ES2020.

### Packages and npm names

| Directory      | npm name                   | Purpose                                                                                            |
| -------------- | -------------------------- | -------------------------------------------------------------------------------------------------- |
| `validation`   | `@archi-code/validation`   | Validators (TypeScript port of validator.js), `canBe*`/`to*` conversions, `@Validations` decorator |
| `domain`       | `@archi-code/domain`       | DDD framework — aggregates, value objects, exceptions, domain events                               |
| `criteria`     | `@archi-code/criteria`     | Search/filter/order/paginate query builders + MongoDB converter                                    |
| `crypto-tools` | `@archi-code/crypto-tools` | Encryption, password hashing, JWT signing                                                          |
| `ephemeraDB`   | `@archi-code/ephemeradb`   | Async in-memory key-value store                                                                    |
| `test`         | `@archi-code/test`         | Test helpers: `DtoObjectMother`, `JsonCompare`, type assertions (`Expect`, `Equal`, `IsAny`…)      |

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
- **`AbstractType<T>`** (`type/abstract-type.ts`) — Base for all value objects. Only exposes the value (`value`, `isNull`, `toString`, `validate()`) and delegates by composition to static classes: `TypeInput` (`type/input/`: empty input → null, `filter`, required check), `RequiredMark` (`type/required/`) and `Immutable` (`type/immutable/`). Helpers are grouped as one static class per folder, never loose functions; `Required(...)` is the only function. `Required(...)` declares `@Validations([{ validator: 'isRequired' }])`, so a required type that holds `null` fails `isRequired` in `validate()`. `validate()` keeps no state: it only calls the `@archi-code/validation` validator and returns its result (an optional `null` is ok because the validator runs nothing without a value when `isRequired` is not declared).
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
- Test files: `*.spec.ts` convention. In every package `src/` holds only code and specs live in the package's `test/` folder, mirroring `src/`.
- **Imports**: inside `src/`, import each symbol from the file that declares it, never through a re-exporting `index.ts` (see `.claude/rules/packages.md`).
- **No comments**: code must describe itself through names (variables, functions, classes, tests) and structure. Do not add comments, docblocks or section banners. A comment is the exception, only when it is truly necessary to explain a non-obvious _why_ that the code cannot express.

### Testing

- Jest + ts-jest. Coverage threshold: 100% (statements, branches, functions, lines) in every package. Each package's `test/index.spec.ts` pins its public API.
- Specs import from `../src/...` and `@jest/globals`; no package depends on another for its tests. `@archi-code/test` (`DtoObjectMother`, `JsonCompare`) and `EphemeraDb` are helpers for the projects that consume these packages.

## Known issues

### 1. ESLint does not lint `scripts/*.js`

`eslint.config.js` ignores every `**/*.js`, so the shared `scripts/` are only covered by Prettier (`check:scripts`) and editorconfig.
