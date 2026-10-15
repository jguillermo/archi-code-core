import { describe, expect, it } from '@jest/globals';
import * as api from '../src/index';

const PUBLIC_API = ['planIndexedDbQuery', 'readIndexes', 'searchIndexedDb'];

describe('@archi-code/criteria-indexeddb', () => {
  it('exports exactly the public API', () => {
    expect(Object.keys(api).sort()).toEqual(PUBLIC_API);
  });

  it('exposes a function for every export', () => {
    for (const name of PUBLIC_API) {
      expect(typeof api[name as keyof typeof api]).toBe('function');
    }
  });
});
