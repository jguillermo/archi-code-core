---
paths:
  - 'releases.json'
  - 'release-plan.json'
  - 'scripts/release.js'
  - 'scripts/version.js'
  - 'scripts/lib/**'
  - 'scripts/__tests__/**'
  - '.github/workflows/release.yml'
  - '**/package.json'
---

# Versions and release

Never edit `releases.json` by hand (only the release in GitHub Actions writes it; emptying
`deploys` is the only manual edit) and keep every package version and internal `@archi-code/*`
dependency at `0.0.0-development` (`npm run check:versions`). Read the source of truth before
changing anything here.

| What                                                           | Where                                                                                 |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| What is published (current versions, deploy history)           | `releases.json`                                                                       |
| Next version of each package (channels, bumps, cascade, reset) | `scripts/lib/release-plan.js`, `__tests__/release-plan.test.js`                       |
| Dry-run (`npm run version`, writes `release-plan.json`)        | `scripts/version.js`, `scripts/lib/load-plan.js`                                      |
| Deploy (`npm run release`, `-- --pack` without publishing)     | `scripts/release.js`                                                                  |
| Pre-flight checks, publish, record and push of `releases.json` | `scripts/lib/release-git.js`, `release-state.js`, `release-report.js` (+ their tests) |
| Published `package.json` (exact versions, `releaseCommit`)     | `scripts/lib/publish-manifest.js`, `__tests__/publish-manifest.test.js`               |
| Version check                                                  | `scripts/check-versions.js`, `scripts/lib/versions.js`                                |
| Dependency order of the packages                               | `scripts/lib/topo-sort.js`, `__tests__/workspaces.test.js`                            |
| CI trigger, branches and `NPM_TOKEN`                           | `.github/workflows/release.yml`                                                       |
