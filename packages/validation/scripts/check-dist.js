#!/usr/bin/env node
'use strict';

/**
 * Verifies that the published build really works (run after `npm run build`):
 *   - the files referenced by package.json (main/module/types) exist;
 *   - the CommonJS build loads with `require`;
 *   - the ES module build loads with Node's native `import`;
 *   - both builds expose exactly the same exports and behave the same on a few calls.
 * Exits with code 1 on the first problem.
 */
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..');
const pkg = require(path.join(ROOT, 'package.json'));

function fail(message) {
  console.error(`check-dist: FAIL — ${message}`);
  process.exit(1);
}

function smoke(label, m) {
  const checks = [
    ['validator.isEmail', () => m.validator.isEmail('a@b.com') === true],
    [
      'toInteger',
      () =>
        JSON.stringify(m.toInteger('42')) === JSON.stringify({ ok: true, value: 42, error: null }),
    ],
    [
      'toBoolean failure',
      () => m.toBoolean('maybe').ok === false && typeof m.toBoolean('maybe').error === 'string',
    ],
    ['canBeDate', () => m.canBeDate('2024/01/31') === true],
    ['sanitizer.trim', () => m.sanitizer.trim('  a  ') === 'a'],
    ['createValidator', () => typeof m.createValidator({}).isEmail === 'function'],
  ];
  for (const [name, check] of checks) {
    let passed = false;
    try {
      passed = check();
    } catch (e) {
      fail(`${label}: ${name} threw ${e && e.message}`);
    }
    if (!passed) fail(`${label}: ${name} returned an unexpected result`);
  }
}

async function main() {
  for (const field of ['main', 'module', 'types']) {
    const file = path.join(ROOT, pkg[field]);
    if (!fs.existsSync(file))
      fail(`package.json "${field}" points to a missing file: ${pkg[field]}`);
  }

  const cjs = require(path.join(ROOT, pkg.exports['.'].require));
  const esm = await import(pathToFileURL(path.join(ROOT, pkg.exports['.'].import)).href);

  smoke('CJS', cjs);
  smoke('ESM', esm);

  const cjsKeys = Object.keys(cjs)
    .filter((k) => k !== '__esModule' && k !== 'default')
    .sort();
  const esmKeys = Object.keys(esm)
    .filter((k) => k !== 'default')
    .sort();
  if (JSON.stringify(cjsKeys) !== JSON.stringify(esmKeys)) {
    fail(`CJS and ESM exports differ:\n  CJS: ${cjsKeys.join(', ')}\n  ESM: ${esmKeys.join(', ')}`);
  }

  console.log(
    `check-dist: OK — CJS and ESM load in Node and expose the same ${cjsKeys.length} exports`,
  );
}

main().catch((e) => fail(e && e.stack ? e.stack : String(e)));
