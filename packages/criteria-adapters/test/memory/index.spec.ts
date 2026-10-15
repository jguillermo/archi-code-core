import { describe, expect, it } from '@jest/globals';
import * as api from '../../src/memory/index';

const PUBLIC_API = ['compareBy', 'matches', 'matchesFilter', 'readPath', 'searchMemory'];

describe('@archi-code/criteria-adapters/memory', () => {
  it('exports exactly the public API', () => {
    expect(Object.keys(api).sort()).toEqual(PUBLIC_API);
  });

  it('exposes a function for every export', () => {
    for (const name of PUBLIC_API) {
      expect(typeof api[name as keyof typeof api]).toBe('function');
    }
  });
});
