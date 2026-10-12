import { describe, expect, it } from '@jest/globals';
import * as api from '../src/index';

const PUBLIC_API = ['DtoObjectMother', 'JsonCompare'];

describe('@archi-code/test', () => {
  it('exports exactly the public API', () => {
    expect(Object.keys(api).sort()).toEqual(PUBLIC_API);
  });
});
