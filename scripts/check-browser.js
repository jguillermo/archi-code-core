#!/usr/bin/env node
'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');
const crypto = require('crypto');
const { loadPackageChecks, runChecks, subpaths } = require('./lib/package-checks');

const ROOT = process.cwd();
const pkg = require(path.join(ROOT, 'package.json'));
const BROWSERS = (process.env.CHECK_BROWSERS || 'chromium,firefox,webkit').split(',');
const CONTENT_TYPES = { '.js': 'text/javascript', '.json': 'application/json' };

function fail(message) {
  console.error(`check-browser: FAIL — ${message}`);
  process.exit(1);
}

function loadPlaywright() {
  try {
    return require('playwright');
  } catch {
    return fail('playwright is not installed — run npm install at the repo root');
  }
}

function esmEntry(manifest, subpath) {
  const target = manifest.exports && manifest.exports[subpath];
  if (typeof target === 'string') return target;
  const pick = (condition) => (typeof condition === 'string' ? condition : condition?.default);
  return target ? (pick(target.browser) ?? pick(target.import) ?? null) : null;
}

function dependencyMounts(root, manifest, mounts = new Map()) {
  for (const name of Object.keys(manifest.dependencies ?? {})) {
    if (mounts.has(name)) continue;
    const file = require.resolve(`${name}/package.json`, { paths: [root] });
    const dir = fs.realpathSync(path.dirname(file));
    const dependency = JSON.parse(fs.readFileSync(file, 'utf8'));
    const entry = esmEntry(dependency, '.');
    if (!entry) fail(`dependency ${name} has no browser or import entry for "."`);
    mounts.set(name, { dir, entry });
    dependencyMounts(dir, dependency, mounts);
  }
  return mounts;
}

function importMapOf(mounts) {
  if (mounts.size === 0) return null;
  const imports = {};
  for (const [name, { entry }] of mounts) {
    imports[name] = `/node_modules/${name}/${entry.replace(/^\.\//, '')}`;
  }
  return JSON.stringify({ imports });
}

function pageCsp(csp, importMap) {
  if (!csp || !importMap) return csp;
  const hash = crypto.createHash('sha256').update(importMap).digest('base64');
  return csp.replace(/script-src\b/, `script-src 'sha256-${hash}'`);
}

function insideDir(dir, relative) {
  const file = path.join(dir, relative);
  return file.startsWith(dir + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile()
    ? file
    : null;
}

function transpiledTestModule(pathname) {
  const testDir = path.join(ROOT, 'test');
  const base = decodeURIComponent(pathname.slice('/test/'.length));
  const file = insideDir(testDir, `${base}.ts`) ?? insideDir(testDir, path.join(base, 'index.ts'));
  if (!file) return null;
  const ts = require(require.resolve('typescript', { paths: [ROOT] }));
  return ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  }).outputText;
}

function staticFile(pathname, mounts) {
  if (pathname.startsWith('/node_modules/')) {
    const rest = decodeURIComponent(pathname.slice('/node_modules/'.length));
    for (const [name, { dir }] of mounts) {
      if (rest.startsWith(`${name}/`)) return insideDir(dir, rest.slice(name.length + 1));
    }
    return null;
  }
  if (!pathname.startsWith('/dist/')) return null;
  return insideDir(path.join(ROOT, 'dist'), decodeURIComponent(pathname.slice('/dist/'.length)));
}

function startServer(pages, mounts) {
  const importMap = importMapOf(mounts);
  const head = importMap ? `<script type="importmap">${importMap}</script>` : '';
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://localhost');
    const page = pages.get(url.pathname);
    if (page) {
      const headers = { 'content-type': 'text/html; charset=utf-8' };
      const csp = pageCsp(page.csp, importMap);
      if (csp) headers['content-security-policy'] = csp;
      response.writeHead(200, headers);
      response.end(`<!doctype html><meta charset="utf-8"><title>check-browser</title>${head}`);
      return;
    }
    if (url.pathname.startsWith('/test/')) {
      const code = transpiledTestModule(url.pathname);
      if (code === null) {
        response.writeHead(404).end();
        return;
      }
      response.writeHead(200, { 'content-type': 'text/javascript' });
      response.end(code);
      return;
    }
    const file = staticFile(url.pathname, mounts);
    if (!file) {
      response.writeHead(404).end();
      return;
    }
    const type = CONTENT_TYPES[path.extname(file)] || 'application/octet-stream';
    response.writeHead(200, { 'content-type': type });
    fs.createReadStream(file).pipe(response);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

function browserChecksByEntry() {
  const found = [];
  for (const subpath of subpaths(pkg)) {
    const { browser } = loadPackageChecks(ROOT, subpath);
    if (!browser) continue;
    const entry = esmEntry(pkg, subpath);
    if (!entry || !fs.existsSync(path.join(ROOT, entry))) {
      fail(`the ESM entry of "${subpath}" (${entry}) does not exist — run npm run build`);
    }
    const label = subpath === '.' ? '' : `${subpath} `;
    for (const [name, run, options] of browser()) {
      found.push({ name: `${label}${name}`, run, options: options ?? {}, entry });
    }
  }
  return found;
}

async function main() {
  const checks = browserChecksByEntry();
  if (checks.length === 0) fail('no entry point has browser checks in test/dist');
  const pages = new Map(checks.map(({ options }, index) => [`/page-${index}.html`, options]));
  const playwright = loadPlaywright();
  const server = await startServer(pages, dependencyMounts(ROOT, pkg));
  const origin = `http://127.0.0.1:${server.address().port}`;
  let exercised = 0;
  try {
    for (const name of BROWSERS) {
      const type = playwright[name];
      if (!type) fail(`unknown browser ${name} in CHECK_BROWSERS`);
      let browser;
      try {
        browser = await type.launch();
      } catch (e) {
        fail(`${name} cannot start (${e.message.split('\n')[0]}) — run npx playwright install`);
      }
      try {
        const inPage = checks.map(({ name: check, run, entry }, index) => [
          check,
          async () => {
            const page = await browser.newPage();
            try {
              await page.goto(`${origin}/page-${index}.html`);
              return await page.evaluate(run, `${origin}/${entry.replace(/^\.\//, '')}`);
            } finally {
              await page.close();
            }
          },
        ]);
        exercised += await runChecks(name, inPage, fail);
      } finally {
        await browser.close();
      }
    }
  } finally {
    server.close();
  }
  console.log(
    `check-browser: OK — ${pkg.name} runs in ${BROWSERS.join(', ')} (${exercised} package checks)`,
  );
}

main().catch((e) => fail(e && e.stack ? e.stack : String(e)));
