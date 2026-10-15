#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { subpaths } = require('./lib/package-checks');

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

function specifierOf(subpath) {
  return subpath === '.' ? pkg.name : `${pkg.name}/${subpath.slice(2)}`;
}

function consumerSource() {
  const entries = subpaths(pkg);
  const imports = entries.map(
    (subpath, index) => `import * as entry${index} from '${specifierOf(subpath)}';`,
  );
  const counts = entries.map((_, index) => `Object.keys(entry${index}).length`).join(' + ');
  return `${imports.join('\n')}\nexport const exportCount: number = ${counts};\n`;
}

function compile(tsc, cwd, options, files) {
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
      ...options,
      ...files,
    ],
    { cwd, stdio: 'pipe' },
  );
}

function main() {
  const tsc = require.resolve('typescript/bin/tsc', { paths: [ROOT] });
  const consumer = fs.mkdtempSync(path.join(os.tmpdir(), 'check-types-'));
  try {
    fs.symlinkSync(nodeModulesWithPackage(ROOT), path.join(consumer, 'node_modules'), 'dir');
    fs.writeFileSync(path.join(consumer, 'esm-consumer.mts'), consumerSource());
    fs.writeFileSync(path.join(consumer, 'cjs-consumer.cts'), consumerSource());
    fs.writeFileSync(path.join(consumer, 'node10-consumer.ts'), consumerSource());
    for (const [module, moduleResolution] of MODES) {
      try {
        compile(
          tsc,
          consumer,
          ['--module', module, '--moduleResolution', moduleResolution],
          ['esm-consumer.mts', 'cjs-consumer.cts'],
        );
      } catch (e) {
        fail(`module=${module} moduleResolution=${moduleResolution}\n${e.stdout || e.message}`);
      }
    }
    try {
      compile(
        tsc,
        consumer,
        ['--module', 'commonjs', '--moduleResolution', 'node10'],
        ['node10-consumer.ts'],
      );
    } catch (e) {
      fail(`module=commonjs moduleResolution=node10\n${e.stdout || e.message}`);
    }
  } finally {
    fs.rmSync(consumer, { recursive: true, force: true });
  }
  console.log(
    `check-types: OK — ${pkg.name} types resolve for ESM and CJS consumers (${MODES.map(([, r]) => r).join(', ')}, node10)`,
  );
}

main();
