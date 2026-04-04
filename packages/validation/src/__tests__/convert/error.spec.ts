import { describe, expect, it } from '@jest/globals';
import { toInteger, ConvertError } from '../../convert';

describe('ConvertError', () => {
  it('is an instance of Error', () => expect(new ConvertError('x')).toBeInstanceOf(Error));
  it('has name "ConvertError"', () => expect(new ConvertError('x').name).toBe('ConvertError'));
  it('message includes the invalid value', () => {
    const err = (() => {
      try {
        toInteger('abc');
      } catch (e) {
        return e;
      }
    })();
    expect(err).toBeInstanceOf(ConvertError);
    expect((err as ConvertError).message).toContain('abc');
  });
});
