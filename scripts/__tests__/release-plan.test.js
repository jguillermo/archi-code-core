'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  CHANNELS,
  buildPlan,
  channelFor,
  classifyCommit,
  compareVersions,
  nextVersion,
} = require('../lib/release-plan');

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

function plan({ branch = 'main', packages, versions = {}, commits = {} }) {
  const calls = [];
  const result = buildPlan({
    branch,
    packages,
    versionsByPackage: versions,
    readCommits: (item, since) => {
      calls.push([item.name, since]);
      return (commits[item.name] ?? []).map((subject, index) => ({ hash: `h${index}`, subject }));
    },
  });
  return { result, calls, byName: Object.fromEntries(result.packages.map((p) => [p.name, p])) };
}

describe('channelFor', () => {
  test('main publishes alpha prereleases under the main dist-tag', () => {
    assert.deepEqual(channelFor('main'), { branch: 'main', prerelease: 'alpha', distTag: 'main' });
  });

  test('release publishes stable versions under latest', () => {
    assert.deepEqual(channelFor('release'), {
      branch: 'release',
      prerelease: null,
      distTag: 'latest',
    });
  });

  test('any other branch is rejected', () => {
    assert.throws(() => channelFor('feature/x'), /no publica/);
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
    assert.throws(() => compareVersions('1.0', '1.0.0'), /Versión no válida/);
    assert.throws(() => compareVersions('1.0.0-alpha', '1.0.0'), /Versión no válida/);
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
      versions: { a: ['1.0.0-alpha.1'], b: ['1.0.0-alpha.1'] },
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
      versions: { [APP]: ['1.0.0-alpha.1'], [MID]: ['1.0.0-alpha.1'], [BASE]: ['1.0.0-alpha.1'] },
      commits: { [BASE]: ['feat: x'] },
    });
    assert.deepEqual(
      result.packages.map((p) => p.name),
      [BASE, MID, APP],
    );
    assert.equal(byName[MID].next, '1.0.0-alpha.2');
    assert.deepEqual(byName[MID].reasons, [`cascada: ${BASE} → 1.0.0-alpha.2`]);
    assert.deepEqual(byName[MID].dependencies, { [BASE]: '1.0.0-alpha.2' });
    assert.equal(byName[APP].next, '1.0.0-alpha.2');
    assert.deepEqual(byName[APP].dependencies, { [MID]: '1.0.0-alpha.2' });
    assert.deepEqual(result.errors, []);
  });

  test('a dependent that releases on its own pins unchanged dependencies to their current version', () => {
    const { byName } = plan({
      packages: [pkg(APP, { [BASE]: '0.0.0-development' }), pkg(BASE)],
      versions: { [APP]: ['1.0.0-alpha.1'], [BASE]: ['1.0.0-alpha.5'] },
      commits: { [APP]: ['feat: x'] },
    });
    assert.equal(byName[BASE].next, null);
    assert.deepEqual(byName[APP].dependencies, { [BASE]: '1.0.0-alpha.5' });
  });

  test('peer dependencies cascade too, dev dependencies do not', () => {
    const { byName } = plan({
      packages: [
        pkg(PEER_USER, {}, { peerDependencies: { [BASE]: '0.0.0-development' } }),
        pkg(DEV_USER, {}, { devDependencies: { [BASE]: '0.0.0-development' } }),
        pkg(BASE),
      ],
      versions: { [PEER_USER]: ['1.0.0'], [DEV_USER]: ['1.0.0'], [BASE]: ['1.0.0'] },
      commits: { [BASE]: ['fix: x'] },
    });
    assert.equal(byName[PEER_USER].next, '1.0.1-alpha.1');
    assert.equal(byName[DEV_USER].next, null);
  });

  test('non conventional commits produce a patch and a warning', () => {
    const { byName } = plan({
      packages: [pkg('a')],
      versions: { a: ['1.0.0-alpha.1'] },
      commits: { a: ['Remove commom (#9)'] },
    });
    assert.equal(byName.a.next, '1.0.0-alpha.2');
    assert.deepEqual(byName.a.warnings, [
      'commit no convencional cuenta como patch: Remove commom (#9)',
    ]);
  });

  test('commits are read since the highest tag on main and since the last stable on release', () => {
    const versions = { a: ['1.0.0', '1.1.0-alpha.2', '1.1.0-alpha.10'] };
    assert.deepEqual(plan({ packages: [pkg('a')], versions }).calls, [['a', '1.1.0-alpha.10']]);
    assert.deepEqual(plan({ branch: 'release', packages: [pkg('a')], versions }).calls, [
      ['a', '1.0.0'],
    ]);
    assert.deepEqual(plan({ packages: [pkg('a')] }).calls, [['a', null]]);
  });

  test('reports a dependency that is not a monorepo package', () => {
    const { result } = plan({
      packages: [pkg('a', { '@archi-code/ghost': '0.0.0-development' })],
      commits: { a: ['fix: x'] },
    });
    assert.deepEqual(result.errors, [
      'a depende de @archi-code/ghost, que no es un paquete del monorepo',
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
      versions: { a: ['2.0.0-beta.1'] },
      commits: { a: ['fix: x'] },
    });
    assert.deepEqual(result.errors, [
      'a: la versión calculada 0.0.1-alpha.1 no es mayor que 2.0.0-beta.1',
    ]);
  });

  test('a malformed version tag aborts the plan', () => {
    assert.throws(
      () => plan({ packages: [pkg('a')], versions: { a: ['v1'] } }),
      /Versión no válida: "v1"/,
    );
  });

  test('carries the channel of the branch', () => {
    const { result } = plan({ branch: 'release', packages: [] });
    assert.deepEqual(
      { branch: result.branch, distTag: result.distTag, prerelease: result.prerelease },
      { branch: 'release', distTag: 'latest', prerelease: null },
    );
  });
});
