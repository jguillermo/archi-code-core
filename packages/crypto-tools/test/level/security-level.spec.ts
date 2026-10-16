import { describe, expect, it } from 'vitest';
import { SECURITY_LEVEL_NAMES } from '../../src/level/security-level';

describe('SECURITY_LEVEL_NAMES', () => {
  it('lists the levels and the military alias', () => {
    expect(SECURITY_LEVEL_NAMES).toEqual(['basic', 'standard', 'strong', 'cnsa', 'military']);
  });
});
