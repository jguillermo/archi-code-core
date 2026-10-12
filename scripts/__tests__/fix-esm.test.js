'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const { pathToFileURL } = require('url');

const FIX_ESM = path.join(__dirname, '..', 'fix-esm.js');
const SHIM = "import { createRequire } from 'node:module';";

function packageWith(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fix-esm-'));
  for (const [relative, content] of Object.entries(files)) {
    const file = path.join(root, 'dist', 'esm', relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
  return root;
}

function fixEsm(root) {
  return execFileSync(process.execPath, [FIX_ESM], { cwd: root, encoding: 'utf8' });
}

function read(root, relative) {
  return fs.readFileSync(path.join(root, 'dist', 'esm', relative), 'utf8');
}

describe('fix-esm', () => {
  test('adds .js to relative files and /index.js to directories', () => {
    const root = packageWith({
      'index.js': "export * from './a';\nexport { b } from './sub';\n",
      'a.js': "export const a = await import('./sub/b');\n",
      'sub/index.js': "export * from './b';\n",
      'sub/b.js': 'export const b = 1;\n',
    });
    fixEsm(root);
    assert.equal(
      read(root, 'index.js'),
      "export * from './a.js';\nexport { b } from './sub/index.js';\n",
    );
    assert.equal(read(root, 'a.js'), "export const a = await import('./sub/b.js');\n");
    assert.equal(read(root, 'sub/index.js'), "export * from './b.js';\n");
  });

  test('resolves "." and ".." to the directory index', () => {
    const root = packageWith({
      'index.js': "export * from './sub/b';\n",
      'sub/index.js': "export { a } from '..';\nexport * from '.';\n",
      'sub/b.js': 'export const a = 1;\n',
      'sub.js': 'export const decoy = 1;\n',
    });
    fixEsm(root);
    assert.equal(
      read(root, 'sub/index.js'),
      "export { a } from '../index.js';\nexport * from './index.js';\n",
    );
  });

  test('rewrites type imports in declaration files', () => {
    const root = packageWith({
      'index.js': 'export {};\n',
      'index.d.ts': 'export type T = import(\'./a\').A;\nexport * from "./a";\n',
      'a.js': 'export {};\n',
    });
    fixEsm(root);
    assert.equal(
      read(root, 'index.d.ts'),
      'export type T = import(\'./a.js\').A;\nexport * from "./a.js";\n',
    );
  });

  test('leaves strings, comments, bare and already complete specifiers untouched', () => {
    const code = [
      "import { x } from 'lib';",
      "import { y } from './y.js';",
      'export const text = "import z from \'./missing\'";',
      "// export * from './missing'",
      "/* import('./missing') */",
      'export const n = require.length;',
      '',
    ].join('\n');
    const root = packageWith({ 'index.js': code, 'y.js': 'export const y = 1;\n' });
    fixEsm(root);
    assert.equal(read(root, 'index.js'), code);
  });

  test('adds the require shim only where require() is called, and only once', async () => {
    const root = packageWith({
      'index.js': "export const path = require('node:path');\n",
      'text.js': "export const text = 'require(x)';\n",
    });
    fixEsm(root);
    const once = read(root, 'index.js');
    fixEsm(root);
    assert.equal(read(root, 'index.js'), once);
    assert.equal(once.split(SHIM).length, 2);
    assert.ok(!read(root, 'text.js').includes(SHIM));
    const loaded = await import(pathToFileURL(path.join(root, 'dist', 'esm', 'index.js')).href);
    assert.equal(typeof loaded.path.join, 'function');
  });

  test('writes dist/esm/package.json with type module', () => {
    const root = packageWith({ 'index.js': 'export {};\n' });
    fixEsm(root);
    assert.deepEqual(JSON.parse(read(root, 'package.json')), { type: 'module' });
  });

  test('fails on a relative import that does not exist', () => {
    const root = packageWith({ 'index.js': "export * from './missing';\n" });
    const result = spawnSync(process.execPath, [FIX_ESM], { cwd: root, encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /cannot resolve "\.\/missing"/);
  });
});
