import { describe, expect, it } from '@jest/globals';
import { toBeInteger, ConvertError } from '../../convert';

describe('ConvertError', () => {
  it('is an instance of Error', () => expect(new ConvertError('x')).toBeInstanceOf(Error));
  it('has name "ConvertError"', () => expect(new ConvertError('x').name).toBe('ConvertError'));
  it('message includes the invalid value', () => {
    const err = (() => {
      try {
        toBeInteger('abc');
      } catch (e) {
        return e;
      }
    })();
    expect(err).toBeInstanceOf(ConvertError);
    expect((err as ConvertError).message).toContain('abc');
  });
});
