---
name: new-package
description: Create a new @archi-code package in packages/ that follows the package standard (.claude/rules/packages.md) and passes check:all from the start. Use when the user asks to create, add or scaffold a new package or library in this monorepo.
---

# new-package

Creates a package that follows `.claude/rules/packages.md`. Read that rule first.

1. Agree with the user on the folder name (lowercase kebab-case; it is also the npm name
   `@archi-code/<folder>`) and a one-sentence description. Ask if either is missing.
2. Run from the repo root:

   ```bash
   node scripts/new-package.js <folder> "<description>"
   ```

   It refuses an existing folder or an invalid name, writes the package (with an English `README.md`
   and a `SKILL.md` named `archi-code-<folder>`), adds the folder to the root `workspaces` and `check:<folder>` to the root `package.json`
   and formats everything with Prettier.

3. Run `npm install` at the root so the workspace is linked (`attw --pack .` packs it by name). This updates `package-lock.json`.
4. Run `npm run check:<folder>`; it must pass before any real code is written.
5. If the user described the package's code, replace the placeholder `PACKAGE_NAME` export with it
   and keep `test/index.spec.ts` (public API list), the specs mirroring `src/`, and
   `test/dist/dist.check.js` (real API calls on both builds) in sync. Coverage must stay at 100%.
6. Add the package to the tables and the dependency graph in `CLAUDE.md` and the root `README.md`,
   and document the real API in its `README.md` and the rules, patterns and common mistakes in its
   light `SKILL.md` (Documentation section of the rule).
7. Run `npm run check:<folder>` again and report the result. Do not commit.
