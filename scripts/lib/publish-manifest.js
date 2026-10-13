'use strict';

const { SCOPE } = require('./release-plan');
const { parseVersion } = require('./versions');

const PUBLISHED_FIELDS = ['dependencies', 'peerDependencies'];

function publishManifest(packageJson, release, commit) {
  const manifest = { ...packageJson, version: release.next, releaseCommit: commit };
  for (const field of PUBLISHED_FIELDS) {
    if (!packageJson[field]) continue;
    manifest[field] = { ...packageJson[field] };
    for (const dep of Object.keys(manifest[field]).filter((name) => name.startsWith(SCOPE))) {
      const version = release.dependencies[dep];
      if (!version) throw new Error(`${release.name}: there is no exact version for ${dep}`);
      manifest[field][dep] = version;
    }
  }
  return manifest;
}

function isExactVersion(text) {
  try {
    parseVersion(text);
    return true;
  } catch {
    return false;
  }
}

function manifestErrors(manifest, release, commit) {
  const errors = [];
  if (manifest.name !== release.name) {
    errors.push(`name "${manifest.name}" instead of "${release.name}"`);
  }
  if (manifest.version !== release.next) {
    errors.push(`version "${manifest.version}" instead of "${release.next}"`);
  }
  if (manifest.releaseCommit !== commit) {
    errors.push(`releaseCommit "${manifest.releaseCommit}" instead of "${commit}"`);
  }
  for (const field of PUBLISHED_FIELDS) {
    for (const [dep, range] of Object.entries(manifest[field] ?? {})) {
      if (!dep.startsWith(SCOPE)) continue;
      if (!isExactVersion(range) || range !== release.dependencies[dep]) {
        errors.push(`${field}.${dep} "${range}" instead of "${release.dependencies[dep]}"`);
      }
    }
  }
  return errors;
}

module.exports = { manifestErrors, publishManifest };
