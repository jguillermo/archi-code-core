import { describe, expect, it } from '@jest/globals';
import * as api from '../src/index';

const PUBLIC_API = [
  'CRITERIA_CONTRACT_CASES',
  'Criteria',
  'CriteriaError',
  'compareValues',
  'contractDay',
  'createContractDocuments',
  'defineCriteriaSchema',
  'mapField',
  'runCriteriaContract',
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
