#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { pathToFileURL } = require('url');
const {
  checksFile,
  entryPoint,
  loadPackageChecks,
  runChecks,
  subpaths,
} = require('./lib/package-checks');
const { packageDocsErrors, packedDocsErrors } = require('./lib/package-docs');

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

function checkEntryFields(entries) {
  const fields = ['main', 'module', 'types'];
  if (!entries.includes('.')) {
    const declared = fields.filter((field) => pkg[field] !== undefined);
    if (declared.length) fail(`a package without "." in exports declares ${declared.join(', ')}`);
    return;
  }
  for (const field of fields) {
    const file = path.join(ROOT, pkg[field]);
    if (!fs.existsSync(file))
      fail(`package.json "${field}" points to a missing file: ${pkg[field]}`);
  }
}

function checkNoOrphanChecks(entries) {
  const dir = path.join(ROOT, 'test', 'dist');
  if (!fs.existsSync(dir)) return;
  const expected = new Set(entries.map((subpath) => path.basename(checksFile(subpath))));
  const orphans = fs
    .readdirSync(dir)
    .filter((file) => file.endsWith('.check.js') && !expected.has(file));
  if (orphans.length) fail(`test/dist has checks for no exported entry: ${orphans.join(', ')}`);
}

async function checkEntry(subpath) {
  const label = subpath === '.' ? '' : `${subpath} `;
  const cjs = require(path.join(ROOT, entryPoint(pkg, 'require', subpath)));
  const esm = await import(pathToFileURL(path.join(ROOT, entryPoint(pkg, 'import', subpath))).href);

  const cjsKeys = exportNames(cjs);
  const esmKeys = exportNames(esm);
  if (cjsKeys.length === 0) fail(`${label}the CJS build exposes no exports`);
  if (JSON.stringify(cjsKeys) !== JSON.stringify(esmKeys)) {
    fail(
      `${label}CJS and ESM exports differ:\n  CJS: ${cjsKeys.join(', ')}\n  ESM: ${esmKeys.join(', ')}`,
    );
  }

  const { smoke, crossBuild } = loadPackageChecks(ROOT, subpath);
  if (smoke) {
    await runChecks(`${label}CJS`, smoke(cjs), fail);
    await runChecks(`${label}ESM`, smoke(esm), fail);
  }
  if (crossBuild) await runChecks(`${label}CJS+ESM`, crossBuild(cjs, esm), fail);
  return cjsKeys.length;
}

async function main() {
  const entries = subpaths(pkg);
  if (entries.length === 0) fail('package.json "exports" has no entry point');
  checkEntryFields(entries);
  checkNoOrphanChecks(entries);
  let exportCount = 0;
  for (const subpath of entries) exportCount += await checkEntry(subpath);

  const [packed] = JSON.parse(
    execFileSync('npm', ['pack', '--dry-run', '--json'], { cwd: ROOT, encoding: 'utf8' }),
  );
  const docsErrors = [
    ...packageDocsErrors(ROOT, pkg),
    ...packedDocsErrors(packed.files.map((file) => file.path)),
  ];
  if (docsErrors.length) fail(docsErrors.join('\n  '));

  console.log(
    `check-dist: OK — CJS and ESM load in Node and expose the same ${exportCount} exports (${entries.join(', ')}); README.md and SKILL.md are packed`,
  );
}

main().catch((e) => fail(e && e.stack ? e.stack : String(e)));
