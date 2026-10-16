import { createRequire } from 'node:module';
import { describe, expect, test } from 'vitest';

const require = createRequire(import.meta.url);
const { manifestErrors, publishManifest } = require('../lib/publish-manifest');

const DEV = '0.0.0-development';
const COMMIT = '34013dd6bb9b438f4d72dc2941970df226224fb9';

const release = {
  name: '@archi-code/domain',
  next: '1.0.0-alpha.4',
  dependencies: { '@archi-code/validation': '1.0.0-alpha.1' },
};

const local = {
  name: '@archi-code/domain',
  version: DEV,
  dependencies: { '@archi-code/validation': DEV, uuid: '^9.0.1' },
  devDependencies: { '@archi-code/test': DEV },
};

describe('publishManifest', () => {
  test('writes the new version, the source commit and exact internal deps, nothing else', () => {
    const manifest = publishManifest(local, release, COMMIT);
    expect(manifest).toStrictEqual({
      name: '@archi-code/domain',
      version: '1.0.0-alpha.4',
      releaseCommit: COMMIT,
      dependencies: { '@archi-code/validation': '1.0.0-alpha.1', uuid: '^9.0.1' },
      devDependencies: { '@archi-code/test': DEV },
    });
    expect(local.version).toBe(DEV);
    expect(local.dependencies['@archi-code/validation']).toBe(DEV);
  });

  test('pins internal peer dependencies too', () => {
    const manifest = publishManifest(
      { name: release.name, version: DEV, peerDependencies: { '@archi-code/validation': DEV } },
      release,
      COMMIT,
    );
    expect(manifest.peerDependencies).toStrictEqual({ '@archi-code/validation': '1.0.0-alpha.1' });
  });

  test('throws when an internal dep has no exact version in the plan', () => {
    expect(() => publishManifest({ ...local }, { ...release, dependencies: {} }, COMMIT)).toThrow(
      /there is no exact version for @archi-code\/validation/,
    );
  });
});

describe('manifestErrors', () => {
  test('a manifest built by publishManifest is valid', () => {
    expect(manifestErrors(publishManifest(local, release, COMMIT), release, COMMIT)).toStrictEqual(
      [],
    );
  });

  test('reports name, version, commit and any internal dep that is not the exact planned version', () => {
    const errors = manifestErrors(
      {
        name: '@archi-code/other',
        version: DEV,
        dependencies: { '@archi-code/validation': '^1.0.0-alpha.1' },
        peerDependencies: { '@archi-code/validation': DEV },
      },
      release,
      COMMIT,
    );
    expect(errors).toStrictEqual([
      'name "@archi-code/other" instead of "@archi-code/domain"',
      `version "${DEV}" instead of "1.0.0-alpha.4"`,
      `releaseCommit "undefined" instead of "${COMMIT}"`,
      'dependencies.@archi-code/validation "^1.0.0-alpha.1" instead of "1.0.0-alpha.1"',
      `peerDependencies.@archi-code/validation "${DEV}" instead of "1.0.0-alpha.1"`,
    ]);
  });
});
