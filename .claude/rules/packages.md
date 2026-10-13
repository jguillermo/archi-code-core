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
├── .gitignore  LICENSE  README.md
```

- No `scripts/` folder inside a package: build and check tools live only in the root `scripts/`.
- Folder name is lowercase kebab-case and equals the npm name: `packages/<folder>` → `@archi-code/<folder>`
  (`ephemeraDB` and the `check:validator` root script are legacy exceptions; do not copy them).

## package.json

- `version` always `0.0.0-development`, and every internal `@archi-code/*` dependency (any field)
  too: the real versions live only in `releases.json` (written by the release in GitHub Actions) and in
  what is published. The release writes them into the published `package.json`;
  `npm run check:versions` fails otherwise.
- `name` `@archi-code/<folder>`, `author` `Jose Guillermo`, `license` `MIT`, `repository` the
  monorepo, `engines.node` `>=24`, `publishConfig.access` `public`, `files` `["dist/"]`.
- Entry points: `main` `./dist/cjs/index.js`, `module` `./dist/esm/index.js`, `types`
  `./dist/cjs/index.d.ts`.
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
  `check:types`, `check:dist` (`node ../../scripts/check-dist.js && node ../../scripts/check-types.js`),
  `check:editorconfig` (`node ../../scripts/editorconfig.js`), `check:lint` / `fix:lint` (`eslint src test --ext .ts`), `check:prettier` /
  `fix:prettier` (`"{src,test}/**/*.{js,jsx,ts,tsx,json,css,scss,md}" "*.{json,md}"`) and
  `check:all`:

  ```
  check:editorconfig → check:prettier → check:lint → check:types → test:coverage → build → check:dist
  ```

- `jest`: `rootDir` `.`, `roots` `["<rootDir>/src", "<rootDir>/test"]` (both: with only `test`,
  files no test imports escape coverage), `testRegex` `.*\.spec\.ts$`, `collectCoverageFrom`
  `["src/**/*.(t|j)s"]`, `coverageDirectory` `./coverage`, `injectGlobals` `false`.
- Coverage threshold: 100% (statements, branches, functions, lines) in every package. Never delete
  code to reach it: cover it with a test, or mark a defensive branch no test can reach with
  `// istanbul ignore`.
- Runtime deps in `dependencies`; optional heavy libraries as optional `peerDependencies`.

## TypeScript

- `tsconfig.json` extends `../../tsconfig.base.json` and includes `src/**/*` and `test/**/*`.
- `tsconfig.build.json` sets `rootDir ./src`, `sourceMap false`, `incremental false`, includes only
  `src/**/*` and excludes `test`. `tsconfig.cjs.json` / `tsconfig.esm.json` only set
  `module`, `target ES2020` and `outDir` (`./dist/cjs` / `./dist/esm`).

## Imports

- Inside `src/`, import each symbol from the file that declares it
  (`'../exceptions/domain/type-primitive.exception'`), never through an `index.ts` that only
  re-exports it (`'../exceptions'`). Barrels inside a package hide dependencies and create import
  cycles; `index.ts` files exist to expose the public API. Specs in `test/` may import from the
  `src` barrels.
- WebStorm's "Import can be shortened" inspection suggests the opposite: disable it, and the
  directory (`index`) import option in Code Style › TypeScript › Imports (`.idea/` is not shared).

## Tests and build checks

- Specs import from `../src/...` and use `@jest/globals`. No comments in code (see CLAUDE.md).
- `test/dist/dist.check.js` exports `smoke(m)` (run on the CJS and the ESM build) and optionally
  `crossBuild(cjs, esm)` and `web(webModule, nodeModule)`; each returns `[name, check]` pairs whose
  `check()` returns (or resolves to) `true` or an error message. The checks must call the real API
  (hash and verify, convert, persist and find…), not just test that it loads.
- The root scripts check every package the same way: `check-dist.js` (entry files exist, CJS and
  ESM load with the same exports, `smoke`/`crossBuild`), `check-types.js` (a TypeScript consumer
  imports the package from ESM and CJS under node16, nodenext and bundler) and `fix-esm.js` (full
  `.js` specifiers, `createRequire` shim for `require()` in ESM, `dist/esm/package.json`).

## Allowed per-package extensions

Only when the package needs them, and documented in its README:

- Extra `compilerOptions` in `tsconfig.json` (e.g. `lib`) and a `tsconfig.spec.json` for ts-jest.
- Extra folders (`benchmark/`, `docs/`): their paths in `check:prettier`/`fix:prettier` and
  `check:lint`/`fix:lint`, their own tsconfig type-checked in `check:types`, and one script to
  run them (e.g. `benchmark`).
- Extra `.gitignore` lines, `.prettierignore`, `sideEffects`.
- A web build: `browser` field + `browser` export condition (with its own `types`) +
  `sideEffects: false` + `check-web.js` and `check-browser.js` in `check:dist` + `web` and `browser`
  in `dist.check.js` (`browser()` returns
  `[name, pageFunction, { csp }?]`; each function runs in a real browser page and receives the URL of
  the ESM entry). `check-web.js` loads the ESM build in a realm with the standard Web APIs
  (`TextEncoder`, `crypto`, `atob`, timers…) and no Node APIs nor `Worker`. Its `exports["."]` may add a `node` condition (nested `import` /
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
  `src/wasm/wasm-assets.generated.ts` (gitignored, in `.prettierignore`, ignored by ESLint, editorconfig
  and coverage). `check:rust` (fmt, clippy on wasm32 and native, `cargo test`), `fix:rust` and `check:audit`
  (`cargo audit`, accepted advisories in `rust/.cargo/audit.toml`) run inside `rust/` so rustup and
  cargo find their config. `build` starts with `build:wasm` and `check:all` runs
  `check:rust → build:wasm` right after `check:lint`. CI installs the toolchain and wasm-pack.
- `jest.injectGlobals` `true`, only for a spec suite that cannot be edited and relies on Jest
  globals (e.g. one ported from another project). New specs still import from `@jest/globals`.

## When adding a package

1. `node scripts/new-package.js <folder> "<description>"` — writes the package and adds
   `check:<folder>` to the root `package.json`.
2. `npm install` at the root to link the workspace.
3. Replace the placeholder `PACKAGE_NAME` export with the real code, keeping
   `test/index.spec.ts` and `test/dist/dist.check.js` in sync with the public API.
4. Add the package to the tables and the dependency graph in `CLAUDE.md`.
5. `npm run check:<folder>` must pass. CI and `check:packages` pick the package up automatically.

## Checklist (validate every package against it)

- [ ] No specs in `src/`, no `scripts/` folder; `test/` mirrors `src/`.
- [ ] `src/` imports each symbol from its declaring file, never through a re-exporting `index.ts`.
- [ ] `test/index.spec.ts` pins the public API; `test/dist/dist.check.js` exercises it.
- [ ] `package.json` entry points, `exports`, `files`, `engines`, `scripts` and `jest` as above.
- [ ] `version` and internal `@archi-code/*` deps are `0.0.0-development`.
- [ ] The four tsconfig files as above.
- [ ] `README.md`, `LICENSE`, `.gitignore` present.
- [ ] Root `package.json` has `check:<folder>`; `CLAUDE.md` lists the package.
- [ ] `npm run check:<folder>` passes.
