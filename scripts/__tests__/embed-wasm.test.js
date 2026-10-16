import { createRequire } from 'node:module';
import { describe, expect, test } from 'vitest';

const require = createRequire(import.meta.url);
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const zlib = require('zlib');

const EMBED_WASM = path.join(import.meta.dirname, '..', 'embed-wasm.js');
const GLUE =
  'let wasm_bindgen = (function(exports) {\n' +
  '    function add(a, b) { return wasm.add(a, b); }\n' +
  '    exports.add = add;\n' +
  '    function finish(instance) { wasm = instance.exports; }\n' +
  '    return Object.assign(init, exports);\n' +
  '})({ __proto__: null });\n';

function packageWith(glue, wasm = Buffer.from([0, 97, 115, 109])) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'embed-wasm-'));
  fs.mkdirSync(path.join(root, 'wasm'));
  if (glue !== undefined) fs.writeFileSync(path.join(root, 'wasm', 'lib.js'), glue);
  fs.writeFileSync(path.join(root, 'wasm', 'lib_bg.wasm'), wasm);
  return root;
}

function embed(root, ...args) {
  return spawnSync(process.execPath, [EMBED_WASM, ...args], { cwd: root, encoding: 'utf8' });
}

describe('embed-wasm', () => {
  test('writes the wasm gzipped as base64 and the glue without Node globals', () => {
    const root = packageWith(GLUE);
    const result = embed(root, 'wasm/lib', 'src/wasm/assets.generated.ts');
    expect(result.status, result.stderr).toBe(0);
    const source = fs.readFileSync(path.join(root, 'src/wasm/assets.generated.ts'), 'utf8');
    const [, embedded] = source.match(/export const WASM_GZIP_BASE64: string = '([^']+)';/);
    expect([...zlib.gunzipSync(Buffer.from(embedded, 'base64'))]).toStrictEqual([0, 97, 115, 109]);
    expect(source).toMatch(/function\(bindings\)/);
    expect(source).toMatch(/bindings\.add = add;/);
    expect(source).toMatch(/wasm = instance\.exports;/);
    expect(source).not.toMatch(/[^.]exports\./);
  });

  test('needs both paths', () => {
    const result = embed(packageWith(GLUE), 'wasm/lib');
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/usage: node embed-wasm\.js/);
  });

  test('fails when the wasm has not been built', () => {
    const result = embed(packageWith(undefined), 'wasm/lib', 'out.ts');
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/wasm\/lib\.js does not exist/);
  });

  test('accepts only no-modules glue', () => {
    const result = embed(packageWith('export function add() {}\n'), 'wasm/lib', 'out.ts');
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/not wasm-bindgen --target no-modules output/);
  });

  test('refuses glue that still needs Node or imports modules', () => {
    const node = embed(packageWith(`${GLUE}require('fs');\n`), 'wasm/lib', 'out.ts');
    expect(node.status).toBe(1);
    expect(node.stderr).toMatch(/Node-only global "require\("/);
    const imported = embed(packageWith(`${GLUE}import('./other.js');\n`), 'wasm/lib', 'out.ts');
    expect(imported.status).toBe(1);
    expect(imported.stderr).toMatch(/the glue imports "\.\/other\.js"/);
  });
});
