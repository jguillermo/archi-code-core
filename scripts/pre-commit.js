#!/usr/bin/env node
'use strict';

const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');

const PRETTIER_FILES = [
  /^packages\/[^/]+\/(src|test)\/.*\.(js|jsx|ts|tsx|json|css|scss|md)$/,
  /^packages\/[^/]+\/[^/]+\.(json|md)$/,
  /^packages\/[^/]+\/(benchmark|docs)\/.*\.(ts|json|md)$/,
  /^scripts\/.*\.js$/,
  /^[^/]+\.md$/,
  /^\.claude\/.*\.md$/,
];

const ESLINT_FILES = [/^packages\/[^/]+\/(src|test|benchmark)\/.*\.ts$/];

function matching(files, patterns) {
  return files.filter((file) => patterns.some((pattern) => pattern.test(file)));
}

function filesToCheck(stagedFiles) {
  return {
    prettier: matching(stagedFiles, PRETTIER_FILES),
    eslint: matching(stagedFiles, ESLINT_FILES),
  };
}

function stagedFiles() {
  return execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z'], {
    cwd: ROOT,
    encoding: 'utf8',
  })
    .split('\0')
    .filter(Boolean);
}

function run(bin, args) {
  const result = spawnSync(path.join(ROOT, 'node_modules', '.bin', bin), args, {
    cwd: ROOT,
    stdio: 'inherit',
  });
  if (result.error) {
    console.error(`pre-commit: ${bin}: ${result.error.message}`);
    return false;
  }
  return result.status === 0;
}

if (require.main === module) {
  const { prettier, eslint } = filesToCheck(stagedFiles());
  const prettierOk = prettier.length === 0 || run('prettier', ['--check', ...prettier]);
  const eslintOk = eslint.length === 0 || run('eslint', eslint);
  if (!prettierOk || !eslintOk) {
    console.error('pre-commit: corrige con `npm run fix` y vuelve a añadir los archivos');
    process.exit(1);
  }
}

module.exports = { filesToCheck };
