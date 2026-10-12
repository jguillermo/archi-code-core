'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { filesToCheck } = require('../pre-commit');

describe('filesToCheck', () => {
  test('formats and lints package sources and specs', () => {
    const files = ['packages/domain/src/type/string-type.ts', 'packages/domain/test/index.spec.ts'];
    assert.deepEqual(filesToCheck(files), { prettier: files, eslint: files });
  });

  test('formats the same files as the gate, outside packages too', () => {
    const files = [
      'packages/domain/package.json',
      'packages/domain/README.md',
      'packages/validation/docs/guide.md',
      'scripts/release.js',
      'CLAUDE.md',
      '.claude/rules/packages.md',
    ];
    assert.deepEqual(filesToCheck(files), { prettier: files, eslint: [] });
  });

  test('lints the validation benchmark', () => {
    const file = 'packages/validation/benchmark/run.ts';
    assert.deepEqual(filesToCheck([file]), { prettier: [file], eslint: [file] });
  });

  test('skips files the gate does not format', () => {
    const files = [
      'package-lock.json',
      'releases.json',
      '.github/workflows/ci.yml',
      '.nvmrc',
      'packages/domain/test/dist/dist.check.js.snap',
    ];
    assert.deepEqual(filesToCheck(files), { prettier: [], eslint: [] });
  });
});
