#!/usr/bin/env node
'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TREE_FILE = path.join(ROOT, 'packages.tree.json');

const tree = JSON.parse(fs.readFileSync(TREE_FILE, 'utf8'));

function run(cmd, opts = {}) {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', ...opts });
}

for (const pkg of tree) {
  console.log(`\nBuilding ${pkg.name}...`);
  run(`npm run build -w ${pkg.name}`);
}
