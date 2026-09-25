#!/usr/bin/env node
'use strict';

/**
 * Verifies the WEB packaging (dist/esm, served by the "browser" export condition) really works in a
 * browser-like environment. Run with: node --experimental-vm-modules scripts/check-web.js
 *
 *   1. package.json "browser" and exports["."].browser point to the ESM build;
 *   2. static scan of dist/esm: only relative imports with full `.js` paths (no bare specifiers such
 *      as 'fs' that a browser cannot resolve) and no Node-only globals (process, Buffer, require…);
 *   3. runtime: the ESM build is linked and evaluated inside a `vm` context that only has the
 *      standard JavaScript globals — no `require`, `process`, `Buffer`, `module`… exactly what a
 *      browser lacks — and every public validator/converter is exercised there.
 * Exits with code 1 on the first problem.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const pkg = require(path.join(ROOT, 'package.json'));

function fail(message) {
  console.error(`check-web: FAIL — ${message}`);
  process.exit(1);
}

if (typeof vm.SourceTextModule !== 'function') {
  fail('vm.SourceTextModule is unavailable — run with node --experimental-vm-modules');
}

// ─── 1. package.json wiring ──────────────────────────────────────────────────

const webEntry = pkg.exports['.'].browser;
if (pkg.browser !== webEntry || !webEntry || !webEntry.startsWith('./dist/esm/')) {
  fail(
    `"browser" field and exports["."].browser must both point to the ESM build (got ${pkg.browser} / ${webEntry})`,
  );
}
const ENTRY = path.join(ROOT, webEntry);
const ESM_DIR = path.dirname(ENTRY);
if (!fs.existsSync(ENTRY)) fail(`web entry ${webEntry} does not exist — run npm run build`);

// ─── 2. static scan ──────────────────────────────────────────────────────────

function listJs(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return listJs(full);
    return e.name.endsWith('.js') ? [full] : [];
  });
}

const SPECIFIER_RE = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(['"])([^'"]+)\1/g;
const NODE_GLOBALS_RE =
  /\b(?:require\s*\(|process\.|Buffer\b|__dirname\b|__filename\b|module\.exports\b|exports\.)/;

for (const file of listJs(ESM_DIR)) {
  const rel = path.relative(ROOT, file);
  const code = fs.readFileSync(file, 'utf8');
  for (const match of code.matchAll(SPECIFIER_RE)) {
    const specifier = match[2];
    if (!specifier.startsWith('.'))
      fail(`${rel} imports "${specifier}" — a browser cannot resolve bare specifiers`);
    if (!specifier.endsWith('.js')) fail(`${rel} imports "${specifier}" without a .js extension`);
  }
  const withoutComments = code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  const nodeGlobal = withoutComments.match(NODE_GLOBALS_RE);
  if (nodeGlobal) fail(`${rel} uses the Node-only global "${nodeGlobal[0]}"`);
}

// ─── 3. runtime in a browser-like context ────────────────────────────────────

async function main() {
  // A fresh realm: ECMAScript built-ins (incl. Intl) only — no Node APIs, like a browser.
  const context = vm.createContext({});
  const cache = new Map();

  const load = (file) => {
    let mod = cache.get(file);
    if (!mod) {
      mod = new vm.SourceTextModule(fs.readFileSync(file, 'utf8'), { context, identifier: file });
      cache.set(file, mod);
    }
    return mod;
  };

  const entry = load(ENTRY);
  await entry.link((specifier, referencing) =>
    load(path.resolve(path.dirname(referencing.identifier), specifier)),
  );
  await entry.evaluate();
  const m = entry.namespace;

  const expect = (label, actual, expected) => {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      fail(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
  };
  expect('validator.isEmail', m.validator.isEmail('a@b.com'), true);
  expect('toInteger', m.toInteger('42'), { ok: true, value: 42, error: null });
  expect('toBoolean', m.toBoolean('maybe').ok, false);
  expect('canBeDate', m.canBeDate('2024/01/31'), true);
  expect('sanitizer.trim', m.sanitizer.trim('  a  '), 'a');
  expect(
    'isLength graphemes (Intl.Segmenter)',
    m.validator.isLength('👨‍👩‍👧', { max: 1, graphemes: true }),
    true,
  );

  // Exercise EVERY public function in the browser-like realm and compare each outcome with the
  // Node (CJS) build: the result — or the error thrown — must be identical. A ReferenceError that
  // only happens in the browser-like realm means a Node-only API and fails the check.
  const node = require(path.join(ROOT, pkg.exports['.'].require));
  const publicFunctions = (ns) => [
    ...Object.entries(ns.validator)
      .filter(([, fn]) => typeof fn === 'function')
      .map(([name, fn]) => [`validator.${name}`, fn]),
    ...Object.entries(ns)
      .filter(([name, fn]) => typeof fn === 'function' && /^(to|canBe)/.test(name))
      .map(([name, fn]) => [name, fn]),
    ...Object.entries(ns.sanitizer)
      .filter(([, fn]) => typeof fn === 'function')
      .map(([name, fn]) => [`sanitizer.${name}`, fn]),
  ];
  const run = (fn, args) => {
    try {
      return { value: JSON.stringify(fn(...args)) };
    } catch (e) {
      return { error: e && e.name };
    }
  };
  const nodeFns = new Map(publicFunctions(node));
  const webFns = publicFunctions(m);
  if (webFns.length !== nodeFns.size)
    fail(`web exposes ${webFns.length} functions, Node ${nodeFns.size}`);

  const INPUTS = ['a', '1', '-2.5', '2024/01/31', '', 'a@b.com', 'https://x.io', 'true', '{"a":1}'];
  for (const [name, webFn] of webFns) {
    const nodeFn = nodeFns.get(name);
    if (!nodeFn) fail(`${name} exists in the web build but not in the Node build`);
    for (const input of INPUTS) {
      for (const args of [[input], [input, 'en-US']]) {
        const web = run(webFn, args);
        const nodeResult = run(nodeFn, args);
        // A ReferenceError means an API that exists in Node but not in a browser.
        if (web.error === 'ReferenceError' && nodeResult.error !== 'ReferenceError') {
          fail(`${name}(${JSON.stringify(args)}) uses an API missing in browsers (ReferenceError)`);
        }
        if (JSON.stringify(web) !== JSON.stringify(nodeResult)) {
          fail(
            `${name}(${JSON.stringify(args)}) differs: web=${JSON.stringify(web)} node=${JSON.stringify(nodeResult)}`,
          );
        }
      }
    }
  }
  const functions = webFns;

  console.log(
    `check-web: OK — ESM build runs without Node APIs (${functions.length} public functions exercised)`,
  );
}

main().catch((e) => fail(e && e.stack ? e.stack : String(e)));
