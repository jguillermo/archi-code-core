# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Root (all packages via npm workspaces)

```bash
npm run build           # Build all packages (CJS + ESM) in dependency order
npm run test            # Run all tests
npm run test:coverage   # Run tests with coverage
npm run check           # editorconfig, Prettier and ESLint over the whole repo, Vitest of scripts/, check:versions, then check:all in every package
npm run check:format    # EditorConfig, Prettier and ESLint over the whole repo (one root config each)
npm run fix:format      # eslint --fix and prettier --write over the whole repo
npm run clean           # Remove all node_modules
npm run check:packages  # Full gate (check:all) in every package
npm run check:<name>    # Full gate in one package: validator, ddd, criteria, criteria-adapters, crypto-tools
npm run check:versions  # Every package version and internal dep is 0.0.0-development
npm run check:audit     # npm audit of runtime deps + cargo audit of crypto-tools (network; CI audit.yml, weekly)
npm run version         # Dry-run of the release: current and next version of each package, writes release-plan.json
npm run release         # Deploy (CI): publish the planned packages and record them in releases.json
```

ESLint, Prettier and EditorConfig are global: one config at the root, run once over the whole repo by the root `check:format` (fixes: `fix:format`) (packages have no lint, format nor editorconfig scripts; `.claude/rules/tooling.md` explains the setup and how to verify it). Every package's `check:all` runs the same gate: tsc (src + test) → vitest with coverage → build (CJS + ESM) → dist check. CI on pull requests runs `npm run check` (and `.github/workflows/audit.yml` runs `npm run check:audit`, also every Monday); the release workflow (push to `main`/`release`, GitHub environment `deploy` with the `NPM_TOKEN` secret) only builds and publishes. The husky hooks only call npm scripts, never custom commands: `pre-commit` runs `npm run check:format` and `pre-push` runs `npm run check:versions`; the rest of the gate is left to CI.

The root `scripts/` holds only the general tools (packages have no `scripts/` folder); each package calls them as `node ../../scripts/<name>.js` and they act on the current package directory:

- `scripts/fix-esm.js` — adds `.js` to relative imports in `dist/esm`, gives files that call `require()` a `createRequire` shim (so optional deps loaded with `require` also work in ESM) and writes `dist/esm/package.json` (`type: module`).
- `scripts/check-dist.js` — `main`/`module`/`types` exist, CJS and ESM load and expose the same exports, and the package documentation is valid and packed (`scripts/lib/package-docs.js`: `files` includes `SKILL.md`, the README mentions it, the `SKILL.md` frontmatter has exactly `name: archi-code-<name>` and `description`, and `npm pack` carries `README.md`, `LICENSE` and `SKILL.md`).
- `attw --pack .` ([`@arethetypeswrong/cli`](https://github.com/arethetypeswrong/arethetypeswrong.github.io), root devDependency, part of every `check:dist`) — packs the package and checks that the types of every entry point resolve, in the right format, for node10, node16 (from CJS and from ESM) and bundler consumers. Each `exports` condition must carry its own `types` (`import` → `dist/esm`, `require` → `dist/cjs`).
- `scripts/check-browser.js` — first checks the ESM build statically (the `browser` field and condition point to it with their own `types`; relative imports end in `.js`; bare imports only name runtime `dependencies`; no Node-only globals), then serves the package's `dist/` and runs the `browser` checks of `test/dist/dist.check.js` inside real Chromium and WebKit pages through Playwright (root devDependency; `npx playwright install` once, `CHECK_BROWSERS=chromium` narrows it). Each check is `[name, pageFunction, { csp, input, verify }?]`: the function runs in a page served with that Content-Security-Policy, receives the URL of the ESM entry (or `{ entry, input }` when `input()` prepares data in Node) and returns `true` or an error message, or a value that `verify(result, input)` checks in Node (how web↔Node interoperability is tested: Node encrypts, the page decrypts, Node verifies what the page signed…). It runs the `browser` hooks of every entry point (`test/dist/<module>.check.js` for subpaths), serves the package's runtime `dependencies` (recursively) under `/node_modules/<name>/` with an inline import map (its hash is added to a page's `script-src`), and serves the package's `test/` helpers transpiled from TypeScript at `/test/<path>`, so a page can import a test harness such as a contract.
- `scripts/embed-wasm.js` — turns a `wasm-pack --target no-modules` output into a generated `.ts` module (wasm gzipped as base64, decompressed with `DecompressionStream`, + glue as text) and refuses glue that needs Node or imports modules. `scripts/lib/web-safety.js` holds the checks it shares with `check-browser.js`.

Checks specific to one package's build live in that package, in `test/dist/dist.check.js` (every package has one; vitest ignores it because it is not a `.spec.ts`). They must exercise the real API, not just load it. It may export `smoke(m)` (run on CJS and ESM), `crossBuild(cjs, esm)` (check-dist) and `browser()` (check-browser); each returns `[name, check]` pairs where `check()` returns (or resolves to) `true` or an error message. `scripts/lib/package-checks.js` loads and runs them.

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

Every package follows `.claude/rules/packages.md` (layout, `package.json`, tsconfig, Vitest, tests, build checks, documentation, allowed extensions and a checklist). Each package ships an English `README.md` with its whole API and a light `SKILL.md` (Claude Code skill `archi-code-<name>`: rules, patterns and common mistakes; for the API it sends the assistant to the installed README) that consumers link into `.claude/skills/` with the README command (a symbolic link to `./node_modules/@archi-code/<name>/SKILL.md`, run from the project root on each user's machine, never a copy nor committed). Create new packages with `node scripts/new-package.js <folder> "<description>"` or the `/new-package` skill; the result passes `check:all` from the start.

## Architecture

npm workspaces monorepo publishing independent npm packages implementing DDD patterns (released with `scripts/release.js`, see Versions and release; the root `workspaces` list them in dependency order, so `npm run build` = `npm run build -ws` builds each package after its internal deps, pinned by `scripts/__tests__/workspaces.test.js`). All packages compile to both CJS and ESM targeting ES2020. Each package declares only its runtime `dependencies` and `peerDependencies`; every devDependency (Vitest, test doubles, test databases, benchmark tools) lives in the root `package.json`.

### Packages and npm names

| Directory           | npm name                        | Purpose                                                                                                                     |
| ------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `validation`        | `@archi-code/validation`        | Validators (TypeScript port of validator.js), `canBe*`/`to*` conversions, `@Validations` decorator                          |
| `ddd`               | `@archi-code/ddd`               | DDD by layer as subpaths: `/domain`, `/application`, `/infrastructure`, each with its own exceptions                        |
| `criteria`          | `@archi-code/criteria`          | Database-independent Criteria: typed `where`/`orderBy`/pagination, URL text, input schema with limits                       |
| `criteria-adapters` | `@archi-code/criteria-adapters` | Criteria adapters as separate subpaths: `/memory` (reference semantics), `/mongodb`, `/indexeddb`; shared internal contract |
| `crypto-tools`      | `@archi-code/crypto-tools`      | Crypto toolkit in one Rust→wasm module run in workers (web + Node): password, cipher, RSA, signature, hash, token, JWT      |

### Dependency graph

```
@archi-code/validation  (zero runtime dependencies — foundation)
    ↑
    └── @archi-code/ddd      (runtime: @archi-code/validation, uuid;
                              subpaths /domain ← /application ← /infrastructure;
                              internal src/shared below domain)

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
- `@archi-code/criteria` has the web build extension (`browser` field and condition, `check-browser`
  in `check:dist`), so its smoke checks use `m.isDate`, never `instanceof Date`.
- `/mongodb` never imports the driver in `src/` (structural `MongoCollection`); its contract
  spec runs on a real MongoDB through `mongodb-memory-server` (root devDependency, downloads `mongod` on
  first use into `~/.cache/mongodb-binaries`, which `ci.yml` caches) with the driver 7 and 6
  (`mongodb-v6` alias), and `mongo-indexes.spec.ts` checks with `explain` that the translated
  filters read only matching documents through an index. Converter errors become `CriteriaError`
  `INVALID_VALUE`.
- `/indexeddb` picks one key range from the required conditions (`planIndexedDbQuery`, pure)
  and re-checks every record with `matchesFilter`; text bounds with code units from U+D800 are not
  used as key ranges and a sorted walk that meets one sorts in memory (IndexedDB orders by UTF-16
  code unit). The package runs `check-browser`, whose import map serves the bare
  `@archi-code/criteria` import: `/memory` and `/indexeddb` run the whole contract in Chromium
  and WebKit, on each browser's real IndexedDB in three store layouts; vitest uses
  `fake-indexeddb`.

### ddd package internals

The DDD package, split into three subpath modules (no `"."` entry, `typesVersions` for `moduleResolution: node`): `src/domain/` (imports `shared`), `src/application/` (imports `domain`, `shared`) and `src/infrastructure/` (imports all of them), each crossing into another only through its `index.ts`. `src/shared/` (user rule 2026-10-22) is an internal module, not a subpath (no `exports`, `typesVersions` nor build hook): code every layer shares; it imports nothing and holds the exception base (`exceptions/`: `AbstractException`, `ExceptionOptions`, `ExceptionBrand`, `ReceivedValue`; internal, never exported, user decision 2026-10-22) and `IssueCollector` (`collectFields`/`collectItems` with an `IssueReader`: runs every build, asks the reader for the issues of each error (`null` → rethrow), prefixes each issue with its path and throws its own `IssueCollectionError`; it knows no layer exception, user decision 2026-10-22). The domain (`CompositeIssues`, `type/composite/`) and `ValueObjectBuilder` pass a reader of `ValidationException`/`DomainException` and turn `IssueCollectionError` into one `ValidationException`. `test/cross/module-boundaries.spec.ts` fixes that graph (`INTERNAL_MODULES` are left out of the subpath check and no public `index.ts` may re-export them), the allowed packages (`@archi-code/validation`, `uuid`) and forbids cycles, also type-only ones. Build hooks live in `test/dist/<module>.check.js`. The spec also fixes that `domain/repository/` exports only types and the `AggregateRepository` base (no verb nor code), that `application/ports/` exports types only and that `application/use-case/` imports neither another use case nor a listener. Where each class of a consumer project goes (value object, aggregate, event, business error, specification and domain service in domain, split by kind into `aggregate/`, `entity/`, `value-object/`, `event/`, `exception/`, `repository/`, `service/`, `specification/`; the abstract repository of each aggregate in domain; user and reaction use cases, consumer copies of foreign events, data types and read models in application, one folder per business action; repositories and adapters in infrastructure; controllers in `interfaces/`; one `composition.ts` per context), what it may import and how it is named is the "Architecture rules" table of the README and `ddd-skills/archi-code-ddd/where-each-class-goes.md` (user rules). Key concepts of `domain`:

- **`Entity<Id>`** (`entity/entity.ts`, user rule 2026-10-18) — only `readonly id` and `equals` (same class + `id.equals`). `Id extends EntityId` (`AbstractType & RequiredMarked`: `IdType` or a `Required(...)` type) and an id holding no value throws `RequiredValueException` (books: stable, early identity, IDDD ch. 5). Child entities extend it, hold their id and value objects and may have business methods (no setters) that only their root calls (IDDD ch. 5/10, books-first decision 2026-10-18); a part nobody looks up by id is a `Composite`.
- **`AggregateRoot<Id>`** (`aggregate/aggregate-root.ts`) — extends `Entity<Id>` (`super(id)`), domain events via `record()` (protected, keeps the event as it is: events are not frozen, their fields are `readonly`) / `pullDomainEvents()` (typed `EventBase[]`), pending events are a plain private array. There is no union type of an aggregate's events (user rule 2026-10-25): `AggregateRoot`, `EventBus`, `DomainEventBus` and `EventRegistry` have no event type parameter and work with `EventBase`; only `EventListener<Event>` names the one event class it handles. It carries no version (user decision 2026-10-21, `version`/`restoreVersion`/`markPersisted` removed): optimistic concurrency (IDDD ch. 10) belongs to the repository, which remembers the version of every aggregate object it loaded or saved in a private `WeakMap<X, number>` (unknown object = new, version 0), stores version + 1 next to the primitives and throws `ConcurrencyException('<Aggregate>', id, version)` on a stale save or an existing id for a new aggregate.
- **`AbstractType<T>`** (`type/abstract-type.ts`) — Base for all value objects: `value`, `isNull`, `toString()` (a method), `equals()` (same constructor + `protected hasSameValue(other: this)`, which receives the other value object of the same class and compares `this._value === other._value` by default; `DateType` overrides it by instant, `JsonType` by content (any key order), `ArrayType` item by item with each item's `equals`, which `hasItem`/`withoutItem` also use; a custom type holding an object overrides it), `validate()`. Always valid (user rule, from the DDD skill suite in `packages/ddd/ddd-skills`): the constructor converts, checks `Required` and runs every `@Validations` rule, throwing one `ValidationException` whose `errors` are `ValidationIssue`s (`{ field: string | null, code, message: '<Class>: <message>' }`; `code` is the validator or custom rule name, or the code of the `DomainException`; `ValidationIssueInput` makes it optional, `DOM001` by default); there is no `assertValid()`, and `validate()` only re-runs the rules. `ValueObjectBuilder.build({ field: () => new X(...) })` / `buildList` (`src/application/value-object-builder/`, exported by `/application`; user decision 2026-10-22: it is used in `toCommand`, never in the domain) run every factory and throw one `ValidationException` with the `field` path of every problem (required, conversion, rules, any `DomainException`; other errors pass through): every field is always reported, never only the first (user rule). `ArrayType` never uses it (user rule 2026-10-22: its items arrive already valid): it builds its items in order, lets the error of the first invalid item through as it is and then runs the list rules (`field: null`); its `validate()` override keeps an item branch that is now unreachable (`v8 ignore`). Validation by layer: the input adapter checks only shape, value objects each value (built in `toCommand`), the aggregate invariants, a domain service rules over several aggregates, the use case authorization. `_value` is `protected readonly`: value objects never change; `ArrayType.withItem/withoutItem` return a new instance (`new this.constructor(values)`). The constructor itself turns empty input (`null`, `undefined`; a blank text is a value and reaches `filter`) into null, calls `filter` and applies the required check (in the `AbstractType` constructor; user decision 2026-10-19: no separate `TypeInput` class, the value object owns it). Delegates by composition to the static class `RequiredMark` (`type/required/`). Each value object guarantees its own immutability (user rule 2026-10-22, the shared `Immutable` helper was removed): `DateType` holds an `ImmutableDate` declared in `date-type.ts` (frozen, setters throw), `JsonType` deep-freezes its copy with a private `deepFreeze`, `ArrayType` freezes its list. Helpers are grouped as one static class per folder, never loose functions; `Required(...)`, `Composite(...)` and the `ListensTo(...)` decorator are the only functions. `Required(...)` declares `@Validations([{ validator: 'isRequired' }])` and names its class `Required(<Base>)`. `validate()` keeps no state: it only calls the `@archi-code/validation` validator and returns its result.
- **`Composite(schema)`** (`type/composite/`, user decision 2026-10-18, from IDDD ch. 6 in the skill suite) — base class of a value object of several fields: the schema maps each field to a value object class, another composite class or a list `[Class]`. The constructor takes value objects (missing → `RequiredValueException`, another class → `TypePrimitiveException`, checked at runtime because TS is structural), runs `@Validations` `custom` rules with the built composite (rules over several fields, `field: null`) and freezes the instance; `equals` (class + every field), `toPrimitives()`, `static fromPrimitives(data)` built with `CompositeIssues` (over `IssueCollector` of `src/shared`) (every field and list item reported with its path). The schema is resolved once by `CompositeField.of(spec)` into a value, nested composite or list field (each with `accept`, `fromPrimitive`, `toPrimitive`, `equals`). Recognized across builds by a `Symbol.for` brand (`CompositeBrand`). `PrimitiveTypes` treats it as plain fields; composite fields are always present (optional = `X | null` in the aggregate).
- **`Specification<T>`** (`specification/specification.ts`) — abstract `isSatisfiedBy`, `and`/`or`/`not` (short-circuit, return `Specification<T>`; `and`/`or` accept any `SatisfiedBy<T>`, the books' interface); receives loaded data, never a repository, never guards an aggregate invariant.
- **Value objects** — `StringType`, `NumberType`, `BooleanType`, `DateType`, `UuidType`, `EnumType`, `JsonType`, `ArrayType` (`type/<name>-type.ts`). Optional by default (`T | null`); `Required(XType)` makes the constructor ask for `T` and throws `RequiredValueException` when empty. Conversions come from `@archi-code/validation`; validations are declared with its `@Validations`. `DateType` rejects date-times without a zone and its constructor takes `Date | string` (`AbstractType<T, Input = T>`: `Input` types the constructor and `Required(...)` derives from it; `Composite.fromPrimitives` takes a `CompositeInput`, each field what its constructor takes; user decision 2026-10-19); `UuidType`/`IdType` store lowercase. `CreatedAt`, `UpdatedAt` and `IdType` are required types; `IdType<Brand>` takes the class name as a type-only brand (`class OrderId extends IdType<'OrderId'> {}`) so ids of different aggregates are not interchangeable at compile time (user decision 2026-10-19).
- **Exceptions** (user decision 2026-10-22: each layer declares and exports its own in `src/<layer>/exceptions/`; there is no `/exceptions` subpath) — the internal `AbstractException` (`src/shared/exceptions/`, never exported) → `DomainException` (`/domain`) / `ApplicationException` (`/application`) / `InfrastructureException` (`/infrastructure`). Specifics: domain `ValidationException` (keeps `errors`), `TypePrimitiveException`, `RequiredValueException`, `InvalidEventDefinitionException` (DOM005, an event class without `static eventName`); `TypePrimitiveException` and `RequiredValueException` quote at most 64 characters of the received value (`shared/exceptions/received/received-value.ts`, `ReceivedValue`); application `ConcurrencyException` (APP001), `AggregateNotFoundException` (APP002, user rule: thrown by use cases, moved from domain 2026-10-18; DOM002 is no longer used), `NotAllowedException` (APP003, authorization in use cases) and `UnexpectedErrorException` (APP004, `UseCase` wraps unknown errors in it and `ValueObjectBuilder` throws it for an asynchronous factory); infrastructure `InternalErrorException`, `UnknownEventException` (INF002), `EventDeliveryException` (INF003, `errors` of every failed consumer, thrown by the parallel in-memory channel). The base classes, `InternalErrorException` and `UnexpectedErrorException` take `{ cause }`, and so do `ConcurrencyException`, `AggregateNotFoundException` and `NotAllowedException` as their last argument (`ValidationException`, `TypePrimitiveException`, `RequiredValueException`, `UnknownEventException` and `EventDeliveryException` take none); codes in one exported enum per layer (`DomainExceptionCode`, `ApplicationExceptionCode`, `InfrastructureExceptionCode`; each base passes its enum to `AbstractException`, which names the codes in `description`; `E000` is the internal fallback). Every built-in class is branded with its code (`shared/exceptions/brand/exception-brand.ts`, `Symbol.for` keys) and its `Symbol.hasInstance` also matches instances from the other build (CJS/ESM); user subclasses only match natively.
- **`EventBase`** (`event/event-base.ts`) — a plain DTO of primitives with no methods. `super(metadata?)` with `EventMetadata` `{ eventId?, occurredOn?, clock? }` sets the own `readonly` fields `eventName` (copied from the subclass's `static readonly eventName`, `EventClass` type; a missing or blank one throws `InvalidEventDefinitionException`), `eventId` (UUID v4 via `IdType`) and `occurredOn` (ISO text in UTC: the stored value, a `Date` or ISO string with zone, else `clock.now()`, else system time; the clock is not kept). Listeners and registries refer to events by class. The event is its own JSON: `{ ...event }` / `JSON.stringify(event)` give `{ eventName, eventId, occurredOn, ...fields }` in that order (`DomainEventBus.publish` sends `{ ...event }`; `EventRegistry` compares `occurredOn` with `Date.parse`). An event has no `aggregateId` (the id of the aggregate is a field the subclass declares, `readonly orderId: string`) and no schema version (an incompatible change of its data is a new `eventName`, or a registry factory that reads both shapes). User rule, not checked at run time: each event declares as `readonly` constructor fields only the primitive data it needs (value objects → their `.value`, money as `{ amount, currency }`, dates as ISO text), never value objects, `Date`s nor class instances.
- **Repository contracts** (`src/domain/repository/`, user rule 2026-10-25, replaces the role-segregated repositories): `AggregateRepository<A>` (`aggregate-repository.ts`), an abstract class with no verb nor code (a type-only `aggregateBrand` binds it to its aggregate), is the base of the one abstract repository per aggregate each context declares in `domain/repository/<Aggregate>Repository.ts` (`abstract class OrderRepository extends AggregateRepository<Order> implements AggregateFinder<Order>, AggregateSaver<Order>`) with, as `abstract`, only the verbs its business needs (none mandatory), each the method of its role so all repositories share verbs and signatures: `AggregateFinder<A>` (`findById`), `AggregateSaver<A>` (`save`), `AggregateRemover<A>` (`remove(aggregate)`, the book's name [IDDD ch. 12]; it receives the loaded aggregate and checks its version like `save`), types only; nothing else in it. Every use case and reaction of the aggregate receives that abstract class, never a role or an intersection of roles; adapters `extends OrderRepository`. Repositories only get and persist (user rule 2026-10-18): no business logic, no business queries, no `nextId()` (ids from `XId.generate()`); selections are read queries of the application. One repository adapter per aggregate and technology (user decision 2026-10-19): it extends the abstract repository of its aggregate; its constructor receives only its technology (collection, pool), never an aggregate class nor a mapper; aggregates only go in and out through its methods; the aggregate converts itself (`toPrimitives`/`static fromPrimitives`, never a domain service) and the repository calls those methods directly (no mapper, no runtime shape check: user decision 2026-10-19, `AggregateMapper` and `AggregateShape` removed). The package ships no repository: each project writes its in-memory one in `infrastructure/persistence/` (an application that runs in memory, like the example) or in `test/support/` as a test double (the package's own reference is `test/cross/in-memory-order-repository.spec.ts`).
- **Application** (`src/application/`) — `UseCase<Input, Command, Output>`: `execute(input)` calls `protected toCommand(input)` (builds and validates the value objects with `ValueObjectBuilder`) and then `protected handle(command)` (sync or async), keeps package exceptions and wraps any other error of either step in `UnexpectedErrorException` with `cause`; it has no helpers (loading, saving and publishing are written in `handle`, user rule). A use case never imports another use case (user rule). **Event contract** (`application/event/`, user rule 2026-10-19: the application holds only the contract to publish and to listen; `module-boundaries.spec.ts` pins its three files): `EventBus` (`event/event-bus.ts`, `publish`, the only one a use case may import from `event/`), `EventListener<Event>` (`event/event-listener.ts`, abstract `handle(event)`) + `@ListensTo(EventClass, { consumer })` (`event/listens-to.ts`: one event per listener and a required, explicit consumer name (the listener's identity in the channel, never the class name, which minifiers change), stored as a `ListenerSubscription` `{ eventName, consumer }` under `Symbol.for('@archi-code/ddd/listens-to.v1')`, not inherited; read with `ListensTo.subscriptionOf(listener)`; `ApplicationException` when decorated twice, not at all or without a consumer); a listener IS a use case (user rule 2026-10-25, "reaction use case"): one class `<Action>On<Event>` extending `EventListener` with `@ListensTo(XDomainEvent, { consumer: '<context>.<action>-on-<event>' })` whose `handle` builds the value objects with `ValueObjectBuilder`, finds or creates the aggregate (returning when it is missing or the derived id is taken), calls a reaction method that returns silently when it does not apply, saves and publishes; no `UseCase` class behind it, no authorization, no `AggregateNotFoundException` nor business errors. A context never imports another context's event class: it declares its own copy (same class name and `eventName`, only the fields it reads) next to the reaction. User rules for use cases, stated in the README and SKILL: each does one thing (one business action, one aggregate saved once, except the IDDD ch. 10 cases written down as an explicit decision) and is named after the business action (`PlaceOrder`, `ShipOrder`), never technical/CRUD names (`OrderService`, `UpdateOrder`). The event transport is infrastructure (`infrastructure/event/`): `EventChannel` (types only, `send(serialized[])`, `receive(eventName, consumer, handler)` → `ChannelSubscription { close() }`) is the only piece a technology implements (user decision 2026-10-19: swapping RabbitMQ/DB/memory changes only the channel). `DomainEventBus(channel, registry)` implements `EventBus` for every channel: `publish` sends the JSON in one `send`; `subscribe(listener)` → `Subscription { unsubscribe() }` reads `ListensTo.subscriptionOf`, refuses an event the registry lacks (`UnknownEventException`), passes the declared `consumer` and hands the listener the event rebuilt by `EventRegistry` (`register(EventClass, factory)`, a second registration of the same event is an `InternalErrorException`; `has`; `fromJSON(serialized)` takes a parsed `SerializedEvent`, parsing a message body is the channel's job, returns the event the factory built (not frozen) and throws `InternalErrorException` when the factory loses the `eventId` or `occurredOn`). `test/contract/event-channel-contract.ts` (`describeEventChannelContract`) is the suite every channel runs. Ports (`application/ports/`, types only): `Clock`, `Logger` (`debug`/`info`/`warn`/`error`, each `(message, context?)`, plus `LogLevel` and `LogContext`; the contract any logging library implements, `console` and winston fit it as they are; user decision 2026-10-19: method `warn`, `UseCase` does not log, each use case that needs it receives the port by constructor; the domain never logs). There is no transaction port (user decision 2026-10-19, `TransactionRunner`/`InMemoryTransactionRunner`/`TransactionParticipant` removed): the repository owns the transaction and everything about persistence (each `save`/`remove` atomic, a DB transaction opened inside `save` when an aggregate spans several tables, version check, connections, driver errors, an outbox when events must not be lost); use cases load, change, save and publish without opening transactions.
- **Infrastructure** (`src/infrastructure/`) — `DomainEventBus`, `EventRegistry` and `EventChannel` (`event/`, see the event contract above), `InMemoryEventChannel({ delivery: 'serial' | 'parallel' })` (`event/in-memory/`, every in-memory piece of a channel lives there: the `EventChannel` built on an internal `Emitter` that ports emittery's techniques — `Map<name, Set<handler>>`, dispatch after a microtask, snapshot + `has()` guard, `emitSerial` (first error rethrown) / `emit` (`Promise.allSettled` → `EventDeliveryException`); refuses a second open receiver for the same event and consumer; each consumer gets its own JSON copy; `sent` for tests), `ConsoleLogger({ level, clock })` / `InMemoryLogger` (`entries`) / `SilentLogger` (the default) in `logging/` (`LogSerializer`, internal, turns the context into one JSON line: errors with code, errors, stack and cause, `bigint`, circular references, never throws); `DomainEventBus(channel, registry, logger?)` logs `debug` what it published (`eventName` and `eventId`, no payload), `info` subscriptions and, before rethrowing, a failing listener as `warn` (`DomainException`/`ApplicationException`) or `error` (anything else), `SystemClock`, `FixedClock`. No protocol adapter (user decision 2026-10-21): entry points translate errors themselves from `ExceptionClassifier.classify(error)` of `/infrastructure` (`infrastructure/exceptions/kind/`), which returns an `ExceptionKind` (`NotFound` `AggregateNotFoundException`, `NotAllowed` `NotAllowedException`, `Conflict` `ConcurrencyException`, `Internal` `UnexpectedErrorException`/`InvalidEventDefinitionException`, `Malformed` `TypePrimitiveException`/`RequiredValueException`, `Invalid` any other `DomainException`, `Rejected` any other `ApplicationException`, `Internal` otherwise).
- **`PrimitiveType`** — value objects → value (an enum value object → its enum option, so `fromPrimitives` needs no cast), `null` → `null`, any other object (child entities, composites) → its `PrimitiveTypes`, raw `string`/`number`/`boolean`/`Date` and anything else → `never`.
- **Aggregate conversion** (user rule: the domain holds no persistence concern, repositories receive aggregates) — all aggregate state is value objects (or lists of them, or child entities (`extends Entity<Id>`) and composites made of them), exposed by getters named like the field without `_`; each aggregate has `static fromPrimitives(PrimitiveTypes<X>)` and `toPrimitives()` and is the only owner of its conversion; nothing checks private state at run time (`PrimitiveTypes` does not see private fields), so each aggregate has a round-trip test.
- **Tests** — `src/` holds only code; every spec lives in `packages/ddd/test/`, mirroring the `src/` folder tree (`src/domain/type/string-type.ts` → `test/domain/type/string-type.spec.ts`).
- **Skill** — `SKILL.md` is the single entry point (user rule 2026-10-18): it routes every DDD question to the suite in `ddd-skills/` (Spanish, source of truth, shipped through `files`, never installed separately; its guides have no frontmatter so no tool loads them as skills, user decision 2026-10-18), whose examples are written with this package's API (the classes of `src`, no generic base classes nor translation table; user decision 2026-10-19) (the package rules, patterns and mistakes are split into `ddd-skills/archi-code-ddd/*.md`, listed by the light root `SKILL.md`); `test/cross/skill-suite.spec.ts` guards the routing and the packing.
- **Example** — `packages/ddd/example/` (user decision 2026-10-22, an extra folder outside `test/`) is an end-to-end online shop with three contexts (Sales, Payments, Shipping) integrated only through events on one serial `InMemoryEventChannel`, written against `src/<layer>/index` through its `src/ddd/*.ts` re-exports. Its `src/` holds only the example (user rule 2026-10-23: no tests, no console nor tooling); its own `tsconfig.json` is type-checked by `check:types`. Its `README.md` is an implementation spec for LLM agents and the reference of the conventions of code built on the package (user rule 2026-10-25: where they differ, the example wins): events `<Aggregate><PastAction>DomainEvent` with `eventName` `'<aggregate>.<past_action>'` and one constructor object `{ …fields } & EventMetadata`; aggregates with a public constructor that only assigns, `static create(id, ...valueObjects, clock)`, a local `interface Clock`; business errors without the `Exception` suffix and with per-context codes; reaction use cases. `SKILL.md`, `ddd-skills/archi-code-ddd/`, the Spanish suite and the package README follow them. The README links it by GitHub URL; `SKILL.md` does not.
- **Gate** — `npm run check:ddd` (root): the common `check:all` gate with 100% coverage; `test/dist/{domain,application,infrastructure}.check.js` smoke-test each module, its exceptions included, in both builds; `crossBuild` checks exception `instanceof` and `ExceptionClassifier` across CJS/ESM; `browser` runs each module in Chromium and WebKit through `check-browser` (import map for `@archi-code/validation` and `uuid`'s browser build; `/domain` under a strict CSP), and the package declares `sideEffects: false`. Specs describe real usage situations (orders, customers, payments…), not abstract fixtures.

### TypeScript config hierarchy (per package)

```
tsconfig.json  (extends ../../tsconfig.base.json, includes src/ and test/)
└── tsconfig.build.json  (rootDir ./src, compiles only src/)
    ├── tsconfig.cjs.json  → outDir: ./dist/cjs, module: CommonJS
    └── tsconfig.esm.json  → outDir: ./dist/esm, module: ES2020
```

### Code style

- **Prettier**: single quotes, trailing commas, print width 100, 2-space indent, semicolons.
- **Tooling check**: `.claude/rules/tooling.md` describes how ESLint, Prettier and EditorConfig are configured and the procedure to verify that they are well configured and working.
- **ESLint**: TypeScript strict + Prettier enforced. `any` and `Function` types are allowed.
- Test files: `*.spec.ts` convention. In every package `src/` holds only code and specs live in the package's `test/` folder, mirroring `src/`.
- **Imports**: inside `src/`, import each symbol from the file that declares it, never through a re-exporting `index.ts` (see `.claude/rules/packages.md`).
- **English only**: everything in the repository is written in English: code, identifiers, comments, test names, error and log messages, scripts, README files, skills, rules and other documentation. Non-ASCII text is allowed only as test data. (Talking to the user in Spanish is fine; what gets written into the repo is English.)
- **No comments**: code must describe itself through names (variables, functions, classes, tests) and structure. Do not add comments, docblocks or section banners. A comment is the exception, only when it is truly necessary to explain a non-obvious _why_ that the code cannot express.

### Testing

- Vitest 5 everywhere: each package has its own complete `vitest.config.mts` (v8 coverage over `src/**/*.ts`, threshold 100% for statements, branches, functions and lines) and the root `vitest.config.mts` runs `scripts/__tests__` (`npm run test:scripts`). Each package's `test/index.spec.ts` pins its public API.
- Nothing is global (`globals: false`): every spec imports from `vitest` what it uses (`describe`, `it`, `expect`, `vi`, `expectTypeOf`) and from `../src/...` the code under test; no package depends on another for its tests. Module isolation uses `vi.resetModules()` + `await import()`, globals are replaced with `vi.stubGlobal`, and coverage hints are `/* v8 ignore … -- @preserve */`.
