'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
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
    assert.deepEqual(manifest, {
      name: '@archi-code/domain',
      version: '1.0.0-alpha.4',
      releaseCommit: COMMIT,
      dependencies: { '@archi-code/validation': '1.0.0-alpha.1', uuid: '^9.0.1' },
      devDependencies: { '@archi-code/test': DEV },
    });
    assert.equal(local.version, DEV);
    assert.equal(local.dependencies['@archi-code/validation'], DEV);
  });

  test('pins internal peer dependencies too', () => {
    const manifest = publishManifest(
      { name: release.name, version: DEV, peerDependencies: { '@archi-code/validation': DEV } },
      release,
      COMMIT,
    );
    assert.deepEqual(manifest.peerDependencies, { '@archi-code/validation': '1.0.0-alpha.1' });
  });

  test('throws when an internal dep has no exact version in the plan', () => {
    assert.throws(
      () => publishManifest({ ...local }, { ...release, dependencies: {} }, COMMIT),
      /no hay versión exacta para @archi-code\/validation/,
    );
  });
});

describe('manifestErrors', () => {
  test('a manifest built by publishManifest is valid', () => {
    assert.deepEqual(manifestErrors(publishManifest(local, release, COMMIT), release, COMMIT), []);
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
    assert.deepEqual(errors, [
      'name "@archi-code/other" en vez de "@archi-code/domain"',
      `version "${DEV}" en vez de "1.0.0-alpha.4"`,
      `releaseCommit "undefined" en vez de "${COMMIT}"`,
      'dependencies.@archi-code/validation "^1.0.0-alpha.1" en vez de "1.0.0-alpha.1"',
      `peerDependencies.@archi-code/validation "${DEV}" en vez de "1.0.0-alpha.1"`,
    ]);
  });
});
