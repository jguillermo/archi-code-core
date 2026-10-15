import { describe, expect, it } from '@jest/globals';
import * as api from '../src/index';

const PUBLIC_API = [
  'Criteria',
  'CriteriaError',
  'DEFAULT_CRITERIA_LIMITS',
  'compareText',
  'compareValues',
  'defineCriteriaSchema',
  'isDate',
  'mapField',
  'valuesEqual',
  'visitFilter',
];

describe('@archi-code/criteria', () => {
  it('exports exactly the public API', () => {
    expect(Object.keys(api).sort()).toEqual(PUBLIC_API);
  });

  it('exposes a value for every export', () => {
    for (const name of PUBLIC_API) {
      expect(api[name as keyof typeof api]).toBeDefined();
    }
  });
});
