#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ESM_DIR = path.resolve(process.cwd(), 'dist/esm');

const RELATIVE_RE = /^\.\.?(\/|$)/;
const DIRECTORY_RE = /(^|\/)\.{0,2}$/;
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
  if (!DIRECTORY_RE.test(specifier) && fs.existsSync(`${base}.js`)) return `${specifier}.js`;
  if (fs.existsSync(path.join(base, 'index.js'))) return `${specifier.replace(/\/$/, '')}/index.js`;
  throw new Error(
    `fix-esm: cannot resolve "${specifier}" imported from ${path.relative(ESM_DIR, fromFile)}`,
  );
}

function specifierOf(node) {
  if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) return node.moduleSpecifier;
  if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument))
    return node.argument.literal;
  if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword)
    return node.arguments[0];
  return undefined;
}

function isRequireCall(node) {
  return (
    ts.isCallExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === 'require'
  );
}

function analyze(file, code) {
  const kind = file.endsWith('.d.ts') ? ts.ScriptKind.TS : ts.ScriptKind.JS;
  const source = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, false, kind);
  const relativeSpecifiers = [];
  let callsRequire = false;
  const visit = (node) => {
    const specifier = specifierOf(node);
    if (specifier && ts.isStringLiteral(specifier) && RELATIVE_RE.test(specifier.text)) {
      relativeSpecifiers.push({ text: specifier.text, start: specifier.getStart(source) + 1 });
    }
    if (isRequireCall(node)) callsRequire = true;
    ts.forEachChild(node, visit);
  };
  visit(source);
  return { relativeSpecifiers, callsRequire };
}

function relink(file, code, relativeSpecifiers) {
  return relativeSpecifiers.reduceRight((next, { text, start }) => {
    const resolved = resolveSpecifier(file, text);
    return next.slice(0, start) + resolved + next.slice(start + text.length);
  }, code);
}

function withRequireShim(file, code, callsRequire) {
  if (!file.endsWith('.js') || !callsRequire || code.startsWith(REQUIRE_SHIM)) return code;
  return REQUIRE_SHIM + code;
}

function main() {
  if (!fs.existsSync(ESM_DIR))
    throw new Error(`fix-esm: ${ESM_DIR} does not exist — run build:esm first`);
  let rewritten = 0;
  let shimmed = 0;
  for (const file of listFiles(ESM_DIR)) {
    const code = fs.readFileSync(file, 'utf8');
    const { relativeSpecifiers, callsRequire } = analyze(file, code);
    const relinked = relink(file, code, relativeSpecifiers);
    const next = withRequireShim(file, relinked, callsRequire);
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
