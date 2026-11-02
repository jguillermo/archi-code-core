import { describe, expect, it } from 'vitest';
import * as shared from '../../src/shared/index';

describe('shared: the internal module every layer uses', () => {
  it('exports exactly what the layers share', () => {
    expect(Object.keys(shared).sort()).toEqual([
      'AbstractException',
      'Criteria',
      'CriteriaError',
      'DEFAULT_CRITERIA_LIMITS',
      'ExceptionBrand',
      'IssueCollectionError',
      'IssueCollector',
      'ReceivedValue',
      'ValueObjectBrand',
      'compareText',
      'compareValues',
      'defineCriteriaSchema',
      'isDate',
      'mapField',
      'valuesEqual',
      'visitFilter',
    ]);
  });
});
