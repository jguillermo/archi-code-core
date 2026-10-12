#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { entryPoint, loadPackageChecks, runChecks } = require('./lib/package-checks');

const ROOT = process.cwd();
const pkg = require(path.join(ROOT, 'package.json'));

function fail(message) {
  console.error(`check-web: FAIL — ${message}`);
  process.exit(1);
}

if (typeof vm.SourceTextModule !== 'function') {
  fail('vm.SourceTextModule is unavailable — run with node --experimental-vm-modules');
}

const webEntry = pkg.exports['.'].browser;
if (pkg.browser !== webEntry || !webEntry || !webEntry.startsWith('./dist/esm/')) {
  fail(
    `"browser" field and exports["."].browser must both point to the ESM build (got ${pkg.browser} / ${webEntry})`,
  );
}
const ENTRY = path.join(ROOT, webEntry);
const ESM_DIR = path.dirname(ENTRY);
if (!fs.existsSync(ENTRY)) fail(`web entry ${webEntry} does not exist — run npm run build`);

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

async function loadInBrowserLikeRealm() {
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
  return entry.namespace;
}

async function main() {
  const web = await loadInBrowserLikeRealm();
  const node = require(path.join(ROOT, entryPoint(pkg, 'require')));

  const { web: webChecks } = loadPackageChecks(ROOT);
  const exercised = webChecks ? await runChecks('web', webChecks(web, node), fail) : 0;

  console.log(`check-web: OK — ESM build runs without Node APIs (${exercised} package checks)`);
}

main().catch((e) => fail(e && e.stack ? e.stack : String(e)));
