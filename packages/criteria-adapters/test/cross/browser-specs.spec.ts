import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const BROWSER = path.resolve(__dirname, '../indexeddb/browser');

const FORBIDDEN: readonly (readonly [string, RegExp])[] = [
  ['an IndexedDB imitation', /fake-indexeddb/],
  ['the fake IndexedDB helpers of test/support', /['"][./]*support\//],
  ['a mock, spy or stub of vitest', /\bvi\.(mock|doMock|fn|spyOn|stubGlobal|stubEnv)\b/],
  ['vitest mocking imported by name', /import\s*\{[^}]*\bvi\b[^}]*\}\s*from\s*['"]vitest['"]/],
];

const files = fs
  .readdirSync(BROWSER)
  .filter((name) => name.endsWith('.ts'))
  .map((name) => [name, fs.readFileSync(path.join(BROWSER, name), 'utf8')] as const);

describe('test/indexeddb/browser: only a real browser, nothing mocked', () => {
  it('has the browser specs', () => {
    expect(files.map(([name]) => name)).toEqual(
      expect.arrayContaining(['indexed-db-contract.spec.ts', 'indexeddb-order-repository.spec.ts']),
    );
  });

  it.each(FORBIDDEN)('no file uses %s', (_what, pattern) => {
    expect(files.filter(([, source]) => pattern.test(source)).map(([name]) => name)).toEqual([]);
  });
});
