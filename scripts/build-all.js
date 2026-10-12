#!/usr/bin/env node
'use strict';

const { execSync } = require('child_process');
const path = require('path');
const { topoSort } = require('./lib/topo-sort');
const { readWorkspacePackages } = require('./lib/workspace-packages');

const ROOT = path.join(__dirname, '..');
const SCOPE = '@archi-code/';

function internalDeps(packageJson) {
  const deps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
    ...packageJson.peerDependencies,
  };
  return Object.keys(deps).filter((name) => name.startsWith(SCOPE));
}

const ordered = topoSort(
  readWorkspacePackages(ROOT).map((pkg) => ({
    ...pkg,
    internalDeps: internalDeps(pkg.packageJson),
  })),
);

console.log('Build order:');
ordered.forEach((pkg, index) => {
  const deps = pkg.internalDeps.length ? pkg.internalDeps.join(', ') : 'none';
  console.log(`  ${index + 1}. ${pkg.name}  (internal deps: ${deps})`);
});

for (const pkg of ordered) {
  console.log(`\nBuilding ${pkg.name}...\n$ npm run build -w ${pkg.name}`);
  execSync(`npm run build -w ${pkg.name}`, { cwd: ROOT, stdio: 'inherit' });
}
