---
paths:
  - 'package.json'
  - 'packages/*/package.json'
  - 'packages/*/test/dist/**'
  - 'scripts/**'
  - '.github/**'
  - '.husky/**'
---

# Commands and build scripts

Read the source of truth before running or changing a command.

| What                                                                   | Where                                                                       |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Root commands (`check`, `check:<pkg>`, `build`, `test`, `fix:format`…) | `scripts` of the root `package.json`                                        |
| Per-package gate (`check:all`) and scripts                             | `scripts` of `packages/<name>/package.json` and `.claude/rules/packages.md` |
| What CI runs                                                           | `.github/workflows/ci.yml`, `audit.yml`, `release.yml`                      |
| Git hooks                                                              | `.husky/` and `.claude/rules/tooling.md`                                    |
| Format and lint tools                                                  | `.claude/rules/tooling.md`                                                  |
| Release commands                                                       | `.claude/rules/release.md`                                                  |
| Entry points, `exports`, tsconfig files, build output                  | `scripts/new-package.js`                                                    |

## Root `scripts/` tools (each package calls them as `node ../../scripts/<name>.js`)

| Tool                       | Does                                                                | Spec                               |
| -------------------------- | ------------------------------------------------------------------- | ---------------------------------- |
| `fix-esm.js`               | fixes the ESM build (`.js` specifiers, `createRequire`, `type`)     | `__tests__/fix-esm.test.js`        |
| `check-dist.js`            | entry points, CJS/ESM parity, `test/dist` hooks, packed docs        | `__tests__/package-docs.test.js`   |
| `check-browser.js`         | static web checks + `browser` hooks in Chromium/WebKit (Playwright) | `__tests__/web-safety.test.js`     |
| `embed-wasm.js`            | embeds a `wasm-pack` output into a generated `.ts` module           | `__tests__/embed-wasm.test.js`     |
| `check-versions.js`        | every version and internal dep is `0.0.0-development`               | `__tests__/check-versions.test.js` |
| `new-package.js`           | scaffolds a package (`/new-package` skill)                          | —                                  |
| `version.js`, `release.js` | release dry-run and deploy                                          | see `.claude/rules/release.md`     |
| `lib/package-checks.js`    | loads and runs the `test/dist/*.check.js` hooks                     | —                                  |

Hook format of `test/dist/<module>.check.js` (`smoke`, `crossBuild`, `browser`): `scripts/lib/package-checks.js`
and `scripts/check-browser.js`; examples in each package's `test/dist/`.
