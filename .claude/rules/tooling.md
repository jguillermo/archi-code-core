---
paths:
  - 'eslint.config.js'
  - '.prettierrc'
  - '.prettierignore'
  - '.editorconfig'
  - '.editorconfig-checker.json'
  - '.husky/**'
  - 'package.json'
---

# Code quality tooling: ESLint, Prettier and EditorConfig

The three are global: one config at the root, run once over the whole repo; packages have no lint,
format nor editorconfig scripts nor config files. Never change a tool's rules or ignore lists to
silence a finding without the user's approval.

| What                                               | Where                                                                    |
| -------------------------------------------------- | ------------------------------------------------------------------------ |
| ESLint rules (incl. `archi-code/no-barrel-import`) | `eslint.config.js`                                                       |
| Prettier options and ignores                       | `.prettierrc`, `.prettierignore`                                         |
| EditorConfig and checker version/excludes          | `.editorconfig`, `.editorconfig-checker.json` (`Version` = `EC_VERSION`) |
| Commands                                           | `check:format` and `fix:format` in the root `package.json`               |
| Hooks                                              | `.husky/pre-commit`, `.husky/pre-push` (only npm scripts)                |
| Tool versions                                      | root `devDependencies` (exact versions)                                  |
