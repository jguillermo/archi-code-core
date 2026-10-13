'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { buildPlan, classifyCommit } = require('../lib/release-plan');
const { CHANNELS, channelFor, compareVersions, nextVersion } = require('../lib/versions');

const MAIN = CHANNELS.main;
const RELEASE = CHANNELS.release;

const BASE = '@archi-code/base';
const MID = '@archi-code/mid';
const APP = '@archi-code/app';
const PEER_USER = '@archi-code/peer-user';
const DEV_USER = '@archi-code/dev-user';

function pkg(name, dependencies = {}, extra = {}) {
  return { name, dir: `packages/${name}`, packageJson: { name, dependencies, ...extra } };
}

function stateWith(published) {
  const packages = {};
  const deploys = [
    {
      date: '2026-10-01T00:00:00Z',
      commit: 'start',
      channel: 'main',
      packages: [{ name: '@archi-code/unrelated', previous: null, version: '1.0.0-alpha.1' }],
    },
  ];
  for (const [name, channels] of Object.entries(published)) {
    packages[name] = {};
    for (const [channel, version] of Object.entries(channels)) {
      packages[name][channel] = version;
      deploys.push({
        date: '2026-10-12T00:00:00Z',
        commit: `${name}@${version}`,
        channel,
        packages: [{ name, previous: null, version }],
      });
    }
  }
  return { packages, deploys };
}

function pinnedState(pinned) {
  return {
    packages: { [BASE]: { main: '1.0.0-alpha.3' }, [APP]: { main: '1.0.0-alpha.1' } },
    deploys: [
      {
        date: '2026-10-12T00:00:00Z',
        commit: 'deploy',
        channel: 'main',
        packages: [
          { name: BASE, previous: null, version: '1.0.0-alpha.3' },
          { name: APP, previous: null, version: '1.0.0-alpha.1', dependencies: { [BASE]: pinned } },
        ],
      },
    ],
  };
}

function plan({ branch = 'main', packages, published = {}, commits = {} }) {
  const calls = [];
  const result = buildPlan({
    branch,
    packages,
    state: stateWith(published),
    readCommits: (item, since) => {
      calls.push([item.name, since]);
      return (commits[item.name] ?? []).map((subject, index) => ({ hash: `h${index}`, subject }));
    },
  });
  return { result, calls, byName: Object.fromEntries(result.packages.map((p) => [p.name, p])) };
}

describe('channelFor', () => {
  test('main publishes alpha prereleases under the main dist-tag', () => {
    assert.deepEqual(channelFor('main'), {
      branch: 'main',
      prerelease: 'alpha',
      distTags: ['latest', 'main'],
    });
  });

  test('release publishes stable versions under latest', () => {
    assert.deepEqual(channelFor('release'), {
      branch: 'release',
      prerelease: null,
      distTags: ['latest'],
    });
  });

  test('any other branch is rejected', () => {
    assert.throws(() => channelFor('feature/x'), /does not publish/);
  });
});

describe('classifyCommit', () => {
  test('feat is minor, fix and perf are patch', () => {
    assert.equal(classifyCommit({ subject: 'feat(domain): add x' }).bump, 'minor');
    assert.equal(classifyCommit({ subject: 'fix: y' }).bump, 'patch');
    assert.equal(classifyCommit({ subject: 'perf(validation): z' }).bump, 'patch');
  });

  test('chore, docs, test, style, ci, build, refactor and revert do not release', () => {
    for (const type of ['chore', 'docs', 'test', 'style', 'ci', 'build', 'refactor', 'revert']) {
      assert.deepEqual(classifyCommit({ subject: `${type}: x` }), {
        bump: null,
        conventional: true,
      });
    }
  });

  test('a bang or a BREAKING CHANGE footer is major', () => {
    assert.equal(classifyCommit({ subject: 'feat!: drop x' }).bump, 'major');
    assert.equal(classifyCommit({ subject: 'refactor(a)!: drop x' }).bump, 'major');
    assert.equal(
      classifyCommit({ subject: 'fix: x', body: 'BREAKING CHANGE: removed y' }).bump,
      'major',
    );
  });

  test('a non conventional commit counts as patch and is flagged', () => {
    assert.deepEqual(classifyCommit({ subject: 'Remove commom (#9)' }), {
      bump: 'patch',
      conventional: false,
    });
    assert.deepEqual(classifyCommit({ subject: 'feature: unknown type' }), {
      bump: 'patch',
      conventional: false,
    });
    assert.equal(classifyCommit({ subject: 'fe' }).conventional, false);
  });
});

describe('compareVersions', () => {
  test('orders by base, then stable above its prereleases, then prerelease number', () => {
    const sorted = ['1.0.0', '1.0.0-alpha.10', '0.9.9', '1.0.0-alpha.2', '1.1.0-alpha.1'].sort(
      compareVersions,
    );
    assert.deepEqual(sorted, [
      '0.9.9',
      '1.0.0-alpha.2',
      '1.0.0-alpha.10',
      '1.0.0',
      '1.1.0-alpha.1',
    ]);
  });

  test('rejects anything that is not X.Y.Z or X.Y.Z-id.N', () => {
    assert.throws(() => compareVersions('1.0', '1.0.0'), /Invalid version/);
    assert.throws(() => compareVersions('1.0.0-alpha', '1.0.0'), /Invalid version/);
  });
});

describe('nextVersion on main (alpha)', () => {
  test('first release is 1.0.0-alpha.1', () => {
    assert.equal(
      nextVersion({ current: null, lastStable: null, bump: 'minor', channel: MAIN }),
      '1.0.0-alpha.1',
    );
  });

  test('an open alpha keeps its base and increments the number', () => {
    for (const bump of ['patch', 'minor', 'major']) {
      assert.equal(
        nextVersion({ current: '1.0.0-alpha.3', lastStable: null, bump, channel: MAIN }),
        '1.0.0-alpha.4',
      );
    }
  });

  test('after a stable release a new alpha line starts from the bumped stable', () => {
    assert.equal(
      nextVersion({ current: '1.2.0', lastStable: '1.2.0', bump: 'patch', channel: MAIN }),
      '1.2.1-alpha.1',
    );
    assert.equal(
      nextVersion({ current: '1.2.0', lastStable: '1.2.0', bump: 'minor', channel: MAIN }),
      '1.3.0-alpha.1',
    );
  });

  test('an open alpha too small for the bump starts a new line', () => {
    assert.equal(
      nextVersion({ current: '1.2.1-alpha.2', lastStable: '1.2.0', bump: 'minor', channel: MAIN }),
      '1.3.0-alpha.1',
    );
    assert.equal(
      nextVersion({ current: '1.3.0-alpha.2', lastStable: '1.2.0', bump: 'patch', channel: MAIN }),
      '1.3.0-alpha.3',
    );
  });
});

describe('nextVersion on release (stable)', () => {
  test('first release without alphas is 1.0.0', () => {
    assert.equal(
      nextVersion({ current: null, lastStable: null, bump: 'patch', channel: RELEASE }),
      '1.0.0',
    );
  });

  test('the first stable promotes the open alpha', () => {
    assert.equal(
      nextVersion({ current: '1.0.0-alpha.4', lastStable: null, bump: 'minor', channel: RELEASE }),
      '1.0.0',
    );
  });

  test('later stables increment the last stable, promoting an alpha that covers the bump', () => {
    assert.equal(
      nextVersion({ current: '1.2.0', lastStable: '1.2.0', bump: 'minor', channel: RELEASE }),
      '1.3.0',
    );
    assert.equal(
      nextVersion({
        current: '2.0.0-alpha.3',
        lastStable: '1.2.0',
        bump: 'minor',
        channel: RELEASE,
      }),
      '2.0.0',
    );
    assert.equal(
      nextVersion({
        current: '1.2.1-alpha.1',
        lastStable: '1.2.0',
        bump: 'major',
        channel: RELEASE,
      }),
      '2.0.0',
    );
  });
});

describe('buildPlan', () => {
  test('only packages with releasing commits get a new version', () => {
    const { byName } = plan({
      packages: [pkg('a'), pkg('b')],
      published: { a: { main: '1.0.0-alpha.1' }, b: { main: '1.0.0-alpha.1' } },
      commits: { a: ['fix: x'], b: ['chore: y', 'docs: z'] },
    });
    assert.equal(byName.a.next, '1.0.0-alpha.2');
    assert.deepEqual(byName.a.reasons, ['commits (patch)']);
    assert.equal(byName.b.next, null);
    assert.equal(byName.b.commits.length, 2);
  });

  test('a released dependency cascades a patch to its dependents, transitively', () => {
    const { result, byName } = plan({
      packages: [
        pkg(APP, { [MID]: '0.0.0-development' }),
        pkg(MID, { [BASE]: '0.0.0-development' }),
        pkg(BASE),
      ],
      published: {
        [APP]: { main: '1.0.0-alpha.1' },
        [MID]: { main: '1.0.0-alpha.1' },
        [BASE]: { main: '1.0.0-alpha.1' },
      },
      commits: { [BASE]: ['feat: x'] },
    });
    assert.deepEqual(
      result.packages.map((p) => p.name),
      [BASE, MID, APP],
    );
    assert.equal(byName[MID].next, '1.0.0-alpha.2');
    assert.deepEqual(byName[MID].reasons, [`cascade: ${BASE} → 1.0.0-alpha.2`]);
    assert.deepEqual(byName[MID].dependencies, { [BASE]: '1.0.0-alpha.2' });
    assert.equal(byName[APP].next, '1.0.0-alpha.2');
    assert.deepEqual(byName[APP].dependencies, { [MID]: '1.0.0-alpha.2' });
    assert.deepEqual(result.errors, []);
  });

  test('a dependent that releases on its own pins unchanged dependencies to their current version', () => {
    const { byName } = plan({
      packages: [pkg(APP, { [BASE]: '0.0.0-development' }), pkg(BASE)],
      published: { [APP]: { main: '1.0.0-alpha.1' }, [BASE]: { main: '1.0.0-alpha.5' } },
      commits: { [APP]: ['feat: x'] },
    });
    assert.equal(byName[BASE].next, null);
    assert.deepEqual(byName[APP].dependencies, { [BASE]: '1.0.0-alpha.5' });
  });

  test('a dependency published after the dependent was cascades even if it is not in this plan', () => {
    const state = pinnedState('1.0.0-alpha.2');
    const result = buildPlan({
      branch: 'main',
      packages: [pkg(APP, { [BASE]: '0.0.0-development' }), pkg(BASE)],
      state,
      readCommits: () => [],
    });
    const app = result.packages.find((p) => p.name === APP);
    assert.equal(app.next, '1.0.0-alpha.2');
    assert.deepEqual(app.reasons, [
      `cascade: ${BASE} is at 1.0.0-alpha.3 and the published version pins 1.0.0-alpha.2`,
    ]);
    assert.deepEqual(app.dependencies, { [BASE]: '1.0.0-alpha.3' });
  });

  test('a dependent already pinned to the current dependency does not release', () => {
    const state = pinnedState('1.0.0-alpha.3');
    const result = buildPlan({
      branch: 'main',
      packages: [pkg(APP, { [BASE]: '0.0.0-development' }), pkg(BASE)],
      state,
      readCommits: () => [],
    });
    assert.equal(result.packages.find((p) => p.name === APP).next, null);
  });

  test('without deploys the whole set is released at the next major, aligned', () => {
    const calls = [];
    const result = buildPlan({
      branch: 'main',
      packages: [pkg(APP, { [BASE]: '0.0.0-development' }), pkg(BASE), pkg(MID)],
      state: {
        packages: { [BASE]: { main: '1.0.0-alpha.3' }, [APP]: { main: '1.0.0-alpha.1' } },
        deploys: [],
      },
      readCommits: (item) => {
        calls.push(item.name);
        return [];
      },
    });
    assert.deepEqual(
      result.packages.map((p) => [p.name, p.current, p.next, p.bump]),
      [
        [BASE, '1.0.0-alpha.3', '2.0.0-alpha.1', 'major'],
        [APP, '1.0.0-alpha.1', '2.0.0-alpha.1', 'major'],
        [MID, null, '2.0.0-alpha.1', 'major'],
      ],
    );
    assert.deepEqual(result.packages[1].reasons, [
      'breaking: releases.json without deploys, new major for the whole set (2.0.0-alpha.1)',
    ]);
    assert.deepEqual(result.packages[1].dependencies, { [BASE]: '2.0.0-alpha.1' });
    assert.deepEqual(calls, []);
    assert.deepEqual(result.errors, []);
  });

  test('a reset cut half way is finished by the next run for the packages no deploy records', () => {
    const result = buildPlan({
      branch: 'main',
      packages: [pkg(APP, { [BASE]: '0.0.0-development' }), pkg(BASE), pkg(MID)],
      state: {
        packages: { [BASE]: { main: '2.0.0-alpha.1' }, [APP]: { main: '1.0.0-alpha.1' } },
        deploys: [
          {
            date: '2026-10-12T00:00:00Z',
            commit: 'reset',
            channel: 'main',
            reset: '2.0.0-alpha.1',
            packages: [{ name: BASE, previous: '1.0.0-alpha.1', version: '2.0.0-alpha.1' }],
          },
        ],
      },
      readCommits: () => [],
    });
    assert.deepEqual(
      result.packages.map((p) => [p.name, p.next, p.reasons]),
      [
        [BASE, null, []],
        [APP, '2.0.0-alpha.1', ['completes the reset of the whole set (2.0.0-alpha.1)']],
        [MID, '2.0.0-alpha.1', ['completes the reset of the whole set (2.0.0-alpha.1)']],
      ],
    );
    assert.deepEqual(result.packages[1].dependencies, { [BASE]: '2.0.0-alpha.1' });
    assert.equal(result.reset, '2.0.0-alpha.1');
  });

  test('the reset takes the highest major of any channel and is stable on release', () => {
    const result = buildPlan({
      branch: 'release',
      packages: [pkg(BASE)],
      state: { packages: { [BASE]: { release: '3.1.0', main: '3.2.0-alpha.1' } }, deploys: [] },
      readCommits: () => [],
    });
    assert.equal(result.packages[0].next, '4.0.0');
  });

  test('an empty releases.json starts every package at 1.0.0', () => {
    const result = buildPlan({
      branch: 'main',
      packages: [pkg(BASE)],
      state: { packages: {}, deploys: [] },
      readCommits: () => [],
    });
    assert.equal(result.packages[0].next, '1.0.0-alpha.1');
  });

  test('peer dependencies cascade too, dev dependencies do not', () => {
    const { byName } = plan({
      packages: [
        pkg(PEER_USER, {}, { peerDependencies: { [BASE]: '0.0.0-development' } }),
        pkg(DEV_USER, {}, { devDependencies: { [BASE]: '0.0.0-development' } }),
        pkg(BASE),
      ],
      published: {
        [PEER_USER]: { release: '1.0.0' },
        [DEV_USER]: { release: '1.0.0' },
        [BASE]: { release: '1.0.0' },
      },
      commits: { [BASE]: ['fix: x'] },
    });
    assert.equal(byName[PEER_USER].next, '1.0.1-alpha.1');
    assert.equal(byName[DEV_USER].next, null);
  });

  test('non conventional commits produce a patch and a warning', () => {
    const { byName } = plan({
      packages: [pkg('a')],
      published: { a: { main: '1.0.0-alpha.1' } },
      commits: { a: ['Remove commom (#9)'] },
    });
    assert.equal(byName.a.next, '1.0.0-alpha.2');
    assert.deepEqual(byName.a.warnings, [
      'non conventional commit counts as patch: Remove commom (#9)',
    ]);
  });

  test('commits are read since the newest publication on main and the last stable on release', () => {
    const published = { a: { release: '1.0.0', main: '1.1.0-alpha.10' } };
    assert.deepEqual(plan({ packages: [pkg('a')], published }).calls, [['a', 'a@1.1.0-alpha.10']]);
    assert.deepEqual(plan({ branch: 'release', packages: [pkg('a')], published }).calls, [
      ['a', 'a@1.0.0'],
    ]);
    assert.deepEqual(plan({ packages: [pkg('a')] }).calls, [['a', null]]);
  });

  test('records the commit each package starts from', () => {
    const { byName } = plan({ packages: [pkg('a')], published: { a: { main: '1.0.0-alpha.1' } } });
    assert.equal(byName.a.baseCommit, 'a@1.0.0-alpha.1');
  });

  test('reports a dependency that is not a monorepo package', () => {
    const { result } = plan({
      packages: [pkg('a', { '@archi-code/ghost': '0.0.0-development' })],
      commits: { a: ['fix: x'] },
    });
    assert.deepEqual(result.errors, [
      'a depends on @archi-code/ghost, which is not a package of the monorepo',
    ]);
  });

  test('ignores dependencies outside the scope', () => {
    const { byName } = plan({
      packages: [pkg('@archi-code/a', { uuid: '^9.0.0' })],
      commits: { '@archi-code/a': ['fix: x'] },
    });
    assert.deepEqual(byName['@archi-code/a'].dependencies, {});
  });

  test('reports a computed version that does not move forward', () => {
    const { result } = plan({
      branch: 'main',
      packages: [pkg('a')],
      published: { a: { main: '2.0.0-beta.1' } },
      commits: { a: ['fix: x'] },
    });
    assert.deepEqual(result.errors, [
      'a: the computed version 0.0.1-alpha.1 is not greater than 2.0.0-beta.1',
    ]);
  });

  test('a malformed published version aborts the plan when it has to bump', () => {
    assert.throws(
      () =>
        plan({
          packages: [pkg('a')],
          published: { a: { main: 'v1' } },
          commits: { a: ['fix: x'] },
        }),
      /Invalid version: "v1"/,
    );
  });

  test('carries the channel of the branch', () => {
    const { result } = plan({ branch: 'release', packages: [] });
    assert.deepEqual(
      { branch: result.branch, distTags: result.distTags, prerelease: result.prerelease },
      { branch: 'release', distTags: ['latest'], prerelease: null },
    );
  });
});
