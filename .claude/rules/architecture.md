---
paths:
  - 'package.json'
  - 'packages/*/package.json'
  - 'scripts/**'
  - 'README.md'
---

# Architecture

npm workspaces monorepo: each folder of `packages/` is an independent npm package
`@archi-code/<folder>`. What a package does and how it works is only in its own `README.md` and
`SKILL.md` (the index is in `CLAUDE.md`).

| What                                              | Where                                                                           |
| ------------------------------------------------- | ------------------------------------------------------------------------------- |
| Packages and their build order (dependency order) | `workspaces` of the root `package.json`, `scripts/__tests__/workspaces.test.js` |
| Runtime dependencies of each package              | `dependencies` / `peerDependencies` of `packages/<name>/package.json`           |
| Dev and test tools (every package)                | `devDependencies` of the root `package.json`                                    |
| Public list of packages                           | root `README.md`                                                                |

## Dependency graph

```
@archi-code/validation
    └── @archi-code/ddd
            └── @archi-code/criteria-adapters
@archi-code/crypto-tools
```
