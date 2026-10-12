'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  STATE_FILE,
  baselineFor,
  commitsInState,
  emptyState,
  lastDeploy,
  openDeploy,
  readState,
  recordPublication,
  stateErrors,
  writeState,
} = require('../lib/release-state');

const A = 'a'.repeat(40);
const B = 'b'.repeat(40);
const C = 'c'.repeat(40);
const DATE = '2026-10-12T19:01:19.443Z';

function deploy(commit, channel, packages) {
  return { date: DATE, commit, channel, packages };
}

const state = {
  packages: {
    '@archi-code/x': { release: '1.0.0', main: '1.1.0-alpha.2' },
    '@archi-code/y': { main: '1.0.0-alpha.3' },
  },
  deploys: [
    deploy(A, 'release', [{ name: '@archi-code/x', previous: '1.0.0-alpha.9', version: '1.0.0' }]),
    deploy(B, 'main', [
      {
        name: '@archi-code/x',
        previous: '1.1.0-alpha.1',
        version: '1.1.0-alpha.2',
        dependencies: { '@archi-code/y': '1.0.0-alpha.3' },
      },
      { name: '@archi-code/y', previous: null, version: '1.0.0-alpha.3', commit: C },
    ]),
  ],
};

describe('baselineFor', () => {
  test('on main it starts from the deploy that published the newest version', () => {
    assert.deepEqual(baselineFor(state, '@archi-code/x', 'main'), {
      current: '1.1.0-alpha.2',
      lastStable: '1.0.0',
      commit: B,
      dependencies: { '@archi-code/y': '1.0.0-alpha.3' },
    });
  });

  test('on release it starts from the deploy that published the last stable', () => {
    assert.deepEqual(baselineFor(state, '@archi-code/x', 'release'), {
      current: '1.1.0-alpha.2',
      lastStable: '1.0.0',
      commit: A,
      dependencies: null,
    });
    assert.deepEqual(baselineFor(state, '@archi-code/y', 'release'), {
      current: '1.0.0-alpha.3',
      lastStable: null,
      commit: null,
      dependencies: null,
    });
  });

  test('a commit stored in the package entry wins over the commit of its deploy', () => {
    assert.equal(baselineFor(state, '@archi-code/y', 'main').commit, C);
  });

  test('a package never published has no baseline', () => {
    assert.deepEqual(baselineFor(state, '@archi-code/new', 'main'), {
      current: null,
      lastStable: null,
      commit: null,
      dependencies: null,
    });
  });
});

describe('recording a deploy', () => {
  test('one deploy holds every package published in the run and updates only their versions', () => {
    let next = openDeploy(state, { date: DATE, commit: C, channel: 'main' });
    next = recordPublication(next, {
      channel: 'main',
      entry: { name: '@archi-code/y', previous: '1.0.0-alpha.3', version: '1.0.0-alpha.4' },
    });
    next = recordPublication(next, {
      channel: 'main',
      entry: { name: '@archi-code/x', previous: '1.1.0-alpha.2', version: '1.1.0-alpha.3' },
    });
    assert.deepEqual(next.packages, {
      '@archi-code/x': { release: '1.0.0', main: '1.1.0-alpha.3' },
      '@archi-code/y': { main: '1.0.0-alpha.4' },
    });
    assert.deepEqual(lastDeploy(next), {
      date: DATE,
      commit: C,
      channel: 'main',
      packages: [
        { name: '@archi-code/y', previous: '1.0.0-alpha.3', version: '1.0.0-alpha.4' },
        { name: '@archi-code/x', previous: '1.1.0-alpha.2', version: '1.1.0-alpha.3' },
      ],
    });
    assert.equal(state.deploys.length, 2);
    assert.deepEqual(stateErrors(next), []);
  });

  test('an empty state has no last deploy', () => {
    assert.equal(lastDeploy(emptyState()), null);
  });

  test('lists every commit referenced by deploys and package entries once', () => {
    assert.deepEqual(commitsInState(state).sort(), [A, B, C]);
  });
});

describe('stateErrors', () => {
  test('a well formed state has no errors', () => {
    assert.deepEqual(stateErrors(state), []);
  });

  test('without deploys the current versions need no deploy that published them', () => {
    assert.deepEqual(
      stateErrors({ packages: { '@archi-code/x': { main: '1.0.0-alpha.3' } }, deploys: [] }),
      [],
    );
  });

  test('while a reset is unfinished, versions no deploy records are allowed', () => {
    const pending = {
      packages: {
        '@archi-code/x': { main: '2.0.0-alpha.1' },
        '@archi-code/y': { main: '1.0.0-alpha.1' },
      },
      deploys: [
        {
          ...deploy(A, 'main', [
            { name: '@archi-code/x', previous: null, version: '2.0.0-alpha.1' },
          ]),
          reset: '2.0.0-alpha.1',
        },
      ],
    };
    assert.deepEqual(stateErrors(pending), []);
    assert.deepEqual(
      stateErrors({ ...pending, deploys: [{ ...pending.deploys[0], reset: 'x' }] }),
      ['deploys[0]: reset no válido "x"'],
    );
  });

  test('a deploy opened for a reset keeps its target version', () => {
    const opened = openDeploy(emptyState(), {
      date: DATE,
      commit: A,
      channel: 'main',
      reset: '2.0.0-alpha.1',
    });
    assert.equal(lastDeploy(opened).reset, '2.0.0-alpha.1');
    assert.equal(
      'reset' in lastDeploy(openDeploy(emptyState(), { date: DATE, commit: A, channel: 'main' })),
      false,
    );
  });

  test('rejects a file without packages or deploys', () => {
    assert.deepEqual(stateErrors({}), [
      `${STATE_FILE} debe tener "packages" (objeto) y "deploys" (lista)`,
    ]);
  });

  test('reports malformed deploys before looking at the versions', () => {
    const errors = stateErrors({
      packages: { '@archi-code/x': { main: 'v1' } },
      deploys: [
        { date: 'x', commit: 'y', channel: 'z', packages: [] },
        deploy(A, 'main', [{ version: 'x', commit: 'short' }]),
      ],
    });
    assert.deepEqual(errors, [
      'deploys[0]: commit no válido',
      'deploys[0]: fecha no válida',
      'deploys[0]: canal no válido "z"',
      'deploys[0]: "packages" debe ser una lista no vacía',
      'deploys[1].packages[0]: necesita "name" y una "version" válida',
      'deploys[1].packages[0]: commit no válido',
    ]);
  });

  test('reports bad versions, channel mismatches and versions no deploy published', () => {
    const errors = stateErrors({
      packages: {
        '@archi-code/x': { main: '1.0.0', release: '1.0.0-alpha.1', beta: '1.0.0-beta.1' },
        '@archi-code/y': { main: 'v1' },
        '@archi-code/z': { main: '1.0.0-alpha.5' },
      },
      deploys: [
        deploy(A, 'main', [
          { name: '@archi-code/x', previous: null, version: '1.0.0' },
          { name: '@archi-code/x', previous: null, version: '1.0.0-alpha.1' },
        ]),
      ],
    });
    assert.deepEqual(errors, [
      '@archi-code/x (main): 1.0.0 debería ser una prerelease',
      '@archi-code/x (release): 1.0.0-alpha.1 debería ser estable',
      '@archi-code/x: canal desconocido "beta"',
      '@archi-code/y (main): versión no válida "v1"',
      '@archi-code/z (main): ningún deploy registra la publicación de 1.0.0-alpha.5',
    ]);
  });
});

describe('file', () => {
  test('a missing file is an empty state, and what is written is read back', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'release-state-'));
    assert.deepEqual(readState(root), emptyState());
    writeState(root, state);
    assert.deepEqual(readState(root), state);
    assert.ok(fs.readFileSync(path.join(root, STATE_FILE), 'utf8').endsWith('}\n'));
  });

  test('the releases.json of the repository is valid', () => {
    const repository = readState(path.join(__dirname, '..', '..'));
    assert.deepEqual(stateErrors(repository), []);
  });
});
