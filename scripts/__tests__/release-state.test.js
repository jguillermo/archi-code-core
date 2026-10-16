import { createRequire } from 'node:module';
import { describe, expect, test } from 'vitest';

const require = createRequire(import.meta.url);
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
    expect(baselineFor(state, '@archi-code/x', 'main')).toStrictEqual({
      current: '1.1.0-alpha.2',
      lastStable: '1.0.0',
      commit: B,
      dependencies: { '@archi-code/y': '1.0.0-alpha.3' },
    });
  });

  test('on release it starts from the deploy that published the last stable', () => {
    expect(baselineFor(state, '@archi-code/x', 'release')).toStrictEqual({
      current: '1.1.0-alpha.2',
      lastStable: '1.0.0',
      commit: A,
      dependencies: null,
    });
    expect(baselineFor(state, '@archi-code/y', 'release')).toStrictEqual({
      current: '1.0.0-alpha.3',
      lastStable: null,
      commit: null,
      dependencies: null,
    });
  });

  test('a commit stored in the package entry wins over the commit of its deploy', () => {
    expect(baselineFor(state, '@archi-code/y', 'main').commit).toBe(C);
  });

  test('a package never published has no baseline', () => {
    expect(baselineFor(state, '@archi-code/new', 'main')).toStrictEqual({
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
    expect(next.packages).toStrictEqual({
      '@archi-code/x': { release: '1.0.0', main: '1.1.0-alpha.3' },
      '@archi-code/y': { main: '1.0.0-alpha.4' },
    });
    expect(lastDeploy(next)).toStrictEqual({
      date: DATE,
      commit: C,
      channel: 'main',
      packages: [
        { name: '@archi-code/y', previous: '1.0.0-alpha.3', version: '1.0.0-alpha.4' },
        { name: '@archi-code/x', previous: '1.1.0-alpha.2', version: '1.1.0-alpha.3' },
      ],
    });
    expect(state.deploys.length).toBe(2);
    expect(stateErrors(next)).toStrictEqual([]);
  });

  test('an empty state has no last deploy', () => {
    expect(lastDeploy(emptyState())).toBe(null);
  });

  test('lists every commit referenced by deploys and package entries once', () => {
    expect(commitsInState(state).sort()).toStrictEqual([A, B, C]);
  });
});

describe('stateErrors', () => {
  test('a well formed state has no errors', () => {
    expect(stateErrors(state)).toStrictEqual([]);
  });

  test('without deploys the current versions need no deploy that published them', () => {
    expect(
      stateErrors({ packages: { '@archi-code/x': { main: '1.0.0-alpha.3' } }, deploys: [] }),
    ).toStrictEqual([]);
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
    expect(stateErrors(pending)).toStrictEqual([]);
    expect(
      stateErrors({ ...pending, deploys: [{ ...pending.deploys[0], reset: 'x' }] }),
    ).toStrictEqual(['deploys[0]: invalid reset "x"']);
  });

  test('a deploy opened for a reset keeps its target version', () => {
    const opened = openDeploy(emptyState(), {
      date: DATE,
      commit: A,
      channel: 'main',
      reset: '2.0.0-alpha.1',
    });
    expect(lastDeploy(opened).reset).toBe('2.0.0-alpha.1');
    expect(
      'reset' in lastDeploy(openDeploy(emptyState(), { date: DATE, commit: A, channel: 'main' })),
    ).toBe(false);
  });

  test('rejects a file without packages or deploys', () => {
    expect(stateErrors({})).toStrictEqual([
      `${STATE_FILE} must have "packages" (object) and "deploys" (list)`,
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
    expect(errors).toStrictEqual([
      'deploys[0]: invalid commit',
      'deploys[0]: invalid date',
      'deploys[0]: invalid channel "z"',
      'deploys[0]: "packages" must be a non-empty list',
      'deploys[1].packages[0]: needs "name" and a valid "version"',
      'deploys[1].packages[0]: invalid commit',
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
    expect(errors).toStrictEqual([
      '@archi-code/x (main): 1.0.0 should be a prerelease',
      '@archi-code/x (release): 1.0.0-alpha.1 should be stable',
      '@archi-code/x: unknown channel "beta"',
      '@archi-code/y (main): invalid version "v1"',
      '@archi-code/z (main): no deploy records the publication of 1.0.0-alpha.5',
    ]);
  });
});

describe('file', () => {
  test('a missing file is an empty state, and what is written is read back', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'release-state-'));
    expect(readState(root)).toStrictEqual(emptyState());
    writeState(root, state);
    expect(readState(root)).toStrictEqual(state);
    expect(fs.readFileSync(path.join(root, STATE_FILE), 'utf8').endsWith('}\n')).toBeTruthy();
  });

  test('the releases.json of the repository is valid', () => {
    const repository = readState(path.join(import.meta.dirname, '..', '..'));
    expect(stateErrors(repository)).toStrictEqual([]);
  });
});
