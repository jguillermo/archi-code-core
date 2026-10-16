import { createRequire } from 'node:module';
import { describe, expect, test } from 'vitest';

const require = createRequire(import.meta.url);
const { filesToCheck } = require('../pre-commit');

describe('filesToCheck', () => {
  test('formats and lints package sources and specs', () => {
    const files = ['packages/domain/src/type/string-type.ts', 'packages/domain/test/index.spec.ts'];
    expect(filesToCheck(files)).toStrictEqual({ prettier: files, eslint: files });
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
    expect(filesToCheck(files)).toStrictEqual({ prettier: files, eslint: [] });
  });

  test('lints the validation benchmark', () => {
    const file = 'packages/validation/benchmark/run.ts';
    expect(filesToCheck([file])).toStrictEqual({ prettier: [file], eslint: [file] });
  });

  test('skips files the gate does not format', () => {
    const files = [
      'package-lock.json',
      'releases.json',
      '.github/workflows/ci.yml',
      '.nvmrc',
      'packages/domain/test/dist/dist.check.js.snap',
    ];
    expect(filesToCheck(files)).toStrictEqual({ prettier: [], eslint: [] });
  });
});
