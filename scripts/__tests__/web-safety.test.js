import { createRequire } from 'node:module';
import { describe, expect, test } from 'vitest';

const require = createRequire(import.meta.url);
const { findNodeGlobal } = require('../lib/web-safety');

describe('web-safety', () => {
  test('finds Node-only globals outside comments', () => {
    expect(findNodeGlobal('const fs = require("fs");')).toBe('require(');
    expect(findNodeGlobal('process.env.X')).toBe('process.');
    expect(findNodeGlobal('// process.env\n/* Buffer */ const x = 1;')).toBe(null);
    expect(findNodeGlobal('globalThis.process?.getBuiltinModule?.("x")')).toBe(null);
  });
});
