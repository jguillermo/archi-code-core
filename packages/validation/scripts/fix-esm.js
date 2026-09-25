#!/usr/bin/env node
'use strict';

/**
 * Post-build step for the ESM output (dist/esm).
 *
 * `tsc` keeps relative specifiers as written in the source (`'./validators'`, `'./convert/date'`),
 * but Node's ESM loader requires full paths (`'./validators/index.js'`, `'./convert/date.js'`) and
 * needs `"type": "module"` to treat `.js` files as ES modules. This script:
 *   1. rewrites every relative specifier in dist/esm/**\/*.js and *.d.ts to its full `.js` path;
 *   2. writes dist/esm/package.json with `{ "type": "module" }`.
 * The source code is not touched.
 */
const fs = require('fs');
const path = require('path');

const ESM_DIR = path.resolve(__dirname, '../dist/esm');

// from '…' | import('…') | import '…'  — relative specifiers only
const SPECIFIER_RE = /(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(['"])(\.{1,2}\/[^'"]*)\2/g;

function listFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listFiles(full);
    return /\.(js|d\.ts)$/.test(entry.name) ? [full] : [];
  });
}

function resolveSpecifier(fromFile, specifier) {
  if (/\.(js|mjs|cjs|json)$/.test(specifier)) return specifier;
  const base = path.resolve(path.dirname(fromFile), specifier);
  if (fs.existsSync(`${base}.js`)) return `${specifier}.js`;
  if (fs.existsSync(path.join(base, 'index.js'))) return `${specifier.replace(/\/$/, '')}/index.js`;
  throw new Error(
    `fix-esm: cannot resolve "${specifier}" imported from ${path.relative(ESM_DIR, fromFile)}`,
  );
}

function main() {
  if (!fs.existsSync(ESM_DIR))
    throw new Error(`fix-esm: ${ESM_DIR} does not exist — run build:esm first`);
  let rewritten = 0;
  for (const file of listFiles(ESM_DIR)) {
    const code = fs.readFileSync(file, 'utf8');
    const next = code.replace(SPECIFIER_RE, (_match, prefix, quote, specifier) => {
      return `${prefix}${quote}${resolveSpecifier(file, specifier)}${quote}`;
    });
    if (next !== code) {
      fs.writeFileSync(file, next);
      rewritten++;
    }
  }
  fs.writeFileSync(
    path.join(ESM_DIR, 'package.json'),
    `${JSON.stringify({ type: 'module' }, null, 2)}\n`,
  );
  console.log(
    `fix-esm: rewrote relative imports in ${rewritten} files; wrote dist/esm/package.json`,
  );
}

main();
