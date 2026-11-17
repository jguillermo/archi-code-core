---
paths:
  - 'packages/**'
  - 'scripts/**'
---

# Package standard

Every package under `packages/` follows the same standard. Its source of truth is the generator and
the checks below, not this file: read them before creating or changing a package. When the standard
changes, change the generator and every package in the same change.

| What                                                                          | Where                                                                                   |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Layout, `package.json`, scripts, tsconfig files, Vitest config, README, SKILL | `scripts/new-package.js` (what it writes is the standard)                               |
| Creating a package step by step                                               | `.claude/skills/new-package/SKILL.md` (`/new-package`)                                  |
| Plain package (`"."` entry)                                                   | `packages/validation`                                                                   |
| Subpath modules, internal module, browser test project                        | `packages/ddd`, `packages/criteria-adapters` (`test/cross/module-boundaries.spec.ts`)   |
| Web build, Rust → wasm core                                                   | `packages/crypto-tools`                                                                 |
| Bundled skill suite, end-to-end example                                       | `packages/ddd` (`ddd-skills/`, `example/`)                                              |
| Workspaces order, no package `devDependencies`                                | `scripts/__tests__/workspaces.test.js`                                                  |
| `0.0.0-development` versions                                                  | `scripts/check-versions.js` (`.claude/rules/release.md`)                                |
| Entry points, CJS/ESM parity, `test/dist/*.check.js` hooks, packed docs       | `scripts/check-dist.js`, `scripts/lib/package-checks.js`, `scripts/lib/package-docs.js` |
| Types of every entry point                                                    | `attw --pack .` in each package `check:dist`                                            |
| Browser checks (`browser()` hooks, import map, CSP)                           | `scripts/check-browser.js`, `scripts/lib/web-safety.js`                                 |
| Imports: from the declaring file, never through a re-exporting `index.ts`     | `archi-code/no-barrel-import` in `eslint.config.js` (`.claude/rules/tooling.md`)        |
| Public API of each package or module                                          | `test/index.spec.ts` (and `test/<module>/index.spec.ts`)                                |
| Code style, English only, no comments, tests                                  | `.claude/rules/code-style.md`                                                           |
| Package index and dependency graph                                            | `CLAUDE.md`, `.claude/rules/architecture.md`, root `README.md`                          |
| Gate of one package                                                           | `npm run check:<folder>` (must pass)                                                    |
