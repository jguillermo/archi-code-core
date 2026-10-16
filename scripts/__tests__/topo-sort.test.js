import { createRequire } from 'node:module';
import { describe, expect, test } from 'vitest';

const require = createRequire(import.meta.url);
const { topoSort } = require('../lib/topo-sort');

describe('topoSort', () => {
  test('packages with no deps keep stable order', () => {
    const pkgs = [
      { name: 'a', internalDeps: [] },
      { name: 'b', internalDeps: [] },
      { name: 'c', internalDeps: [] },
    ];
    const result = topoSort(pkgs);
    expect(result.map((p) => p.name)).toStrictEqual(['a', 'b', 'c']);
  });

  test('dependency comes before its dependent', () => {
    const pkgs = [
      { name: '@scope/app', internalDeps: ['@scope/common'] },
      { name: '@scope/common', internalDeps: [] },
    ];
    const result = topoSort(pkgs);
    const names = result.map((p) => p.name);
    expect(names.indexOf('@scope/common') < names.indexOf('@scope/app')).toBeTruthy();
  });

  test('transitive: A → B → C, C must be first', () => {
    const pkgs = [
      { name: 'A', internalDeps: ['B'] },
      { name: 'B', internalDeps: ['C'] },
      { name: 'C', internalDeps: [] },
    ];
    const result = topoSort(pkgs);
    const names = result.map((p) => p.name);
    expect(names.indexOf('C') < names.indexOf('B'), 'C before B').toBeTruthy();
    expect(names.indexOf('B') < names.indexOf('A'), 'B before A').toBeTruthy();
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
    expect(names.indexOf('A') < names.indexOf('B'), 'A before B').toBeTruthy();
    expect(names.indexOf('A') < names.indexOf('C'), 'A before C').toBeTruthy();
    expect(names.indexOf('B') < names.indexOf('D'), 'B before D').toBeTruthy();
    expect(names.indexOf('C') < names.indexOf('D'), 'C before D').toBeTruthy();
  });

  test('deps not in the list are ignored', () => {
    const pkgs = [
      { name: 'app', internalDeps: ['external-not-in-list'] },
      { name: 'lib', internalDeps: [] },
    ];
    const result = topoSort(pkgs);
    expect(result.length).toBe(2);
  });

  test('throws on circular dependency', () => {
    const pkgs = [
      { name: 'A', internalDeps: ['B'] },
      { name: 'B', internalDeps: ['A'] },
    ];
    expect(() => topoSort(pkgs)).toThrow(/Circular dependency detected/);
  });

  test('a dependency shared by two packages is built before both', () => {
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
    expect(names.indexOf('@archi-code/common') < names.indexOf('@archi-code/test')).toBeTruthy();
    expect(names.indexOf('@archi-code/common') < names.indexOf('@archi-code/domain')).toBeTruthy();
    expect(names.indexOf('@archi-code/test') < names.indexOf('@archi-code/domain')).toBeTruthy();
  });
});
