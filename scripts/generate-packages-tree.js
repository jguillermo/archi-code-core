#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PACKAGES_DIR = path.join(ROOT, 'packages');
const OUTPUT_FILE = path.join(ROOT, 'packages.tree.json');
const SCOPE = '@archi-code/';

// Read all packages
const dirs = fs.readdirSync(PACKAGES_DIR).filter((d) => fs.existsSync(path.join(PACKAGES_DIR, d, 'package.json')));

const all = dirs.map((dir) => {
  const pkgJson = JSON.parse(fs.readFileSync(path.join(PACKAGES_DIR, dir, 'package.json'), 'utf8'));
  const allDeps = {
    ...pkgJson.dependencies,
    ...pkgJson.devDependencies,
    ...pkgJson.peerDependencies,
  };
  const internalDeps = Object.keys(allDeps).filter((d) => d.startsWith(SCOPE));
  return {
    name: pkgJson.name,
    path: `packages/${dir}`,
    internalDeps,
  };
});

// Topological sort (DFS)
function topoSort(packages) {
  const byName = Object.fromEntries(packages.map((p) => [p.name, p]));
  const visited = new Set();
  const result = [];

  function visit(pkg) {
    if (visited.has(pkg.name)) return;
    visited.add(pkg.name);
    for (const dep of pkg.internalDeps) {
      if (byName[dep]) visit(byName[dep]);
    }
    result.push(pkg);
  }

  for (const pkg of packages) visit(pkg);
  return result;
}

const sorted = topoSort(all);

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(sorted, null, 2) + '\n');

console.log('Generated packages.tree.json:');
sorted.forEach((p, i) => {
  const deps = p.internalDeps.length ? p.internalDeps.join(', ') : 'none';
  console.log(`  ${i + 1}. ${p.name}  (internal deps: ${deps})`);
});
