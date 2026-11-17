# CLAUDE.md

npm workspaces monorepo of the `@archi-code/*` packages. This file is only an index. The root
holds only what is global to the monorepo (package standard, tooling, commands, release); each
package defines its own rules in its own docs. Read the one a task needs before acting.

## Global rules (`.claude/rules/`, each loads on its own when its `paths` match)

| Rule                                               | Read it for                                                   |
| -------------------------------------------------- | ------------------------------------------------------------- |
| [`packages.md`](.claude/rules/packages.md)         | the package standard and the checks that enforce it           |
| [`architecture.md`](.claude/rules/architecture.md) | workspaces, dependency order, where dependencies are declared |
| [`commands.md`](.claude/rules/commands.md)         | npm scripts, root `scripts/` tools, CI                        |
| [`code-style.md`](.claude/rules/code-style.md)     | code style, English only, no comments, Vitest conventions     |
| [`tooling.md`](.claude/rules/tooling.md)           | global ESLint, Prettier, EditorConfig and husky hooks         |
| [`release.md`](.claude/rules/release.md)           | versions, `releases.json` and the release flow                |

## Global skills (`.claude/skills/`)

- `/new-package` — scaffold a new package that follows `packages.md`.

## Packages (each one's rules live in its own docs)

| Package                                           | Docs                                                                                                          |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| [`validation`](packages/validation)               | [README](packages/validation/README.md) · [SKILL](packages/validation/SKILL.md)                               |
| [`ddd`](packages/ddd)                             | [README](packages/ddd/README.md) · [SKILL](packages/ddd/SKILL.md) · [example](packages/ddd/example/README.md) |
| [`criteria-adapters`](packages/criteria-adapters) | [README](packages/criteria-adapters/README.md) · [SKILL](packages/criteria-adapters/SKILL.md)                 |
| [`crypto-tools`](packages/crypto-tools)           | [README](packages/crypto-tools/README.md) · [SKILL](packages/crypto-tools/SKILL.md)                           |
