'use strict';

const { execFileSync } = require('child_process');

const FIELD = '\x1f';
const RECORD = '\x1e';

function git(root, args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}

function tagPrefix(name) {
  return `${name}-v`;
}

function currentBranch(root) {
  const branch = git(root, ['rev-parse', '--abbrev-ref', 'HEAD']);
  return branch === 'HEAD' && process.env.GITHUB_REF_NAME ? process.env.GITHUB_REF_NAME : branch;
}

function releasedVersionsFromTags(root, name) {
  const prefix = tagPrefix(name);
  return git(root, ['tag', '--merged', 'HEAD', '--list', `${prefix}*`])
    .split('\n')
    .filter(Boolean)
    .map((tag) => tag.slice(prefix.length));
}

function commitsSince(root, pkg, version) {
  const range = version ? `${tagPrefix(pkg.name)}${version}..HEAD` : 'HEAD';
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

module.exports = { commitsSince, currentBranch, releasedVersionsFromTags, tagPrefix };
