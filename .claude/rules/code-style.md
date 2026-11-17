---
paths:
  - 'packages/**'
  - 'scripts/**'
  - '.claude/**'
  - '**/*.md'
---

# Code style and testing

## Code style

- **Prettier**: single quotes, trailing commas, print width 100, 2-space indent, semicolons.
- **Tooling check**: `.claude/rules/tooling.md` points to the ESLint, Prettier and EditorConfig configs, commands and hooks.
- **ESLint**: TypeScript strict + Prettier enforced. `any` and `Function` types are allowed.
- Test files: `*.spec.ts` convention. In every package `src/` holds only code and specs live in the package's `test/` folder, mirroring `src/`.
- **Imports**: inside `src/`, import each symbol from the file that declares it, never through a re-exporting `index.ts` (`archi-code/no-barrel-import` in `eslint.config.js`).
- **English only**: everything in the repository is written in English: code, identifiers, comments, test names, error and log messages, scripts, README files, skills, rules and other documentation. Non-ASCII text is allowed only as test data. (Talking to the user in Spanish is fine; what gets written into the repo is English.)
- **No comments**: code must describe itself through names (variables, functions, classes, tests) and structure. Do not add comments, docblocks or section banners. A comment is the exception, only when it is truly necessary to explain a non-obvious _why_ that the code cannot express.

## Testing

- Vitest 5 everywhere: each package has its own complete `vitest.config.mts` (v8 coverage over `src/**/*.ts`, threshold 100% for statements, branches, functions and lines) and the root `vitest.config.mts` runs `scripts/__tests__` (`npm run test:scripts`). Each package's `test/index.spec.ts` pins its public API.
- Nothing is global (`globals: false`): every spec imports from `vitest` what it uses (`describe`, `it`, `expect`, `vi`, `expectTypeOf`) and from `../src/...` the code under test; no package depends on another for its tests. Module isolation uses `vi.resetModules()` + `await import()`, globals are replaced with `vi.stubGlobal`, and coverage hints are `/* v8 ignore … -- @preserve */`.
