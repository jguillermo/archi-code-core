# Code quality tooling: ESLint, Prettier and EditorConfig

ESLint, Prettier and EditorConfig are **global**: one config at the root, run once over the whole
repo from the root scripts. Packages have no lint, format nor editorconfig scripts and no ignore
files of their own. This rule describes the setup and the procedure to verify that the three tools
are well configured and actually working. Run the verification whenever a tool, its config, an
ignore list, the root scripts, the husky hooks or the package layout changes, and when
asked to audit the tooling.

## Configuration

| Tool         | Config (root only)                                                                                               |
| ------------ | ---------------------------------------------------------------------------------------------------------------- |
| ESLint 9     | `eslint.config.js` (flat config: `@eslint/js`, `typescript-eslint` strict + stylistic, `eslint-plugin-prettier`) |
| Prettier 3   | `.prettierrc`, `.prettierignore`                                                                                 |
| EditorConfig | `.editorconfig`, `.editorconfig-checker.json` (`Version` and `Exclude`)                                          |

- Only two root commands run them: `npm run check:format` runs `EC_VERSION=v4.0.2 editorconfig-checker`,
  `prettier --check .` and `eslint .` in that order; `npm run fix:format` runs `eslint . --fix` and
  `prettier --write .` (EditorConfig has no auto-fix). There are no separate lint, prettier nor
  editorconfig scripts.
- `npm run check` runs `check:format → test:scripts → check:versions → check:packages`, and CI
  runs `npm run check`.
- The three must agree: UTF-8, `lf`, 2-space indent (4 for `*.rs`), final newline, no trailing
  whitespace (except `*.md`). `.prettierrc` sets `endOfLine: lf`, `tabWidth: 2`, `printWidth: 100`,
  single quotes, trailing commas and semicolons.
- ESLint runs Prettier as a rule (`prettier/prettier`) for `packages/*/src` and `packages/*/test`,
  and `eslint-config-prettier` turns off the rules that fight Prettier.
- ESLint lints every JavaScript and TypeScript file. The `typescript-eslint` strict and stylistic
  presets apply only to `**/*.{ts,mts,cts}` (`onlyTs`; they set no `files` of their own, so without
  it their rules would also hit the `.js` files). Every `.js` gets `@eslint/js` recommended plus
  `eqeqeq`, `no-var`, `prefer-const`, `no-shadow` and `no-unused-vars`, as CommonJS with the Node
  globals of the `globals` package; `scripts/__tests__` are ES modules, and
  `packages/*/test/dist/*.check.js` also get the browser globals (their `browser()` page functions
  run in real pages).
- The three ignore the same generated output: `packages/*/dist`, `packages/*/coverage`,
  `**/target`, `node_modules`, `.idea`, `packages/crypto-tools/wasm` and `*.generated.ts`. Build
  output is anchored to `packages/*/`: a bare `dist` pattern in `.prettierignore` (gitignore
  syntax) also matches `test/dist/` and silently drops the `*.check.js` hooks. Prettier also skips
  `package-lock.json`, `releases.json` (written by the release in CI), `.claude/settings.local.json`,
  the crypto-tools `test/fixtures` and the validation benchmark outputs.
- The husky hooks only call npm scripts: `.husky/pre-commit` is `npm run check:format` (the same
  check CI runs) and `.husky/pre-push` is `npm run check:versions`. No custom command nor script
  goes in a hook.

## Verification procedure

Run from the repo root. Every step lists the expected result; any other result is a finding.

1. **Root gate passes**: `npm run check:format` exits 0, and so does the full `npm run check`. The
   root `package.json` has exactly `check:format` and `fix:format` for these tools (no
   `check:lint`, `check:prettier`, `check:editorconfig`, `fix`, `fix:lint` nor `fix:prettier`).
2. **Nothing is per package**: no `packages/*/package.json` has a script whose name contains
   `lint`, `prettier` or `editorconfig`, no package `check:all` calls one, and there is no
   `packages/*/.prettierignore`, `.prettierrc*`, `.editorconfig` nor `eslint.config.*`
   (`find packages -maxdepth 2 -name '.prettier*' -o -maxdepth 2 -name .editorconfig -o -maxdepth 2 -name 'eslint.config.*'`
   prints nothing).
   `scripts/new-package.js` generates none of them.
3. **Each tool detects violations** (probe through stdin or the scratchpad, never in the repo):
   - `printf 'var x = 1 == 2;\n' | npx eslint --stdin --stdin-filename packages/ddd/src/domain/probe.ts`
     reports `no-var`, `eqeqeq` and `prettier/prettier`.
   - `printf 'var x = 1 == 2;\n' | npx eslint --stdin --stdin-filename scripts/probe.js` reports
     `no-var`, `eqeqeq` and `no-unused-vars`; `document` is undefined there (`no-undef`) but allowed
     in `packages/<pkg>/test/dist/probe.check.js`.
   - `printf 'const a = "x"\n' | npx prettier --stdin-filepath packages/ddd/src/domain/probe.ts`
     prints `const a = 'x';`.
   - A file with trailing spaces, a tab indent, CRLF and no final newline, next to a copy of
     `.editorconfig` in the scratchpad, makes
     `EC_VERSION=v4.0.2 node_modules/.bin/editorconfig-checker <file>` report all four errors.
4. **Ignore lists cover generated output**: after `npm run build` and `npm run test:coverage`,
   `npx eslint .` and `npx prettier --check .` still exit 0 (no file under `dist`, `coverage`,
   `target`, `packages/crypto-tools/wasm` nor `.idea` is reported), and
   `npx prettier --check --ignore-unknown releases.json` skips the file.
   **Every tracked file is checked**: for each file of `git ls-files`, Prettier
   (`prettier.getFileInfo(file, { ignorePath: ['.gitignore', '.prettierignore'] })`), ESLint
   (`new ESLint().isPathIgnored(file)` / `calculateConfigForFile(file)`) and the editorconfig
   checker (`EC_VERSION=v4.0.2 npx editorconfig-checker -dry-run`) must skip only what this rule lists:
   Prettier skips `package-lock.json`, `releases.json` and `packages/crypto-tools/test/fixtures`
   plus kinds it has no parser for; ESLint checks every `.js`/`.ts`/`.mts`/`.cts` and only those;
   editorconfig skips only the lockfiles.
   **Planted violations are caught**: an untracked file with errors in `packages/<pkg>/src`,
   `packages/<pkg>/test/dist`, a package root and `packages/validation/benchmark` makes the root
   `check:format` fail naming it; delete the probes after.
5. **Hooks call only npm scripts**: `.husky/pre-commit` contains exactly `npm run check:format`
   and `.husky/pre-push` exactly `npm run check:versions`; both are executable.
6. **Dependencies are explicit**: every module `eslint.config.js` requires and every binary the
   scripts call (`eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-prettier`,
   `eslint-config-prettier`, `globals`, `prettier`, `editorconfig-checker`) is declared with an exact version
   in the root `devDependencies`
   (`node -p "require('./package.json').devDependencies['<name>']"` for each).
7. **Single source of truth**: ESLint stays on a flat config (`eslint.config.js`, no `.eslintrc*`),
   there is one Prettier config (`.prettierrc`, no `prettier` key in any `package.json`) and one
   `.editorconfig` with `root = true`. The checker version lives in `EC_VERSION` of `check:format`
   (the binary the npm wrapper downloads; never `latest`, which broke CI when upstream renamed its
   assets) and in `"Version"` of `.editorconfig-checker.json`; the binary refuses to run when they
   differ, so change both together.

## Reporting

List each finding with the step that found it, the file and the concrete fix, and separate what
breaks the gate from what only affects editors or ad-hoc runs. Never change a tool's rules or
ignore lists to make a finding disappear without the user's approval: fix the code or the config
gap the finding points to.
