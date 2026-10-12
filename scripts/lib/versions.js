'use strict';

const CHANNELS = {
  main: { branch: 'main', prerelease: 'alpha', distTags: ['latest', 'main'] },
  release: { branch: 'release', prerelease: null, distTags: ['latest'] },
};

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

function increment(version, bump) {
  const { major, minor, patch } = version ?? { major: 0, minor: 0, patch: 0 };
  if (bump === 'major') return { major: major + 1, minor: 0, patch: 0 };
  if (bump === 'minor') return { major, minor: minor + 1, patch: 0 };
  return { major, minor, patch: patch + 1 };
}

function prerelease(channel, preNumber) {
  return { pre: channel.prerelease, preNumber };
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

module.exports = { CHANNELS, channelFor, compareVersions, nextVersion, parseVersion };
