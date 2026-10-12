#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = process.cwd();
const pkg = require(path.join(ROOT, 'package.json'));

const MODES = [
  ['node16', 'node16'],
  ['nodenext', 'nodenext'],
  ['esnext', 'bundler'],
];

function fail(message) {
  console.error(`check-types: FAIL — ${message}`);
  process.exit(1);
}

function nodeModulesWithPackage(from) {
  for (let dir = from; dir !== path.dirname(dir); dir = path.dirname(dir)) {
    const candidate = path.join(dir, 'node_modules');
    if (fs.existsSync(path.join(candidate, pkg.name))) return candidate;
  }
  return fail(`no node_modules links ${pkg.name} — run npm install at the repo root`);
}

function consumerSource() {
  return `import * as published from '${pkg.name}';\nexport const exportCount: number = Object.keys(published).length;\n`;
}

function main() {
  const tsc = require.resolve('typescript/bin/tsc', { paths: [ROOT] });
  const consumer = fs.mkdtempSync(path.join(os.tmpdir(), 'check-types-'));
  try {
    fs.symlinkSync(nodeModulesWithPackage(ROOT), path.join(consumer, 'node_modules'), 'dir');
    fs.writeFileSync(path.join(consumer, 'esm-consumer.mts'), consumerSource());
    fs.writeFileSync(path.join(consumer, 'cjs-consumer.cts'), consumerSource());
    for (const [module, moduleResolution] of MODES) {
      try {
        execFileSync(
          process.execPath,
          [
            tsc,
            '--noEmit',
            '--strict',
            '--skipLibCheck',
            'false',
            '--target',
            'es2022',
            '--types',
            'node',
            '--module',
            module,
            '--moduleResolution',
            moduleResolution,
            'esm-consumer.mts',
            'cjs-consumer.cts',
          ],
          { cwd: consumer, stdio: 'pipe' },
        );
      } catch (e) {
        fail(`module=${module} moduleResolution=${moduleResolution}\n${e.stdout || e.message}`);
      }
    }
  } finally {
    fs.rmSync(consumer, { recursive: true, force: true });
  }
  console.log(
    `check-types: OK — ${pkg.name} types resolve for ESM and CJS consumers (${MODES.map(([, r]) => r).join(', ')})`,
  );
}

main();
