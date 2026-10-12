'use strict';

const fs = require('fs');
const path = require('path');

const PACKAGE_CHECKS = path.join('test', 'dist', 'dist.check.js');

function entryPoint(pkg, condition) {
  const target = pkg.exports['.'][condition];
  return typeof target === 'string' ? target : target.default;
}

function loadPackageChecks(root) {
  const file = path.join(root, PACKAGE_CHECKS);
  return fs.existsSync(file) ? require(file) : {};
}

async function runChecks(label, checks, fail) {
  for (const [name, check] of checks) {
    let result;
    try {
      result = await check();
    } catch (e) {
      fail(`${label}: ${name} threw ${e && e.message}`);
    }
    if (result === true) continue;
    fail(
      `${label}: ${name} ${typeof result === 'string' ? result : 'returned an unexpected result'}`,
    );
  }
  return checks.length;
}

module.exports = { PACKAGE_CHECKS, entryPoint, loadPackageChecks, runChecks };
