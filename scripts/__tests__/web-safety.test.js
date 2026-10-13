'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { findNodeGlobal, webGlobals } = require('../lib/web-safety');

describe('web-safety', () => {
  test('finds Node-only globals outside comments', () => {
    assert.equal(findNodeGlobal('const fs = require("fs");'), 'require(');
    assert.equal(findNodeGlobal('process.env.X'), 'process.');
    assert.equal(findNodeGlobal('// process.env\n/* Buffer */ const x = 1;'), null);
    assert.equal(findNodeGlobal('globalThis.process?.getBuiltinModule?.("x")'), null);
  });

  test('offers the standard Web APIs and no Node APIs', () => {
    const globals = webGlobals();
    for (const name of ['TextEncoder', 'TextDecoder', 'crypto', 'atob', 'URL', 'setTimeout']) {
      assert.ok(globals[name], name);
    }
    for (const name of ['process', 'Buffer', 'require', 'Worker']) {
      assert.equal(globals[name], undefined, name);
    }
  });
});
