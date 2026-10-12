'use strict';

const { topoSort } = require('./topo-sort');
const { channelFor, compareVersions, nextVersion, parseVersion } = require('./versions');
const { baselineFor } = require('./release-state');

const DEV_VERSION = '0.0.0-development';
const SCOPE = '@archi-code/';

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

function runtimeInternalDeps(packageJson) {
  return Object.keys({ ...packageJson.dependencies, ...packageJson.peerDependencies }).filter(
    (name) => name.startsWith(SCOPE),
  );
}

// An empty "deploys" in releases.json starts a new major for the whole set: every package is
// released at the major after the highest current one, aligned, whatever its commits say.
function resetVersion(state, channel) {
  const majors = Object.values(state.packages).flatMap((channels) =>
    Object.values(channels).map((version) => parseVersion(version).major),
  );
  const major = majors.length ? Math.max(...majors) + 1 : 1;
  return channel.prerelease ? `${major}.0.0-${channel.prerelease}.1` : `${major}.0.0`;
}

// A reset that stopped half way (some packages published, the run failed) is finished by the next
// runs: every package that no deploy records yet joins the reset version of that deploy.
function pendingReset(state, branch) {
  const deploy = [...state.deploys].reverse().find((item) => item.reset);
  return deploy && deploy.channel === branch ? deploy.reset : null;
}

function buildPlan({ branch, packages, state, readCommits }) {
  const channel = channelFor(branch);
  const fullReset = state.deploys.length === 0 ? resetVersion(state, channel) : null;
  const pending = fullReset ? null : pendingReset(state, branch);
  let resetUsed = fullReset;
  const errors = [];
  const known = new Set(packages.map((pkg) => pkg.name));
  const ordered = topoSort(
    packages.map((pkg) => ({ ...pkg, internalDeps: runtimeInternalDeps(pkg.packageJson) })),
  );
  const byName = {};

  for (const pkg of ordered) {
    const {
      current,
      lastStable,
      commit: baseCommit,
      dependencies: pinned,
    } = baselineFor(state, pkg.name, branch);
    const reset = fullReset ?? (pending && !baseCommit ? pending : null);
    if (reset) resetUsed = reset;
    const commits = (reset ? [] : readCommits(pkg, baseCommit)).map((commit) => ({
      ...commit,
      ...classifyCommit(commit),
    }));
    const warnings = commits
      .filter((commit) => !commit.conventional)
      .map((commit) => `commit no convencional cuenta como ${commit.bump}: ${commit.subject}`);
    const reasons = [];
    let bump = commits.reduce((acc, commit) => higherBump(acc, commit.bump), null);
    if (bump) reasons.push(`commits (${bump})`);
    if (reset) {
      bump = 'major';
      reasons.push(
        fullReset
          ? `breaking: releases.json sin deploys, nueva major del conjunto (${reset})`
          : `completa el reinicio del conjunto (${reset})`,
      );
    }

    for (const dep of pkg.internalDeps) {
      if (!known.has(dep)) {
        errors.push(`${pkg.name} depende de ${dep}, que no es un paquete del monorepo`);
        continue;
      }
      if (reset) continue;
      if (byName[dep].next) {
        bump = higherBump(bump, 'patch');
        reasons.push(`cascada: ${dep} → ${byName[dep].next}`);
      } else if (byName[dep].current && pinned?.[dep] !== byName[dep].current) {
        bump = higherBump(bump, 'patch');
        reasons.push(
          `cascada: ${dep} está en ${byName[dep].current} y la versión publicada fija ` +
            `${pinned?.[dep] ?? 'otra'}`,
        );
      }
    }

    const next = reset ?? (bump ? nextVersion({ current, lastStable, bump, channel }) : null);
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
      baseCommit,
      reset: Boolean(reset),
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
    distTags: channel.distTags,
    reset: resetUsed,
    prerelease: channel.prerelease,
    packages: ordered.map((pkg) => byName[pkg.name]),
    errors,
  };
}

module.exports = { DEV_VERSION, SCOPE, buildPlan, classifyCommit, runtimeInternalDeps };
