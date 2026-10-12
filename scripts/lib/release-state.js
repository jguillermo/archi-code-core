'use strict';

const fs = require('fs');
const path = require('path');
const { CHANNELS, compareVersions, parseVersion } = require('./versions');

const STATE_FILE = 'releases.json';
const COMMIT_RE = /^[0-9a-f]{40}$/;

function emptyState() {
  return { packages: {}, deploys: [] };
}

function readState(root) {
  const file = path.join(root, STATE_FILE);
  if (!fs.existsSync(file)) return emptyState();
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeState(root, state) {
  fs.writeFileSync(path.join(root, STATE_FILE), `${JSON.stringify(state, null, 2)}\n`);
}

function parseVersionSafe(text) {
  try {
    return parseVersion(text);
  } catch {
    return null;
  }
}

function findPublication(state, name, version) {
  for (let index = state.deploys.length - 1; index >= 0; index -= 1) {
    const deploy = state.deploys[index];
    const entry = (deploy.packages ?? []).find(
      (pkg) => pkg.name === name && pkg.version === version,
    );
    if (entry) {
      return { commit: entry.commit ?? deploy.commit, dependencies: entry.dependencies ?? null };
    }
  }
  return null;
}

function deployErrors(index, deploy) {
  const where = `deploys[${index}]`;
  const errors = [];
  if (!COMMIT_RE.test(deploy?.commit ?? '')) errors.push(`${where}: commit no válido`);
  if (Number.isNaN(Date.parse(deploy?.date))) errors.push(`${where}: fecha no válida`);
  if (!CHANNELS[deploy?.channel]) errors.push(`${where}: canal no válido "${deploy?.channel}"`);
  if (!Array.isArray(deploy?.packages) || !deploy.packages.length) {
    errors.push(`${where}: "packages" debe ser una lista no vacía`);
    return errors;
  }
  deploy.packages.forEach((pkg, position) => {
    if (!pkg?.name || !parseVersionSafe(pkg.version)) {
      errors.push(`${where}.packages[${position}]: necesita "name" y una "version" válida`);
    }
    if (pkg?.commit !== undefined && !COMMIT_RE.test(pkg.commit)) {
      errors.push(`${where}.packages[${position}]: commit no válido`);
    }
  });
  return errors;
}

function stateErrors(state) {
  if (!state || typeof state.packages !== 'object' || !Array.isArray(state.deploys)) {
    return [`${STATE_FILE} debe tener "packages" (objeto) y "deploys" (lista)`];
  }
  const errors = [];
  state.deploys.forEach((deploy, index) => errors.push(...deployErrors(index, deploy)));
  if (errors.length) return errors;
  for (const [name, channels] of Object.entries(state.packages)) {
    for (const [channel, version] of Object.entries(channels)) {
      const where = `${name} (${channel})`;
      if (!CHANNELS[channel]) {
        errors.push(`${name}: canal desconocido "${channel}"`);
        continue;
      }
      const parsed = parseVersionSafe(version);
      if (!parsed) {
        errors.push(`${where}: versión no válida "${version}"`);
        continue;
      }
      if (channel === 'main' && !parsed.pre) {
        errors.push(`${where}: ${version} debería ser una prerelease`);
      }
      if (channel === 'release' && parsed.pre)
        errors.push(`${where}: ${version} debería ser estable`);
      if (state.deploys.length && !findPublication(state, name, version)) {
        errors.push(`${where}: ningún deploy registra la publicación de ${version}`);
      }
    }
  }
  return errors;
}

function baselineFor(state, name, channel) {
  const published = state.packages[name] ?? {};
  const stable = published.release ?? null;
  const versions = [published.main, published.release].filter(Boolean);
  const newest = versions.sort(compareVersions).at(-1) ?? null;
  const base = CHANNELS[channel].prerelease ? newest : stable;
  const publication = base ? findPublication(state, name, base) : null;
  return {
    current: newest,
    lastStable: stable,
    commit: publication?.commit ?? null,
    dependencies: publication?.dependencies ?? null,
  };
}

function openDeploy(state, { date, commit, channel }) {
  return { ...state, deploys: [...state.deploys, { date, commit, channel, packages: [] }] };
}

function recordPublication(state, { channel, entry }) {
  const deploys = [...state.deploys];
  const current = deploys.at(-1);
  deploys[deploys.length - 1] = { ...current, packages: [...current.packages, entry] };
  return {
    packages: {
      ...state.packages,
      [entry.name]: { ...state.packages[entry.name], [channel]: entry.version },
    },
    deploys,
  };
}

function lastDeploy(state) {
  return state.deploys.at(-1) ?? null;
}

function commitsInState(state) {
  return [
    ...new Set(
      state.deploys.flatMap((deploy) => [
        deploy.commit,
        ...deploy.packages.map((pkg) => pkg.commit).filter(Boolean),
      ]),
    ),
  ];
}

module.exports = {
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
};
