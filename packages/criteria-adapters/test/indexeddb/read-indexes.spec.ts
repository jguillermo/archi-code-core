import { describe, expect, it } from 'vitest';
import { readIndexes } from '../../src/indexeddb/read-indexes';
import { openDatabase, readStore } from '../support/open-store';

describe('readIndexes', () => {
  it('lists the store key path and every single-key-path index', async () => {
    const database = await openDatabase(
      { keyPath: 'id', indexes: [{ name: 'by-age', keyPath: 'age' }] },
      [],
    );
    expect(readIndexes(readStore(database))).toEqual([
      { name: null, keyPath: 'id' },
      { name: 'by-age', keyPath: 'age' },
    ]);
  });

  it('ignores compound and multi-entry indexes and key paths that are not a string', async () => {
    const database = await openDatabase(
      {
        keyPath: null,
        indexes: [
          { name: 'pair', keyPath: ['age', 'id'] },
          { name: 'tags', keyPath: 'tags', multiEntry: true },
          { name: 'age', keyPath: 'age' },
        ],
      },
      [],
    );
    expect(readIndexes(readStore(database))).toEqual([{ name: 'age', keyPath: 'age' }]);
  });
});
