'use strict';

const { SCOPE, parseVersion } = require('./release-plan');

const PUBLISHED_FIELDS = ['dependencies', 'peerDependencies'];

function publishManifest(packageJson, release) {
  const manifest = { ...packageJson, version: release.next };
  for (const field of PUBLISHED_FIELDS) {
    if (!packageJson[field]) continue;
    manifest[field] = { ...packageJson[field] };
    for (const dep of Object.keys(manifest[field]).filter((name) => name.startsWith(SCOPE))) {
      const version = release.dependencies[dep];
      if (!version) throw new Error(`${release.name}: no hay versión exacta para ${dep}`);
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

function manifestErrors(manifest, release) {
  const errors = [];
  if (manifest.name !== release.name) {
    errors.push(`name "${manifest.name}" en vez de "${release.name}"`);
  }
  if (manifest.version !== release.next) {
    errors.push(`version "${manifest.version}" en vez de "${release.next}"`);
  }
  for (const field of PUBLISHED_FIELDS) {
    for (const [dep, range] of Object.entries(manifest[field] ?? {})) {
      if (!dep.startsWith(SCOPE)) continue;
      if (!isExactVersion(range) || range !== release.dependencies[dep]) {
        errors.push(`${field}.${dep} "${range}" en vez de "${release.dependencies[dep]}"`);
      }
    }
  }
  return errors;
}

module.exports = { manifestErrors, publishManifest };
