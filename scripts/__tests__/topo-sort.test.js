'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { topoSort } = require('../lib/topo-sort');

describe('topoSort', () => {
  test('packages with no deps keep stable order', () => {
    const pkgs = [
      { name: 'a', internalDeps: [] },
      { name: 'b', internalDeps: [] },
      { name: 'c', internalDeps: [] },
    ];
    const result = topoSort(pkgs);
    assert.deepEqual(
      result.map((p) => p.name),
      ['a', 'b', 'c'],
    );
  });

  test('dependency comes before its dependent', () => {
    const pkgs = [
      { name: '@scope/app', internalDeps: ['@scope/common'] },
      { name: '@scope/common', internalDeps: [] },
    ];
    const result = topoSort(pkgs);
    const names = result.map((p) => p.name);
    assert.ok(names.indexOf('@scope/common') < names.indexOf('@scope/app'));
  });

  test('transitive: A → B → C, C must be first', () => {
    const pkgs = [
      { name: 'A', internalDeps: ['B'] },
      { name: 'B', internalDeps: ['C'] },
      { name: 'C', internalDeps: [] },
    ];
    const result = topoSort(pkgs);
    const names = result.map((p) => p.name);
    assert.ok(names.indexOf('C') < names.indexOf('B'), 'C before B');
    assert.ok(names.indexOf('B') < names.indexOf('A'), 'B before A');
  });

  test('diamond: D depends on B and C, both depend on A', () => {
    const pkgs = [
      { name: 'D', internalDeps: ['B', 'C'] },
      { name: 'B', internalDeps: ['A'] },
      { name: 'C', internalDeps: ['A'] },
      { name: 'A', internalDeps: [] },
    ];
    const result = topoSort(pkgs);
    const names = result.map((p) => p.name);
    assert.ok(names.indexOf('A') < names.indexOf('B'), 'A before B');
    assert.ok(names.indexOf('A') < names.indexOf('C'), 'A before C');
    assert.ok(names.indexOf('B') < names.indexOf('D'), 'B before D');
    assert.ok(names.indexOf('C') < names.indexOf('D'), 'C before D');
  });

  test('deps not in the list are ignored', () => {
    const pkgs = [
      { name: 'app', internalDeps: ['external-not-in-list'] },
      { name: 'lib', internalDeps: [] },
    ];
    const result = topoSort(pkgs);
    assert.equal(result.length, 2);
  });

  test('throws on circular dependency', () => {
    const pkgs = [
      { name: 'A', internalDeps: ['B'] },
      { name: 'B', internalDeps: ['A'] },
    ];
    assert.throws(() => topoSort(pkgs), /Circular dependency detected/);
  });

  test('matches the real packages.tree.json order (common before domain)', () => {
    const pkgs = [
      { name: '@archi-code/criteria', internalDeps: [] },
      { name: '@archi-code/crypto-tools', internalDeps: [] },
      { name: '@archi-code/ephemeradb', internalDeps: [] },
      { name: '@archi-code/common', internalDeps: [] },
      { name: '@archi-code/test', internalDeps: ['@archi-code/common'] },
      { name: '@archi-code/domain', internalDeps: ['@archi-code/common', '@archi-code/test'] },
    ];
    const result = topoSort(pkgs);
    const names = result.map((p) => p.name);
    assert.ok(names.indexOf('@archi-code/common') < names.indexOf('@archi-code/test'));
    assert.ok(names.indexOf('@archi-code/common') < names.indexOf('@archi-code/domain'));
    assert.ok(names.indexOf('@archi-code/test') < names.indexOf('@archi-code/domain'));
  });
});
