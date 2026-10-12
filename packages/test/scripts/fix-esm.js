#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ESM_DIR = path.resolve(__dirname, '../dist/esm');

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
