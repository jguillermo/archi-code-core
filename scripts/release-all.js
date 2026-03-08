#!/usr/bin/env node
'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TREE_FILE = path.join(ROOT, 'packages.tree.json');
const DRY_RUN = process.argv.includes('--dry-run');

// Disable husky hooks during release — tests already ran in CI
process.env.HUSKY = '0';

// Prerelease config per branch (matches .releaserc.json)
// main → alpha prerelease (0.1.0-alpha.1), release → stable (0.1.0)
const BRANCH_PRERELEASE = { main: 'alpha' };

function getCurrentBranch() {
  try {
    return execSync('git branch --show-current').toString().trim();
  } catch {
    return null;
  }
}

const CURRENT_BRANCH = getCurrentBranch();
const PRERELEASE_TAG = BRANCH_PRERELEASE['main'] ?? null;

if (DRY_RUN) {
  console.log(`\n[DRY RUN] Local analysis only — no builds, no publish, no git operations.`);
  console.log(`[DRY RUN] Current branch: ${CURRENT_BRANCH}  |  Simulating: main  |  prerelease: ${PRERELEASE_TAG}\n`);
}

function run(cmd, opts = {}) {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', ...opts });
}

// Analyze commits for a package since its last release tag (no network needed)
function analyzeCommits(pkgName, pkgPath) {
  let lastTag;
  try {
    lastTag = execSync(`git describe --tags --match "${pkgName}@*" --abbrev=0 2>/dev/null`).toString().trim();
  } catch {
    lastTag = null;
  }

  const range = lastTag ? `${lastTag}..HEAD` : 'HEAD';
  let log;
  try {
    log = execSync(`git log ${range} --pretty=format:"%s" -- ${pkgPath}`).toString().trim();
  } catch {
    log = '';
  }

  const commits = log ? log.split('\n').filter(Boolean) : [];
  if (!commits.length) return { bump: null, commits: [], lastTag };

  let bump = null;
  for (const msg of commits) {
    if (msg.includes('BREAKING CHANGE') || /^[^(:]+(\([^)]*\))?!:/.test(msg)) {
      bump = 'major';
      break;
    }
    if (/^feat(\(|:|\s|!)/.test(msg)) bump = bump === 'major' ? 'major' : 'minor';
    if (/^fix(\(|:|\s|!)/.test(msg) && !bump) bump = 'patch';
  }

  return { bump, commits, lastTag };
}

function bumpVersion(version, bump, prereleaseTag) {
  const prMatch = version.match(/^(\d+)\.(\d+)\.(\d+)-(.+)\.(\d+)$/);

  if (prMatch && prereleaseTag && prMatch[4] === prereleaseTag) {
    const [major, minor, patch, , n] = [prMatch[1], prMatch[2], prMatch[3], prMatch[4], prMatch[5]].map(Number);
    if (bump === 'major') return `${major + 1}.0.0-${prereleaseTag}.1`;
    return `${major}.${minor}.${patch}-${prereleaseTag}.${n + 1}`;
  }

  const base = version.replace(/-.*$/, '');
  const [major, minor, patch] = base.split('.').map(Number);
  let nextBase;
  if (bump === 'major') nextBase = `${major + 1}.0.0`;
  else if (bump === 'minor') nextBase = `${major}.${minor + 1}.0`;
  else nextBase = `${major}.${minor}.${patch + 1}`;

  if (!prereleaseTag) return nextBase;
  return `${nextBase}-${prereleaseTag}.1`;
}

// Regenerate dependency tree before releasing to ensure correct order
console.log('Generating packages.tree.json...');
run('node scripts/generate-packages-tree.js', { cwd: ROOT });

const tree = JSON.parse(fs.readFileSync(TREE_FILE, 'utf8'));

// Pre-populate with current versions so packages not bumped this run still have a baseline
const releasedVersions = {};
for (const pkg of tree) {
  const pkgJson = JSON.parse(fs.readFileSync(path.join(ROOT, pkg.path, 'package.json'), 'utf8'));
  releasedVersions[pkg.name] = pkgJson.version;
}

for (const pkg of tree) {
  console.log(`\n${'═'.repeat(64)}`);
  console.log(`  ${pkg.name}${DRY_RUN ? '  [DRY RUN]' : ''}`);
  console.log('═'.repeat(64));

  const pkgJsonPath = path.join(ROOT, pkg.path, 'package.json');
  const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));

  // Pin internal dependencies to the versions released in this run (dependencies, devDependencies, peerDependencies)
  let depsUpdated = false;
  for (const dep of pkg.internalDeps) {
    const version = releasedVersions[dep];
    if (!version) continue;
    const range = `^${version}`;
    for (const depField of ['dependencies', 'devDependencies', 'peerDependencies']) {
      if (pkgJson[depField]?.[dep] && pkgJson[depField][dep] !== range) {
        console.log(`  pinning ${depField}.${dep}: ${pkgJson[depField][dep]} → ${range}`);
        pkgJson[depField][dep] = range;
        depsUpdated = true;
      }
    }
  }

  if (DRY_RUN) {
    // Local commit analysis — no network, no credentials needed
    const { bump, commits, lastTag } = analyzeCommits(pkg.name, pkg.path);
    console.log(`  last tag : ${lastTag ?? '(none)'}`);
    console.log(`  channel  : ${PRERELEASE_TAG ?? 'stable'}`);
    console.log(`  commits  : ${commits.length} since last release`);
    commits.forEach((c) => console.log(`    · ${c}`));
    if (bump) {
      const nextVersion = bumpVersion(releasedVersions[pkg.name], bump, PRERELEASE_TAG);
      console.log(`  bump     : ${bump}  →  ${releasedVersions[pkg.name]} → ${nextVersion}`);
      if (depsUpdated) console.log(`  deps     : would be updated in package.json`);
      releasedVersions[pkg.name] = nextVersion;
    } else {
      console.log(`  bump     : none (no feat/fix/BREAKING commits found)`);
    }
    continue;
  }

  if (depsUpdated) {
    fs.writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2) + '\n');
  }

  // Build before any git push so husky tests find the compiled dist files
  run(`npm run build -w ${pkg.name}`);

  // Create the baseline tag if this package has never been released
  const initialTag = `${pkg.name}@0.0.0`;
  try {
    execSync(`git rev-parse "${initialTag}"`, { stdio: 'ignore' });
  } catch {
    const firstCommit = execSync('git rev-list --max-parents=0 HEAD').toString().trim();
    run(`git tag "${initialTag}" ${firstCommit}`);
    run(`git push origin "${initialTag}"`);
  }

  // Release (semantic-release-monorepo filters commits by package path)
  run(`npx semantic-release -e semantic-release-monorepo`, {
    cwd: path.join(ROOT, pkg.path),
    env: process.env,
  });

  // Track the version after semantic-release (may have bumped it)
  const updated = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
  if (updated.version !== releasedVersions[pkg.name]) {
    console.log(`  → ${pkg.name}: ${releasedVersions[pkg.name]} → ${updated.version}`);
  } else {
    console.log(`  → ${pkg.name}@${updated.version} (no release)`);
  }
  releasedVersions[pkg.name] = updated.version;
}

if (!DRY_RUN) {
  // Commit any package.json dep version changes back to the repo
  run('git add packages/*/package.json');
  try {
    execSync('git diff --staged --quiet', { stdio: 'ignore' });
    console.log('\nNo package.json changes to commit.');
  } catch {
    run('git commit -m "chore(deps): update internal package versions [skip ci]"');
    run('git push origin main');
  }
}
