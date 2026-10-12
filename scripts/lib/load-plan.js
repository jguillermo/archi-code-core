'use strict';

const { buildPlan } = require('./release-plan');
const { readWorkspacePackages } = require('./workspace-packages');
const { commitsSince, releasedVersionsFromTags } = require('./release-git');

function loadPlan(root, branch) {
  const packages = readWorkspacePackages(root);
  const plan = buildPlan({
    branch,
    packages,
    versionsByPackage: Object.fromEntries(
      packages.map((pkg) => [pkg.name, releasedVersionsFromTags(root, pkg.name)]),
    ),
    readCommits: (pkg, version) => commitsSince(root, pkg, version),
  });
  return { packages, plan };
}

module.exports = { loadPlan };
