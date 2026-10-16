import { createRequire } from 'node:module';
import { describe, expect, test } from 'vitest';

const require = createRequire(import.meta.url);
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
    expect(errors).toStrictEqual([]);
  });

  test('rejects a real version in the package', () => {
    const errors = findVersionErrors(workspace({ name: '@archi-code/a', version: '1.0.0' }));
    expect(errors).toStrictEqual(['@archi-code/a: version "1.0.0" must be "0.0.0-development"']);
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
    expect(errors).toStrictEqual([
      '@archi-code/a: dependencies.@archi-code/b "0.0.1" must be "0.0.0-development"',
      '@archi-code/a: peerDependencies.@archi-code/c "*" must be "0.0.0-development"',
      '@archi-code/a: devDependencies.@archi-code/d "^1.0.0" must be "0.0.0-development"',
    ]);
  });
});
