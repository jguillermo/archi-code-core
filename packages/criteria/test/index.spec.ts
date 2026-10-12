import { describe, expect, it } from '@jest/globals';
import * as api from '../src/index';

const PUBLIC_API = [
  'CompositeFilterDto',
  'FilterOperator',
  'MongoCriteriaConverter',
  'SearchCriteriaDto',
  'SearchGroupByDto',
  'SearchOrderDto',
  'SearchPaginatorDto',
  'SearchQuerySerializer',
  'SimpleFilterDto',
];

describe('@archi-code/criteria', () => {
  it('exports exactly the public API', () => {
    expect(Object.keys(api).sort()).toEqual(PUBLIC_API);
  });
});
