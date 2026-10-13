#!/usr/bin/env node
'use strict';

const path = require('path');
const { DEV_VERSION, SCOPE } = require('./lib/release-plan');
const { readWorkspacePackages } = require('./lib/workspace-packages');

const DEPENDENCY_FIELDS = ['dependencies', 'peerDependencies', 'devDependencies'];

function findVersionErrors(packages) {
  const errors = [];
  for (const { name, packageJson } of packages) {
    if (packageJson.version !== DEV_VERSION) {
      errors.push(`${name}: version "${packageJson.version}" must be "${DEV_VERSION}"`);
    }
    for (const field of DEPENDENCY_FIELDS) {
      for (const [dep, range] of Object.entries(packageJson[field] ?? {})) {
        if (dep.startsWith(SCOPE) && range !== DEV_VERSION) {
          errors.push(`${name}: ${field}.${dep} "${range}" must be "${DEV_VERSION}"`);
        }
      }
    }
  }
  return errors;
}

if (require.main === module) {
  const errors = findVersionErrors(readWorkspacePackages(path.join(__dirname, '..')));
  if (errors.length) {
    console.error('check-versions: the real versions live in releases.json, not in package.json');
    errors.forEach((error) => console.error(`  ✘ ${error}`));
    process.exit(1);
  }
  console.log(`check-versions: OK — every package and internal dep at ${DEV_VERSION}`);
}

module.exports = { findVersionErrors };
