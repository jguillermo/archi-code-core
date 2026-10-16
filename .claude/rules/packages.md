---
paths:
  - 'packages/**'
  - 'scripts/**'
---

# Package standard

Every package under `packages/` follows this standard so they stay consistent. New packages are
created with `node scripts/new-package.js <folder> "<description>"` (or the `/new-package` skill),
which writes exactly this layout. When you touch a package, check it against the checklist at the
end and fix any deviation; when you change the standard, change this file, the generator and every
package in the same change.

## Layout

```
packages/<folder>/
├── src/                     # code only, no specs
│   └── index.ts             # the public API (named exports only)
├── test/                    # every spec, mirroring the src/ tree
│   ├── index.spec.ts        # asserts Object.keys(api) === PUBLIC_API
│   ├── <same path as src>/<file>.spec.ts
│   └── dist/dist.check.js   # build checks specific to this package
├── package.json
├── tsconfig.json  tsconfig.build.json  tsconfig.cjs.json  tsconfig.esm.json
├── vitest.config.mts        # the package's complete Vitest config
├── .gitignore  LICENSE  README.md  SKILL.md
```

- No `scripts/` folder inside a package: build and check tools live only in the root `scripts/`.
- Folder name is lowercase kebab-case and equals the npm name: `packages/<folder>` → `@archi-code/<folder>`
  (the `check:validator` root script is a legacy exception; do not copy it).

## package.json

- `version` always `0.0.0-development`, and every internal `@archi-code/*` dependency (any field)
  too: the real versions live only in `releases.json` (written by the release in GitHub Actions) and in
  what is published. The release writes them into the published `package.json`;
  `npm run check:versions` fails otherwise.
- `name` `@archi-code/<folder>`, `author` `Jose Guillermo`, `license` `MIT`, `repository` the
  monorepo, `engines.node` `>=24`, `publishConfig.access` `public`, `files` `["dist/", "SKILL.md"]` (npm adds `README.md` and
  `LICENSE` on its own).
- Entry points: `main` `./dist/cjs/index.js`, `module` `./dist/esm/index.js`, `types`
  `./dist/cjs/index.d.ts` (a package with only subpath modules has none of them; see "Allowed
  per-package extensions").
- `exports` — each condition carries its own types:

  ```json
  ".": {
    "import": { "types": "./dist/esm/index.d.ts", "default": "./dist/esm/index.js" },
    "require": { "types": "./dist/cjs/index.d.ts", "default": "./dist/cjs/index.js" }
  },
  "./package.json": "./package.json"
  ```

- `scripts` — exactly these, with these values: `prebuild`, `build:cjs`, `build:esm`
  (`tsc -p tsconfig.esm.json && node ../../scripts/fix-esm.js`), `build`, `test`, `test:coverage`,
  `check:types`, `check:dist` (`node ../../scripts/check-dist.js && attw --pack .`),
  `test` (`vitest run`), `test:coverage` (`vitest run --coverage`) and `check:all`:

  ```
  check:types → test:coverage → build → check:dist
  ```

- No lint, format nor editorconfig scripts and no `.prettierignore` in a package: ESLint, Prettier
  and EditorConfig have one config at the root and run once over the whole repo from the root
  `check:format` and fixed by `fix:format` (see `.claude/rules/tooling.md`).

- Tests run on Vitest. `vitest.config.mts` is complete in every package (no shared base; Vitest
  does not look for a config in parent folders): `environment` `'node'`, `include`
  `['test/**/*.spec.ts']`, `globals` `false`, and `coverage` with `provider` `'v8'`, `include`
  `['src/**/*.ts']` (without it, files no test imports escape coverage), `reportsDirectory`
  `'./coverage'` and `thresholds` `{ 100: true }`.
- Coverage threshold: 100% (statements, branches, functions, lines) in every package. Never delete
  code to reach it: cover it with a test, or mark a defensive branch no test can reach with
  `/* v8 ignore next -- @preserve */` (or `if`/`else`; without `@preserve` the transform drops the
  hint).
- Runtime deps in `dependencies`; optional heavy libraries as optional `peerDependencies`. A
  package declares no `devDependencies`: every dev and test tool (Vitest, test doubles, databases
  for tests, benchmark libraries…) goes in the root `package.json` with an exact version, so each
  package lists only what its code needs at run time (`scripts/__tests__/workspaces.test.js`
  fails otherwise).

## Documentation

Everything in this repository is written in English: code, comments, test names, messages, scripts,
README files, skills, rules and any other documentation. Non-ASCII strings are allowed only as test
data (e.g. `'contraseña'` to test a non-ASCII password). Both package documents are written for the
people (and the AI assistants) that consume the package:

- `README.md` explains the whole public API with examples that run against the build (results shown
  in comments are the real ones): `## Installation`, `## Import`, one section per concept, errors, a
  table of every export, `## AI assistant skill` and `## License`. The skill section shows the
  one-line install command (`mkdir -p … && cp …`), a `### How to use` subsection with three example
  prompts for that package (explicit `/archi-code-<name> <task>`, a task that loads it on its own, a
  review of existing code) and a `### Keeping it up to date` subsection (copy it again after updating
  the package, commit `.claude/skills/`). Nothing about the internal gate or the release.
- `SKILL.md` is a light Claude Code skill: a YAML frontmatter with exactly `name`
  (`archi-code-<npm name without scope>`, e.g. `archi-code-domain`) and `description` (what it does
  and when to use it), then the title `# archi-code-<name>` and only what rarely changes, in this
  order: `## Full API` (sends the assistant to `node_modules/@archi-code/<name>/README.md`, the
  installed version, before using anything the skill does not show, with
  `node -p "require.resolve('@archi-code/<name>/package.json')"` as the fallback for workspaces and
  pnpm); `## Related skills` (the other `archi-code-*` skills it is used with); `## Import`, whose
  block names every symbol the patterns use so they compile as copied; `## Rules`;
  `## Recommended patterns` taken from the README; and `## What not to do`. No API tables nor export
  catalogs: the README is the only place that describes the API, so a copied skill stays valid when
  the package is updated. Consumers copy it from `node_modules/@archi-code/<name>/SKILL.md` to
  `.claude/skills/archi-code-<name>/SKILL.md` with the README command.
- `check-dist.js` fails when `files` lacks `SKILL.md`, the README does not mention it, the
  frontmatter is invalid or `npm pack` would leave `README.md`, `LICENSE` or `SKILL.md` out;
  `release.js` checks the same files in the real tarball. Update the README whenever the public API
  changes, and the skill when a rule, pattern or common mistake changes.

## TypeScript

- `tsconfig.json` extends `../../tsconfig.base.json` and includes `src/**/*` and `test/**/*`.
- `tsconfig.build.json` sets `rootDir ./src`, `sourceMap false`, `incremental false`, includes only
  `src/**/*` and excludes `test`. `tsconfig.cjs.json` / `tsconfig.esm.json` only set
  `module`, `target ES2020` and `outDir` (`./dist/cjs` / `./dist/esm`).

## Imports

- Inside `src/`, import each symbol from the file that declares it
  (`'../exceptions/domain/type-primitive.exception'`), never through an `index.ts` that only
  re-exports it (`'../exceptions'`). Barrels inside a package hide dependencies and create import
  cycles; `index.ts` files exist to expose the public API. The one exception is a package with
  subpath modules: across modules, import only through the other module's `index.ts` (its public
  API). Specs in `test/` may import from the `src` barrels.
- WebStorm's "Import can be shortened" inspection suggests the opposite: disable it, and the
  directory (`index`) import option in Code Style › TypeScript › Imports (`.idea/` is not shared).

## Tests and build checks

- Specs import from `../src/...` and import from `vitest` every function they use (`describe`,
  `it`, `expect`, `vi`, `expectTypeOf`…): nothing is global. No comments in code (see CLAUDE.md).
- `test/dist/dist.check.js` (for `"."`; `test/dist/<module>.check.js` for each subpath module)
  exports `smoke(m)` (run on the CJS and the ESM build) and optionally
  `crossBuild(cjs, esm)` and `browser()`; each returns `[name, check]` pairs whose
  `check()` returns (or resolves to) `true` or an error message. The checks must call the real API
  (hash and verify, convert, persist and find…), not just test that it loads.
- The root scripts check every package the same way, once per entry point in `exports`:
  `check-dist.js` (entry files exist, CJS and ESM load with the same exports, `smoke`/`crossBuild`,
  no hook file for an entry that is not exported), `attw --pack .` (the types of every entry point
  resolve in the right format for node10, node16 from CJS and ESM, and bundler) and `fix-esm.js` (full `.js` specifiers, `createRequire` shim for `require()` in ESM,
  `dist/esm/package.json`).

## Allowed per-package extensions

Only when the package needs them, and documented in its README:

- Extra `compilerOptions` in `tsconfig.json` (e.g. `lib`).
- Extra folders (`benchmark/`, `docs/`): their own tsconfig type-checked in `check:types` and one
  script to run them (e.g. `benchmark`); the root lint and format already cover them. Generated
  output goes in the root ignore lists (`eslint.config.js`, `.prettierignore`,
  `.editorconfig-checker.json`).
- Extra `.gitignore` lines, `sideEffects`.
- A web build: `browser` field + `browser` export condition (with its own `types`) +
  `sideEffects: false` + `check-browser.js` in `check:dist` + `browser` in `dist.check.js`
  (`browser()` returns `[name, pageFunction, { csp, input, verify }?]`; each function runs in a real
  browser page and receives the URL of the ESM entry, or `{ entry, input }` when `input()` prepares
  data in Node; `verify(result, input)` checks in Node what the page returns, which is how web↔Node
  interoperability is tested). `check-browser.js` alone (without the rest of the web build) also fits a package
  whose ESM build imports its runtime `dependencies` by name: it serves them through an import map,
  runs the `browser` hooks of every entry point and serves `test/` helpers transpiled at
  `/test/<path>`. Before any page, it checks the ESM build statically: the `browser` field and
  condition point to it, relative imports end in `.js`, bare imports only name runtime
  `dependencies` and no Node-only global is used. Its `exports["."]` may add a `node` condition (nested `import` /
  `require`, each with its own `types`, so Node never takes the `browser` entry) and a last
  `default` pointing to the ESM build for resolvers that match no condition:

  ```json
  ".": {
    "browser": { "types": "./dist/esm/index.d.ts", "default": "./dist/esm/index.js" },
    "node": { "import": { "types": …, "default": … }, "require": { "types": …, "default": … } },
    "import": { "types": "./dist/esm/index.d.ts", "default": "./dist/esm/index.js" },
    "require": { "types": "./dist/cjs/index.d.ts", "default": "./dist/cjs/index.js" },
    "default": "./dist/esm/index.js"
  }
  ```

- A Rust core compiled to wasm (only `crypto-tools` today): the crate lives in `rust/` (`Cargo.toml`,
  committed `Cargo.lock`, `rust-toolchain.toml` pinning the toolchain, `.cargo/config.toml`); `rustfmt`
  formats it and `.editorconfig` gives `*.rs` 4 spaces. `build:wasm` runs `wasm-pack --target no-modules`
  into `wasm/` (gitignored) and `node ../../scripts/embed-wasm.js` turns it into
  `src/wasm/wasm-assets.generated.ts` (gitignored, in the root `.prettierignore`, ignored by ESLint,
  editorconfig and coverage). `check:rust` (fmt, clippy on wasm32 and native, `cargo test`), `fix:rust` and `check:audit`
  (`cargo audit`, accepted advisories in `rust/.cargo/audit.toml`) run inside `rust/` so rustup and
  cargo find their config. `build` starts with `build:wasm` and `check:all` starts with
  `check:rust → build:wasm`. CI installs the toolchain and wasm-pack.
- Subpath modules, for a package that groups independent modules (only
  `criteria-adapters` today). Each module lives in `src/<module>/` with its own `index.ts`, its
  specs in `test/<module>/` (with its own `index.spec.ts` pinning that module's API) and its build
  hooks in `test/dist/<module>.check.js`. `exports` lists only `"./<module>"` entries (each with
  `import`/`require` and their `types`) and `"./package.json"`; there is no `"."`, no `main`/`module`/
  `types`, and `typesVersions` maps every module to its `dist/cjs/<module>/index.d.ts` for
  `moduleResolution: node`. Inside a module, import from the declaring file; across modules only
  through `../<module>/index`. `test/cross/module-boundaries.spec.ts` is required: it pins the
  allowed module graph, checks that every module is an exported subpath, and forbids cycles,
  imports out of `src/`, deep imports into another module and imports of the package itself. Test
  harnesses shared by the modules (such as a contract) live in `test/<name>/` and are never
  published. One README (a section per module) and one `SKILL.md` cover every module.
- Extra keys in `vitest.config.mts` (e.g. `coverage.exclude` for generated files).

## When adding a package

1. `node scripts/new-package.js <folder> "<description>"` — writes the package and adds
   `check:<folder>` to the root `package.json`.
2. `npm install` at the root to link the workspace.
3. Replace the placeholder `PACKAGE_NAME` export with the real code, keeping
   `test/index.spec.ts` and `test/dist/dist.check.js` in sync with the public API.
4. Document the real API in `README.md` and the rules in `SKILL.md` (see Documentation).
5. Add the package to the tables and the dependency graph in `CLAUDE.md`.
6. `npm run check:<folder>` must pass. CI and `check:packages` pick the package up automatically.

## Checklist (validate every package against it)

- [ ] No specs in `src/`, no `scripts/` folder; `test/` mirrors `src/`.
- [ ] `src/` imports each symbol from its declaring file, never through a re-exporting `index.ts`
      (subpath modules: across modules only through the module's `index.ts`).
- [ ] `test/index.spec.ts` pins the public API; `test/dist/dist.check.js` exercises it.
- [ ] `package.json` entry points, `exports`, `files`, `engines` and `scripts` as above;
      `vitest.config.mts` as above and every spec imports from `vitest`.
- [ ] `version` and internal `@archi-code/*` deps are `0.0.0-development`.
- [ ] Only `dependencies` / `peerDependencies` in the package; no `devDependencies` (they live in
      the root `package.json`).
- [ ] The four tsconfig files as above.
- [ ] `README.md`, `SKILL.md`, `LICENSE`, `.gitignore` present; README and skill cover the current
      public API.
- [ ] Everything is in English (code, comments, test names, messages, docs, README, skill).
- [ ] Root `package.json` has `check:<folder>`; `CLAUDE.md` lists the package.
- [ ] `npm run check:<folder>` passes.
