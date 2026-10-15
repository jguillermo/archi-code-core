'use strict';

const fs = require('fs');
const path = require('path');

const PACKAGE_CHECKS = path.join('test', 'dist', 'dist.check.js');

function subpaths(pkg) {
  return Object.keys(pkg.exports).filter((key) => key !== './package.json');
}

function entryPoint(pkg, condition, subpath = '.') {
  const target = pkg.exports[subpath][condition];
  return typeof target === 'string' ? target : target.default;
}

function checksFile(subpath) {
  return subpath === '.'
    ? PACKAGE_CHECKS
    : path.join('test', 'dist', `${subpath.slice(2)}.check.js`);
}

function loadPackageChecks(root, subpath = '.') {
  const file = path.join(root, checksFile(subpath));
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

module.exports = { PACKAGE_CHECKS, checksFile, entryPoint, loadPackageChecks, runChecks, subpaths };
