#!/usr/bin/env node
'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');
const { loadPackageChecks, runChecks } = require('./lib/package-checks');

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

function startServer(pages) {
  const distDir = path.join(ROOT, 'dist');
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://localhost');
    const page = pages.get(url.pathname);
    if (page) {
      const headers = { 'content-type': 'text/html; charset=utf-8' };
      if (page.csp) headers['content-security-policy'] = page.csp;
      response.writeHead(200, headers);
      response.end('<!doctype html><meta charset="utf-8"><title>check-browser</title>');
      return;
    }
    const file = path.join(ROOT, decodeURIComponent(url.pathname));
    if (!file.startsWith(distDir + path.sep) || !fs.existsSync(file)) {
      response.writeHead(404).end();
      return;
    }
    const type = CONTENT_TYPES[path.extname(file)] || 'application/octet-stream';
    response.writeHead(200, { 'content-type': type });
    fs.createReadStream(file).pipe(response);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

async function main() {
  const webEntry = pkg.exports && pkg.exports['.'] && pkg.exports['.'].browser;
  if (!webEntry || !fs.existsSync(path.join(ROOT, webEntry))) {
    fail(`exports["."].browser (${webEntry}) does not exist — run npm run build`);
  }
  const { browser: browserChecks } = loadPackageChecks(ROOT);
  if (!browserChecks) fail('test/dist/dist.check.js exports no browser checks');
  const checks = browserChecks();
  const pages = new Map(
    checks.map(([, , options = {}], index) => [`/page-${index}.html`, options]),
  );
  const playwright = loadPlaywright();
  const server = await startServer(pages);
  const origin = `http://127.0.0.1:${server.address().port}`;
  const entry = `${origin}/${webEntry.replace(/^\.\//, '')}`;
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
        const inPage = checks.map(([check, run], index) => [
          check,
          async () => {
            const page = await browser.newPage();
            try {
              await page.goto(`${origin}/page-${index}.html`);
              return await page.evaluate(run, entry);
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
