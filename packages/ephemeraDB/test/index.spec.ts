import { describe, expect, it } from '@jest/globals';
import * as api from '../src/index';

const PUBLIC_API = ['EphemeraDb'];

describe('@archi-code/ephemeradb', () => {
  it('exports exactly the public API', () => {
    expect(Object.keys(api).sort()).toEqual(PUBLIC_API);
  });
});
