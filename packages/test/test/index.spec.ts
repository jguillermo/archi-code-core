import { describe, expect, it } from '@jest/globals';
import * as api from '../src/index';
import { DtoObjectMother } from '../src/dto.object-mother';
import { JsonCompare } from '../src/json-compare';

const PUBLIC_API = ['DtoObjectMother', 'JsonCompare'];

describe('@archi-code/test', () => {
  it('exports exactly the public API', () => {
    expect(Object.keys(api).sort()).toEqual(PUBLIC_API);
  });

  it('exports the same classes the modules define', () => {
    expect(api.DtoObjectMother).toBe(DtoObjectMother);
    expect(api.JsonCompare).toBe(JsonCompare);
  });
});
