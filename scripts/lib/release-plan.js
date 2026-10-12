'use strict';

const { topoSort } = require('./topo-sort');

const DEV_VERSION = '0.0.0-development';
const SCOPE = '@archi-code/';

const CHANNELS = {
  main: { branch: 'main', prerelease: 'alpha', distTag: 'main' },
  release: { branch: 'release', prerelease: null, distTag: 'latest' },
};

const BUMP_RANK = { patch: 1, minor: 2, major: 3 };
const RELEASE_TYPES = { feat: 'minor', fix: 'patch', perf: 'patch' };
const NO_RELEASE_TYPES = new Set([
  'chore',
  'docs',
  'test',
  'style',
  'ci',
  'build',
  'refactor',
  'revert',
]);
const HEADER_RE = /^([a-z]+)(\([^)]*\))?(!)?: \S/;
const VERSION_RE = /^(\d+)\.(\d+)\.(\d+)(?:-([a-z]+)\.(\d+))?$/;

function channelFor(branch) {
  const channel = CHANNELS[branch];
  if (!channel) {
    throw new Error(`Rama "${branch}" no publica: solo ${Object.keys(CHANNELS).join(' y ')}`);
  }
  return channel;
}

function parseVersion(text) {
  const match = VERSION_RE.exec(text);
  if (!match) throw new Error(`Versión no válida: "${text}"`);
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    pre: match[4] ?? null,
    preNumber: match[5] === undefined ? null : Number(match[5]),
  };
}

function formatVersion({ major, minor, patch, pre, preNumber }) {
  const base = `${major}.${minor}.${patch}`;
  return pre ? `${base}-${pre}.${preNumber}` : base;
}

function compareBase(a, b) {
  return a.major - b.major || a.minor - b.minor || a.patch - b.patch;
}

function compareVersions(left, right) {
  const a = parseVersion(left);
  const b = parseVersion(right);
  const byBase = compareBase(a, b);
  if (byBase !== 0) return byBase;
  if (!a.pre && !b.pre) return 0;
  if (!a.pre) return 1;
  if (!b.pre) return -1;
  if (a.pre !== b.pre) return a.pre < b.pre ? -1 : 1;
  return a.preNumber - b.preNumber;
}

function highest(versions) {
  return versions.length ? [...versions].sort(compareVersions).at(-1) : null;
}

function increment(version, bump) {
  const { major, minor, patch } = version ?? { major: 0, minor: 0, patch: 0 };
  if (bump === 'major') return { major: major + 1, minor: 0, patch: 0 };
  if (bump === 'minor') return { major, minor: minor + 1, patch: 0 };
  return { major, minor, patch: patch + 1 };
}

function higherBump(a, b) {
  if (!a) return b;
  if (!b) return a;
  return BUMP_RANK[a] >= BUMP_RANK[b] ? a : b;
}

function classifyCommit({ subject, body = '' }) {
  const match = HEADER_RE.exec(subject);
  const breaking = /BREAKING[ -]CHANGE/.test(`${subject}\n${body}`);
  if (!match || (!RELEASE_TYPES[match[1]] && !NO_RELEASE_TYPES.has(match[1]))) {
    return { bump: breaking ? 'major' : 'patch', conventional: false };
  }
  if (breaking || match[3]) return { bump: 'major', conventional: true };
  return { bump: RELEASE_TYPES[match[1]] ?? null, conventional: true };
}

function releasedVersions(versions) {
  versions.forEach(parseVersion);
  return {
    current: highest(versions),
    lastStable: highest(versions.filter((version) => !parseVersion(version).pre)),
  };
}

function baseVersionFor(versions, channel) {
  const { current, lastStable } = releasedVersions(versions);
  return channel.prerelease ? current : lastStable;
}

function nextVersion({ current, lastStable, bump, channel }) {
  const stable = lastStable ? parseVersion(lastStable) : null;
  const latest = current ? parseVersion(current) : null;
  const floor = increment(stable, bump);
  const pendingBase = latest?.pre && (!stable || compareBase(latest, stable) > 0) ? latest : null;

  if (!channel.prerelease) {
    if (!stable && !pendingBase) return '1.0.0';
    if (pendingBase && compareBase(pendingBase, floor) >= 0) {
      return formatVersion({ ...pendingBase, pre: null });
    }
    return formatVersion({ ...floor, pre: null });
  }

  if (!latest) return formatVersion({ major: 1, minor: 0, patch: 0, ...prerelease(channel, 1) });
  if (
    pendingBase &&
    pendingBase.pre === channel.prerelease &&
    compareBase(pendingBase, floor) >= 0
  ) {
    return formatVersion({ ...pendingBase, preNumber: pendingBase.preNumber + 1 });
  }
  return formatVersion({ ...floor, ...prerelease(channel, 1) });
}

function prerelease(channel, preNumber) {
  return { pre: channel.prerelease, preNumber };
}

function runtimeInternalDeps(packageJson) {
  return Object.keys({ ...packageJson.dependencies, ...packageJson.peerDependencies }).filter(
    (name) => name.startsWith(SCOPE),
  );
}

function buildPlan({ branch, packages, versionsByPackage, readCommits }) {
  const channel = channelFor(branch);
  const errors = [];
  const known = new Set(packages.map((pkg) => pkg.name));
  const ordered = topoSort(
    packages.map((pkg) => ({ ...pkg, internalDeps: runtimeInternalDeps(pkg.packageJson) })),
  );
  const byName = {};

  for (const pkg of ordered) {
    const versions = versionsByPackage[pkg.name] ?? [];
    const { current, lastStable } = releasedVersions(versions);
    const baseVersion = baseVersionFor(versions, channel);
    const commits = readCommits(pkg, baseVersion).map((commit) => ({
      ...commit,
      ...classifyCommit(commit),
    }));
    const warnings = commits
      .filter((commit) => !commit.conventional)
      .map((commit) => `commit no convencional cuenta como ${commit.bump}: ${commit.subject}`);
    const reasons = [];
    let bump = commits.reduce((acc, commit) => higherBump(acc, commit.bump), null);
    if (bump) reasons.push(`commits (${bump})`);

    for (const dep of pkg.internalDeps) {
      if (!known.has(dep)) {
        errors.push(`${pkg.name} depende de ${dep}, que no es un paquete del monorepo`);
        continue;
      }
      if (byName[dep].next) {
        bump = higherBump(bump, 'patch');
        reasons.push(`cascada: ${dep} → ${byName[dep].next}`);
      }
    }

    const next = bump ? nextVersion({ current, lastStable, bump, channel }) : null;
    if (next && current && compareVersions(next, current) <= 0) {
      errors.push(`${pkg.name}: la versión calculada ${next} no es mayor que ${current}`);
    }
    const dependencies = {};
    for (const dep of pkg.internalDeps.filter((name) => byName[name])) {
      const version = byName[dep].next ?? byName[dep].current;
      if (!version && next) errors.push(`${pkg.name} sale pero ${dep} no tiene versión publicada`);
      dependencies[dep] = version;
    }

    byName[pkg.name] = {
      name: pkg.name,
      dir: pkg.dir,
      current,
      next,
      bump,
      reasons,
      dependencies,
      commits: commits.map(({ hash, subject, bump: commitBump, conventional }) => ({
        hash,
        subject,
        bump: commitBump,
        conventional,
      })),
      warnings,
    };
  }

  return {
    branch: channel.branch,
    distTag: channel.distTag,
    prerelease: channel.prerelease,
    packages: ordered.map((pkg) => byName[pkg.name]),
    errors,
  };
}

module.exports = {
  CHANNELS,
  DEV_VERSION,
  SCOPE,
  baseVersionFor,
  buildPlan,
  channelFor,
  classifyCommit,
  compareVersions,
  nextVersion,
  parseVersion,
  runtimeInternalDeps,
};
