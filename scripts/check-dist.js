#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { entryPoint, loadPackageChecks, runChecks } = require('./lib/package-checks');

const ROOT = process.cwd();
const pkg = require(path.join(ROOT, 'package.json'));

function fail(message) {
  console.error(`check-dist: FAIL — ${message}`);
  process.exit(1);
}

function exportNames(module) {
  return Object.keys(module)
    .filter((k) => k !== '__esModule' && k !== 'default')
    .sort();
}

async function main() {
  for (const field of ['main', 'module', 'types']) {
    const file = path.join(ROOT, pkg[field]);
    if (!fs.existsSync(file))
      fail(`package.json "${field}" points to a missing file: ${pkg[field]}`);
  }

  const cjs = require(path.join(ROOT, entryPoint(pkg, 'require')));
  const esm = await import(pathToFileURL(path.join(ROOT, entryPoint(pkg, 'import'))).href);

  const cjsKeys = exportNames(cjs);
  const esmKeys = exportNames(esm);
  if (cjsKeys.length === 0) fail('the CJS build exposes no exports');
  if (JSON.stringify(cjsKeys) !== JSON.stringify(esmKeys)) {
    fail(`CJS and ESM exports differ:\n  CJS: ${cjsKeys.join(', ')}\n  ESM: ${esmKeys.join(', ')}`);
  }

  const { smoke, crossBuild } = loadPackageChecks(ROOT);
  if (smoke) {
    await runChecks('CJS', smoke(cjs), fail);
    await runChecks('ESM', smoke(esm), fail);
  }
  if (crossBuild) await runChecks('CJS+ESM', crossBuild(cjs, esm), fail);

  console.log(
    `check-dist: OK — CJS and ESM load in Node and expose the same ${cjsKeys.length} exports`,
  );
}

main().catch((e) => fail(e && e.stack ? e.stack : String(e)));
