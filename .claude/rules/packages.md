---
paths:
  - "packages/**"
  - "scripts/**"
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
├── .gitignore  .releaserc.json  LICENSE  README.md
```

- No `scripts/` folder inside a package: build and check tools live only in the root `scripts/`.
- Folder name is lowercase kebab-case and equals the npm name: `packages/<folder>` → `@archi-code/<folder>`
  (`ephemeraDB` and the `check:validator` root script are legacy exceptions; do not copy them).

## package.json

- `name` `@archi-code/<folder>`, `author` `Jose Guillermo`, `license` `MIT`, `repository` the
  monorepo, `engines.node` `>=22`, `publishConfig.access` `public`, `files` `["dist/"]`.
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
  `check:editorconfig`, `check:lint` / `fix:lint` (`eslint src test --ext .ts`), `check:prettier` /
  `fix:prettier` (`"{src,test}/**/*.{js,jsx,ts,tsx,json,css,scss,md}" "*.{json,md}"`) and
  `check:all`:

  ```
  check:editorconfig → check:prettier → check:lint → check:types → test:coverage → build → check:dist
  ```

- `jest`: `rootDir` `.`, `roots` `["<rootDir>/src", "<rootDir>/test"]` (both: with only `test`,
  files no test imports escape coverage), `testRegex` `.*\.spec\.ts$`, `collectCoverageFrom`
  `["src/**/*.(t|j)s"]`, `coverageDirectory` `./coverage`, `injectGlobals` `false`.
- Coverage threshold: 100% for new packages. An existing package below 100% is pinned to its real
  coverage rounded down; it may only go up.
- Runtime deps in `dependencies`; optional heavy libraries as optional `peerDependencies`.

## TypeScript

- `tsconfig.json` extends `../../tsconfig.base.json` and includes `src/**/*` and `test/**/*`.
- `tsconfig.build.json` sets `rootDir ./src`, `sourceMap false`, `incremental false`, includes only
  `src/**/*` and excludes `test`. `tsconfig.cjs.json` / `tsconfig.esm.json` only set
  `module`, `target ES2020` and `outDir` (`./dist/cjs` / `./dist/esm`).

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

Only when the package needs them, and documented in its README: extra `compilerOptions` in
`tsconfig.json` (e.g. `lib`), `tsconfig.spec.json`, extra Prettier/ESLint paths for extra folders
(`benchmark/`, `docs/`), extra `.gitignore` lines, `.prettierignore`, `sideEffects`, and a web
build (`browser` field + `browser` export condition + `check-web.js` in `check:dist` +
`web` in `dist.check.js`).

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
- [ ] `test/index.spec.ts` pins the public API; `test/dist/dist.check.js` exercises it.
- [ ] `package.json` entry points, `exports`, `files`, `engines`, `scripts` and `jest` as above.
- [ ] The four tsconfig files as above.
- [ ] `README.md`, `LICENSE`, `.releaserc.json`, `.gitignore` present.
- [ ] Root `package.json` has `check:<folder>`; `CLAUDE.md` lists the package.
- [ ] `npm run check:<folder>` passes.
