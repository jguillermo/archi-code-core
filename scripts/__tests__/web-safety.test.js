import { createRequire } from 'node:module';
import { describe, expect, test } from 'vitest';

const require = createRequire(import.meta.url);
const { findNodeGlobal, webGlobals } = require('../lib/web-safety');

describe('web-safety', () => {
  test('finds Node-only globals outside comments', () => {
    expect(findNodeGlobal('const fs = require("fs");')).toBe('require(');
    expect(findNodeGlobal('process.env.X')).toBe('process.');
    expect(findNodeGlobal('// process.env\n/* Buffer */ const x = 1;')).toBe(null);
    expect(findNodeGlobal('globalThis.process?.getBuiltinModule?.("x")')).toBe(null);
  });

  test('offers the standard Web APIs and no Node APIs', () => {
    const globals = webGlobals();
    const standard = ['TextEncoder', 'TextDecoder', 'crypto', 'atob', 'URL', 'setTimeout'];
    for (const name of [...standard, 'Response', 'DecompressionStream']) {
      expect(globals[name], name).toBeTruthy();
    }
    for (const name of ['process', 'Buffer', 'require', 'Worker']) {
      expect(globals[name], name).toBe(undefined);
    }
  });
});
