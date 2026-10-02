import { describe, expect, it, jest } from '@jest/globals';
import { TypeInput } from './type-input';
import { RequiredMark } from '../required/required-mark';
import { RequiredValueException } from '../../exceptions/domain/required-value.exception';

class Optional {}

class Mandatory {
  readonly [RequiredMark.symbol] = true;
}

function filterReturning(result: unknown) {
  return jest.fn((_value: unknown) => result);
}

describe('TypeInput', () => {
  describe('isMissing', () => {
    it.each([
      ['null', null],
      ['undefined', undefined],
      ['an empty string', ''],
      ['only spaces', '   '],
      ['only tabs and line breaks', '\t\n\r\n'],
    ])('%s is missing', (_, value) => {
      expect(TypeInput.isMissing(value)).toBe(true);
    });

    it.each([
      ['a string with content', 'a'],
      ['a string with content and spaces', ' a '],
      ['zero', 0],
      ['NaN', NaN],
      ['false', false],
      ['an empty array', []],
      ['an empty object', {}],
    ])('%s is not missing', (_, value) => {
      expect(TypeInput.isMissing(value)).toBe(false);
    });
  });

  describe('accept', () => {
    describe('a value with content', () => {
      it('is passed to filter and its result is returned', () => {
        const filter = filterReturning('converted');
        expect(TypeInput.accept(new Optional(), ' a ', filter)).toBe('converted');
        expect(filter).toHaveBeenCalledTimes(1);
        expect(filter).toHaveBeenCalledWith(' a ');
      });

      it('propagates an error thrown by filter', () => {
        const filter = jest.fn(() => {
          throw new Error('invalid input');
        });
        expect(() => TypeInput.accept(new Optional(), 'a', filter)).toThrow('invalid input');
      });
    });

    describe('a missing value', () => {
      it.each([
        ['null', null],
        ['undefined', undefined],
        ['a blank string', '   '],
      ])('%s is null for an optional type, without calling filter', (_, value) => {
        const filter = filterReturning('converted');
        expect(TypeInput.accept(new Optional(), value, filter)).toBeNull();
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
          const accept = () => TypeInput.accept(new Mandatory(), value, filter);
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
        expect(TypeInput.accept(new Optional(), 'none', filterReturning(null))).toBeNull();
      });

      it('throws RequiredValueException for a required type, reporting the raw input', () => {
        expect(() => TypeInput.accept(new Mandatory(), 'none', filterReturning(null))).toThrow(
          'Validation Error: Mandatory is required, but received "none".',
        );
      });
    });
  });
});
