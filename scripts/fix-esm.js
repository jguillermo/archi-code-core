#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ESM_DIR = path.resolve(process.cwd(), 'dist/esm');

const SPECIFIER_RE = /(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(['"])(\.{1,2}\/[^'"]*)\2/g;
const REQUIRE_CALL_RE = /(^|[^.\w$])require\s*\(/m;
const REQUIRE_SHIM =
  "import { createRequire } from 'node:module';\nconst require = createRequire(import.meta.url);\n";

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

function withoutComments(code) {
  return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function withRequireShim(file, code) {
  if (!file.endsWith('.js') || !REQUIRE_CALL_RE.test(withoutComments(code))) return code;
  return REQUIRE_SHIM + code;
}

function main() {
  if (!fs.existsSync(ESM_DIR))
    throw new Error(`fix-esm: ${ESM_DIR} does not exist — run build:esm first`);
  let rewritten = 0;
  let shimmed = 0;
  for (const file of listFiles(ESM_DIR)) {
    const code = fs.readFileSync(file, 'utf8');
    const relinked = code.replace(SPECIFIER_RE, (_match, prefix, quote, specifier) => {
      return `${prefix}${quote}${resolveSpecifier(file, specifier)}${quote}`;
    });
    const next = withRequireShim(file, relinked);
    if (next !== relinked) shimmed++;
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
    `fix-esm: rewrote ${rewritten} files (${shimmed} with a require shim); wrote dist/esm/package.json`,
  );
}

main();
