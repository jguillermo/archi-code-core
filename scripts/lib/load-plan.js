'use strict';

const { buildPlan } = require('./release-plan');
const { readWorkspacePackages } = require('./workspace-packages');
const { commitsSince, isAncestorOfHead } = require('./release-git');
const { STATE_FILE, commitsInState, readState, stateErrors } = require('./release-state');

function unreachableCommits(root, state) {
  return commitsInState(state)
    .filter((commit) => !isAncestorOfHead(root, commit))
    .map((commit) => `${STATE_FILE}: commit ${commit} is not in the history of HEAD`);
}

function loadPlan(root, branch, state = readState(root)) {
  const packages = readWorkspacePackages(root);
  const invalid = stateErrors(state);
  if (invalid.length) {
    return { packages, state, plan: null, errors: invalid };
  }
  const unreachable = unreachableCommits(root, state);
  if (unreachable.length) return { packages, state, plan: null, errors: unreachable };
  const plan = buildPlan({
    branch,
    packages,
    state,
    readCommits: (pkg, commit) => commitsSince(root, pkg, commit),
  });
  return { packages, state, plan, errors: plan.errors };
}

module.exports = { loadPlan };
