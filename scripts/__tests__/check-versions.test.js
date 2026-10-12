'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { findVersionErrors } = require('../check-versions');

function workspace(packageJson) {
  return [{ name: packageJson.name, packageJson }];
}

describe('findVersionErrors', () => {
  test('accepts packages and internal deps at 0.0.0-development', () => {
    const errors = findVersionErrors(
      workspace({
        name: '@archi-code/domain',
        version: '0.0.0-development',
        dependencies: { '@archi-code/validation': '0.0.0-development', uuid: '^9.0.1' },
      }),
    );
    assert.deepEqual(errors, []);
  });

  test('rejects a real version in the package', () => {
    const errors = findVersionErrors(workspace({ name: '@archi-code/a', version: '1.0.0' }));
    assert.deepEqual(errors, ['@archi-code/a: version "1.0.0" debe ser "0.0.0-development"']);
  });

  test('rejects internal deps with a version in any dependency field', () => {
    const errors = findVersionErrors(
      workspace({
        name: '@archi-code/a',
        version: '0.0.0-development',
        dependencies: { '@archi-code/b': '0.0.1' },
        peerDependencies: { '@archi-code/c': '*' },
        devDependencies: { '@archi-code/d': '^1.0.0' },
      }),
    );
    assert.deepEqual(errors, [
      '@archi-code/a: dependencies.@archi-code/b "0.0.1" debe ser "0.0.0-development"',
      '@archi-code/a: peerDependencies.@archi-code/c "*" debe ser "0.0.0-development"',
      '@archi-code/a: devDependencies.@archi-code/d "^1.0.0" debe ser "0.0.0-development"',
    ]);
  });
});
