#!/usr/bin/env node
'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TREE_FILE = path.join(ROOT, 'packages.tree.json');

function run(cmd, opts = {}) {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', ...opts });
}

// Regenerate dependency tree before releasing to ensure correct order
console.log('Generating packages.tree.json...');
execSync('node scripts/generate-packages-tree.js', { stdio: 'inherit', cwd: ROOT });

const tree = JSON.parse(fs.readFileSync(TREE_FILE, 'utf8'));

// Pre-populate with current versions so packages not bumped this run still have a baseline
const releasedVersions = {};
for (const pkg of tree) {
  const pkgJson = JSON.parse(fs.readFileSync(path.join(ROOT, pkg.path, 'package.json'), 'utf8'));
  releasedVersions[pkg.name] = pkgJson.version;
}

for (const pkg of tree) {
  console.log(`\n${'═'.repeat(64)}`);
  console.log(`  ${pkg.name}`);
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
  if (depsUpdated) {
    fs.writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2) + '\n');
  }

  // Create the baseline tag if this package has never been released
  const initialTag = `${pkg.name}@0.0.0`;
  try {
    execSync(`git rev-parse "${initialTag}"`, { stdio: 'ignore' });
  } catch {
    const firstCommit = execSync('git rev-list --max-parents=0 HEAD').toString().trim();
    run(`git tag "${initialTag}" ${firstCommit}`);
    run(`git push origin "${initialTag}"`);
  }

  // Build
  run(`npm run build -w ${pkg.name}`);

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

// Commit any package.json dep version changes back to the repo
run('git add packages/*/package.json');
try {
  execSync('git diff --staged --quiet', { stdio: 'ignore' });
  console.log('\nNo package.json changes to commit.');
} catch {
  run('git commit -m "chore(deps): update internal package versions [skip ci]"');
  run('git push origin main');
}
