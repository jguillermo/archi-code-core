'use strict';

const { execFileSync, spawnSync } = require('child_process');

const FIELD = '\x1f';
const RECORD = '\x1e';

function git(root, args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}

function currentBranch(root) {
  const branch = git(root, ['rev-parse', '--abbrev-ref', 'HEAD']);
  return branch === 'HEAD' && process.env.GITHUB_REF_NAME ? process.env.GITHUB_REF_NAME : branch;
}

function headCommit(root) {
  return git(root, ['rev-parse', 'HEAD']);
}

function isAncestorOfHead(root, commit) {
  return (
    spawnSync('git', ['merge-base', '--is-ancestor', commit, 'HEAD'], { cwd: root }).status === 0
  );
}

function commitsSince(root, pkg, commit) {
  const range = commit ? `${commit}..HEAD` : 'HEAD';
  const log = git(root, [
    'log',
    '--no-merges',
    `--format=%H${FIELD}%s${FIELD}%b${RECORD}`,
    range,
    '--',
    pkg.dir,
  ]);
  return log
    .split(RECORD)
    .map((record) => record.trim())
    .filter(Boolean)
    .map((record) => {
      const [hash, subject, body = ''] = record.split(FIELD);
      return { hash: hash.slice(0, 7), subject, body };
    });
}

module.exports = { commitsSince, currentBranch, headCommit, isAncestorOfHead };
