# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Root (all packages via npm workspaces)

```bash
npm run build           # Build all packages (CJS + ESM) in dependency order
npm run test            # Run all tests
npm run test:coverage   # Run tests with coverage
npm run check           # Root scripts (Prettier + Vitest), editorconfig over the repo, then check:all in every package
npm run fix             # Auto-fix lint and formatting
npm run clean           # Remove all node_modules
npm run check:packages  # Full gate (check:all) in every package
npm run check:<name>    # Full gate in one package: validator, domain, criteria, criteria-adapters, crypto-tools
npm run check:versions  # Every package version and internal dep is 0.0.0-development
npm run check:audit     # npm audit of runtime deps + cargo audit of crypto-tools (network; CI audit.yml, weekly)
npm run version         # Dry-run of the release: current and next version of each package, writes release-plan.json
npm run release         # Deploy (CI): publish the planned packages and record them in releases.json
```

Every package's `check:all` runs the same gate: editorconfig-checker → prettier (`src`, `test` and the package's own `*.json`/`*.md`) → eslint → tsc (src + test) → vitest with coverage → build (CJS + ESM) → dist check. CI on pull requests runs `npm run check` (and `.github/workflows/audit.yml` runs `npm run check:audit`, also every Monday); the release workflow (push to `main`/`release`, GitHub environment `deploy` with the `NPM_TOKEN` secret) only builds and publishes. The husky hooks stay fast and leave the full gate to CI: `pre-commit` runs `scripts/pre-commit.js` (Prettier and ESLint only on the staged files the gate checks) and `pre-push` runs `scripts/check-versions.js`.

The root `scripts/` holds only the general tools (packages have no `scripts/` folder); each package calls them as `node ../../scripts/<name>.js` and they act on the current package directory:

- `scripts/fix-esm.js` — adds `.js` to relative imports in `dist/esm`, gives files that call `require()` a `createRequire` shim (so optional deps loaded with `require` also work in ESM) and writes `dist/esm/package.json` (`type: module`).
- `scripts/check-dist.js` — `main`/`module`/`types` exist, CJS and ESM load and expose the same exports, and the package documentation is valid and packed (`scripts/lib/package-docs.js`: `files` includes `SKILL.md`, the README mentions it, the `SKILL.md` frontmatter has exactly `name: archi-code-<name>` and `description`, and `npm pack` carries `README.md`, `LICENSE` and `SKILL.md`).
- `scripts/check-types.js` — a throwaway TypeScript consumer imports the package by name from an ESM (`.mts`) and a CJS (`.cts`) file under `node16`, `nodenext` and `bundler` resolution. Each `exports` condition must carry its own `types` (`import` → `dist/esm`, `require` → `dist/cjs`).
- `scripts/editorconfig.js` — runs editorconfig-checker with the shared excludes and the binary version pinned (`EC_VERSION`); the npm wrapper downloads the binary from GitHub, so `latest` would break when upstream renames its assets. Change the version only there.
- `scripts/check-web.js` — `browser` field points to the ESM build, `dist/esm` has no bare imports nor Node-only globals, and the build loads in a realm with the standard Web APIs and without Node APIs.
- `scripts/check-browser.js` — serves the package's `dist/` and runs the `browser` checks of `test/dist/dist.check.js` inside real Chromium, Firefox and WebKit pages through Playwright (root devDependency; `npx playwright install` once, `CHECK_BROWSERS=chromium` narrows it). Each check is `[name, pageFunction, { csp }?]`: the function runs in a page served with that Content-Security-Policy, receives the URL of the ESM entry and returns `true` or an error message. It runs the `browser` hooks of every entry point (`test/dist/<module>.check.js` for subpaths), serves the package's runtime `dependencies` (recursively) under `/node_modules/<name>/` with an inline import map (its hash is added to a page's `script-src`), and serves the package's `test/` helpers transpiled from TypeScript at `/test/<path>`, so a page can import a test harness such as a contract.
- `scripts/embed-wasm.js` — turns a `wasm-pack --target no-modules` output into a generated `.ts` module (wasm gzipped as base64, decompressed with `DecompressionStream`, + glue as text) and refuses glue that needs Node or imports modules. `scripts/lib/web-safety.js` holds the checks it shares with `check-web.js`.

Checks specific to one package's build live in that package, in `test/dist/dist.check.js` (every package has one; vitest ignores it because it is not a `.spec.ts`). They must exercise the real API, not just load it. It may export `smoke(m)` (run on CJS and ESM), `crossBuild(cjs, esm)` (check-dist), `web(webModule, nodeModule)` (check-web) and `browser()` (check-browser); each returns `[name, check]` pairs where `check()` returns (or resolves to) `true` or an error message. `scripts/lib/package-checks.js` loads and runs them.

- Root `npm run check:scripts` / `fix:scripts` run Prettier over `scripts/`, the root `*.md` and `.claude/**/*.md`.

### Versions and release

In the repo every package `version` and every internal `@archi-code/*` dependency is `0.0.0-development`
(`npm run check:versions`, part of `npm run check`). `releases.json` (root) is the source of truth
of what is published: `packages` holds only the current version of each package per channel; `deploys`
is the history, one entry per deploy (date, commit, channel) listing every package it published with its
previous version, new version, bump, reasons and the internal dependencies it pins. The commit a package
was published from is the one of the deploy that published its current version. Only the release in
GitHub Actions writes it; never edit it by hand.
`scripts/lib/release-plan.js` computes the next release from it; `npm run version` (dry-run, local, no
network) and `npm run release` (deploy) use the same plan:

- Branch `main` → `X.Y.Z-alpha.N` (dist-tags `latest` and `main`, so a plain `npm i` gets it); `release` →
  stable (dist-tag `latest`). Every run also moves any channel dist-tag that fell behind the version
  `releases.json` records (it only warns if npm refuses). The first
  stable promotes the open alpha (`1.0.0-alpha.4` → `1.0.0`). Other branches do not publish.
- Commits since the recorded commit touching `packages/<dir>`: breaking → major, `feat` → minor,
  `fix`/`perf` → patch, `chore|docs|test|style|ci|build|refactor|revert` → none, non conventional → patch
  with a warning.
- Empty `deploys` (with or without `packages`): the whole set starts a new major, aligned: every package
  is released at the major after the highest current version (`2.0.0-alpha.1` on `main`, `2.0.0` on
  `release`; `1.0.0…` when `packages` is empty too), without looking at commits. That deploy is recorded
  and from then on the normal flow applies. Emptying `deploys` is the only manual edit of the file. The
  reset deploy stores its target (`"reset": "2.0.0-alpha.1"`); if the run stops half way, the next runs
  release every package that no deploy records yet at that same version.
- Cascade: a dependent releases at least a patch when an internal runtime/peer dependency releases now
  or is already at a version different from the one its last publication pins.
- `scripts/release.js` aborts before publishing anything unless: clean tree, HEAD equals the remote
  branch, `releases.json` is valid and its commits are in the history of HEAD, `check:versions` passes,
  npm is authenticated and every pinned dependency is on npm. A planned version already on npm (a run
  that published but could not push `releases.json`) is recorded from the `releaseCommit` of its published
  `package.json` and the plan is computed again; a version on npm without a `releaseCommit` from this
  history stops the release.
- Per package, in dependency order: writes the exact versions and `releaseCommit` into `package.json`,
  builds, packs, verifies the packed `package.json` and that the tarball carries `README.md`, `LICENSE` and `SKILL.md`, restores the file and publishes that tarball.
  Right after each successful publish it records the version in `releases.json` and commits and pushes
  it to the branch (`chore(release): record <name>@<version> [skip ci]`), so a run that fails or is
  killed later never leaves a published version out of the file; a push that fails is retried by the
  next save and once more at the end. It never waits for npm to serve a version (that can take
  minutes): `npm publish` succeeding is enough. If npm answers that the version already exists, the
  release stops without recording it and the next run reconciles it. No git tags nor GitHub releases.
- `npm run release -- --pack` runs the same steps up to the verified tarball without publishing.

### Single package

```bash
cd packages/<name> && npm run test                # Tests for one package
cd packages/<name> && npm run build               # Build one package
cd packages/<name> && npx vitest run test/path.spec.ts  # Run a single test file
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

Every package follows `.claude/rules/packages.md` (layout, `package.json`, tsconfig, Vitest, tests, build checks, documentation, allowed extensions and a checklist). Each package ships an English `README.md` with its whole API and a light `SKILL.md` (Claude Code skill `archi-code-<name>`: rules, patterns and common mistakes; for the API it sends the assistant to the installed README) that consumers copy into `.claude/skills/`. Create new packages with `node scripts/new-package.js <folder> "<description>"` or the `/new-package` skill; the result passes `check:all` from the start.

## Architecture

npm workspaces monorepo publishing independent npm packages implementing DDD patterns (released with `scripts/release.js`, see Versions and release; `scripts/build-all.js` builds them in dependency order). All packages compile to both CJS and ESM targeting ES2020.

### Packages and npm names

| Directory           | npm name                        | Purpose                                                                                                                     |
| ------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `validation`        | `@archi-code/validation`        | Validators (TypeScript port of validator.js), `canBe*`/`to*` conversions, `@Validations` decorator                          |
| `domain`            | `@archi-code/domain`            | DDD framework — aggregates, value objects, exceptions, domain events                                                        |
| `criteria`          | `@archi-code/criteria`          | Database-independent Criteria: typed `where`/`orderBy`/pagination, URL text, input schema with limits                       |
| `criteria-adapters` | `@archi-code/criteria-adapters` | Criteria adapters as separate subpaths: `/memory` (reference semantics), `/mongodb`, `/indexeddb`; shared internal contract |
| `crypto-tools`      | `@archi-code/crypto-tools`      | Crypto toolkit in one Rust→wasm module run in workers (web + Node): password, cipher, RSA, signature, hash, token, JWT      |

### Dependency graph

```
@archi-code/validation  (zero runtime dependencies — foundation)
    ↑
    └── @archi-code/domain   (runtime: @archi-code/validation, uuid)

@archi-code/criteria     (standalone — no runtime deps)
    ↑
    └── @archi-code/criteria-adapters (runtime: @archi-code/criteria; optional peer: mongodb;
                                       subpaths /memory, /mongodb, /indexeddb → memory)
@archi-code/crypto-tools (standalone — no npm deps; Rust crates compiled into one embedded wasm)
```

### crypto-tools package internals

- All crypto logic is Rust in `packages/crypto-tools/rust/src` (RustCrypto, `bcrypt`, `argon2`, `rsa`,
  `pasetors`, `jsonwebtoken`), with `cargo test` per module. `wasm-pack --target no-modules` builds it and
  `scripts/embed-wasm.js` embeds wasm + glue into `src/wasm/wasm-assets.generated.ts`, so the same ESM/CJS
  build runs in browsers and Node without `fs`, `fetch` or bundler setup.
- `src/worker/workers.ts` runs every call in a pool of Web Workers (Blob URL) or `worker_threads`
  (`process.getBuiltinModule`), falling back to the calling thread only where no worker exists; the API is
  async modules with standard verbs (`password.hash/verify`, `cipher.encrypt/decrypt`, `rsa`,
  `signature.sign/verify`, `hash.digest/hmac`, `token`, `jwt`) and `{ level, algorithm }` options.
- Levels `basic | standard | strong | cnsa` (`military` = `cnsa`) are one table in `rust/src`; errors are
  `CryptoError` with a `code`. It is a new library: nothing exists for compatibility with an older
  version or with other libraries; it only reads what it produces (bcrypt `$2b$`, Argon2id v19, PKCS#8 /
  SPKI PEM) and its messages are its own.
- Pool: a call that gets no answer within `timeout` ms (default 60 s) rejects with `TIMEOUT` and a wasm
  trap rejects with `WORKER`; in both cases the worker is replaced and its queued calls move to another
  one. A page that blocks Blob workers (CSP) falls back to the calling thread. Idle workers close after
  `idleTimeout` (default 30 s) to give back wasm memory (Argon2id keeps 64–256 MiB).
- `cipher` derives with HKDF for random keys and with Argon2id for `{ password: true }` (AEAD only).
  `jwt` and `token` require `exp` unless `requireExpiration: false`.
- Passwords: `standard` is Argon2id, only `basic` is bcrypt; `password.hash` takes at most 64 characters
  (grapheme clusters) and bcrypt refuses passwords over 72 bytes instead of truncating them.
- RSA private-key operations are blinded (`decrypt_blinded`, `BlindedSigningKey`); RUSTSEC-2023-0071
  has no fixed `rsa` release and is accepted in `rust/.cargo/audit.toml` (see README "Known risk").
- Gate: `npm run check:crypto-tools` needs Rust (`rust/rust-toolchain.toml`), `wasm-pack` and the
  Playwright browsers; `check:audit` needs `cargo-audit`.

### criteria packages internals

- `@archi-code/criteria` holds no engine code. `Criteria.create<T>({ where, orderBy, limit, offset })`
  takes a typed object (`Where<T>`: per `Path<T>` only the operators of its type) and normalizes it
  into a frozen tree of plain `FilterNode`s told apart by `kind`; adapters read it with
  `visitFilter`, never `instanceof`. `T` is the primitive shape of the entity.
- `toUrl()`/`Criteria.fromUrl()` encode the compact JSON (`toJSON`, versioned `v: 1`) as base64url;
  `defineCriteriaSchema` whitelists fields/operators, converts text input strictly (ISO dates with a
  zone or UTC dates, never digit-only text; decimal numbers) and requires `maxLimit` (`maxOffset`
  defaults to 10000). Its optional `tiebreaker` (a unique sortable field) is appended last to every
  order so offset pages are stable.
- Criteria values are checked once in `freezeFilter`: lists share one type, text operators need a
  non-empty text, and dates become frozen `ImmutableDate`s (a `Date` subclass whose setters throw).
  Dates are recognized with `isDate` (internal slot check), never `instanceof Date`, because they
  can come from another realm. `equals` compares `canonicalCriteria` (AND/OR children and list
  values sorted and deduplicated); `toUrl` keeps the written order.
- Input from outside only throws `CriteriaError`: `normalizeWhere`, `decodeNode` and `freezeFilter`
  refuse more than `MAX_FILTER_DEPTH` (64) levels before recursing, and `assertWithinLimits`
  (`criteria-limits.ts`) applies `CriteriaLimits` (depth, nodes, list size, text length, order
  fields, URL length) to `fromUrl`/`fromJSON` (`DEFAULT_CRITERIA_LIMITS`) and to every schema
  (`limits` overrides them). `Criteria.create` from code only has the 64-level ceiling.
  `CriteriaError` carries a `Symbol.for` brand and `Symbol.hasInstance`, so `instanceof` works across
  the CJS/ESM builds; messages quote at most 64 characters of input. `test/cross/` holds the
  adversarial and fuzz specs that cover every entry point.
- `@archi-code/criteria-adapters` has only subpath entry points (`./memory`, `./mongodb`,
  `./indexeddb`; no `"."`, `typesVersions` for `moduleResolution: node`). Each module lives in
  `src/<module>/` with its public `index.ts`; inside a module imports go to the declaring file and
  across modules only through the other module's `index.ts`. `test/cross/module-boundaries.spec.ts`
  fixes the graph (`indexeddb → memory`, nothing else), forbids imports out of `src/` and of any
  package but `@archi-code/criteria`, and cycles. Build hooks live in `test/dist/<module>.check.js`.
- The semantics (null/missing, code point string order via `compareText`, literal text with Unicode
  simple case folding) are fixed by `/memory` and checked by the internal contract in
  `criteria-adapters/test/contract/` (`createContractDocuments()`, `CRITERIA_CONTRACT_CASES`,
  `runCriteriaContract`), which the spec of every adapter runs. It is never published.
- `@archi-code/criteria` has the web build extension (`browser` field and condition, `check-web` and
  `check-browser` in `check:dist`), so its smoke checks use `m.isDate`, never `instanceof Date`.
- `/mongodb` never imports the driver in `src/` (structural `MongoCollection`); its contract
  spec runs on a real MongoDB through `mongodb-memory-server` (devDependency, downloads `mongod` on
  first use into `~/.cache/mongodb-binaries`, which `ci.yml` caches) with the driver 7 and 6
  (`mongodb-v6` alias), and `mongo-indexes.spec.ts` checks with `explain` that the translated
  filters read only matching documents through an index. Converter errors become `CriteriaError`
  `INVALID_VALUE`.
- `/indexeddb` picks one key range from the required conditions (`planIndexedDbQuery`, pure)
  and re-checks every record with `matchesFilter`; text bounds with code units from U+D800 are not
  used as key ranges and a sorted walk that meets one sorts in memory (IndexedDB orders by UTF-16
  code unit). The package runs `check-browser` (not `check-web`, whose scan refuses the bare
  `@archi-code/criteria` import): `/memory` and `/indexeddb` run the whole contract in Chromium,
  Firefox and WebKit, on each browser's real IndexedDB in three store layouts; vitest uses
  `fake-indexeddb`.

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
- **English only**: everything in the repository is written in English: code, identifiers, comments, test names, error and log messages, scripts, README files, skills, rules and other documentation. Non-ASCII text is allowed only as test data. (Talking to the user in Spanish is fine; what gets written into the repo is English.)
- **No comments**: code must describe itself through names (variables, functions, classes, tests) and structure. Do not add comments, docblocks or section banners. A comment is the exception, only when it is truly necessary to explain a non-obvious _why_ that the code cannot express.

### Testing

- Vitest 5 everywhere: each package has its own complete `vitest.config.mts` (v8 coverage over `src/**/*.ts`, threshold 100% for statements, branches, functions and lines) and the root `vitest.config.mts` runs `scripts/__tests__` (`npm run test:scripts`). Each package's `test/index.spec.ts` pins its public API.
- Nothing is global (`globals: false`): every spec imports from `vitest` what it uses (`describe`, `it`, `expect`, `vi`, `expectTypeOf`) and from `../src/...` the code under test; no package depends on another for its tests. Module isolation uses `vi.resetModules()` + `await import()`, globals are replaced with `vi.stubGlobal`, and coverage hints are `/* v8 ignore … -- @preserve */`.

## Known issues

### 1. ESLint does not lint `scripts/*.js`

`eslint.config.js` ignores every `**/*.js`, so the shared `scripts/` are only covered by Prettier (`check:scripts`) and editorconfig.
