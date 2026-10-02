import { describe, expect, it, jest } from '@jest/globals';
import { acceptValue } from './accept-value';
import { REQUIRED } from '../required/required-mark';
import { RequiredValueException } from '../../exceptions/domain/required-value.exception';

class Optional {}

class Mandatory {
  readonly [REQUIRED] = true;
}

function filterReturning(result: unknown) {
  return jest.fn((_value: unknown) => result);
}

describe('acceptValue', () => {
  describe('a value with content', () => {
    it('is passed to filter and its result is returned', () => {
      const filter = filterReturning('converted');
      expect(acceptValue(new Optional(), ' a ', filter)).toBe('converted');
      expect(filter).toHaveBeenCalledTimes(1);
      expect(filter).toHaveBeenCalledWith(' a ');
    });

    it('propagates an error thrown by filter', () => {
      const filter = jest.fn(() => {
        throw new Error('invalid input');
      });
      expect(() => acceptValue(new Optional(), 'a', filter)).toThrow('invalid input');
    });
  });

  describe('a missing value', () => {
    it.each([
      ['null', null],
      ['undefined', undefined],
      ['a blank string', '   '],
    ])('%s is null for an optional type, without calling filter', (_, value) => {
      const filter = filterReturning('converted');
      expect(acceptValue(new Optional(), value, filter)).toBeNull();
      expect(filter).not.toHaveBeenCalled();
    });

    it.each([
      ['null', null, 'null'],
      ['undefined', undefined, 'undefined'],
      ['a blank string', '   ', '"   "'],
    ])(
      '%s throws RequiredValueException for a required type, without calling filter',
      (_, value, received) => {
        const filter = filterReturning('converted');
        const accept = () => acceptValue(new Mandatory(), value, filter);
        expect(accept).toThrow(RequiredValueException);
        expect(accept).toThrow(
          `Validation Error: Mandatory is required, but received ${received}.`,
        );
        expect(filter).not.toHaveBeenCalled();
      },
    );
  });

  describe('a value that filter turns into null', () => {
    it('is null for an optional type', () => {
      expect(acceptValue(new Optional(), 'none', filterReturning(null))).toBeNull();
    });

    it('throws RequiredValueException for a required type, reporting the raw input', () => {
      expect(() => acceptValue(new Mandatory(), 'none', filterReturning(null))).toThrow(
        'Validation Error: Mandatory is required, but received "none".',
      );
    });
  });
});
