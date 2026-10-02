#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..');
const pkg = require(path.join(ROOT, 'package.json'));

function fail(message) {
  console.error(`check-dist: FAIL — ${message}`);
  process.exit(1);
}

function throwsInstanceOf(create, ExceptionClass) {
  try {
    create();
  } catch (e) {
    return e instanceof ExceptionClass;
  }
  return false;
}

function smoke(label, m) {
  const checks = [
    ['StringType converts', () => new m.StringType(12).value === '12'],
    ['StringType keeps blanks as null', () => new m.StringType('  ').value === null],
    [
      'Required throws RequiredValueException',
      () => {
        class Name extends m.Required(m.StringType) {}
        return throwsInstanceOf(() => new Name(null), m.RequiredValueException);
      },
    ],
    [
      'NumberType rejects text',
      () => throwsInstanceOf(() => new m.NumberType('abc'), m.TypePrimitiveException),
    ],
    [
      'DateType reads ISO',
      () => new m.DateType('2018-03-23').toString === '2018-03-23T00:00:00.000Z',
    ],
    [
      'IdType is required',
      () => throwsInstanceOf(() => new m.IdType(null), m.RequiredValueException),
    ],
    [
      'validate',
      () => {
        const result = new m.StringType('abc').validate();
        return result.ok === true && result.value === 'abc' && result.errors.length === 0;
      },
    ],
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

  class RequiredAcrossBuilds extends esm.Required(cjs.StringType) {}
  if (!throwsInstanceOf(() => new RequiredAcrossBuilds(null), cjs.RequiredValueException)) {
    fail('the CJS and ESM builds do not share the required mark');
  }

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
