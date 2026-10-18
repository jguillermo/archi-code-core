import { describe, expect, it, vi } from 'vitest';
import { TypeInput } from '../../../src/type/input/type-input';
import { RequiredMark } from '../../../src/type/required/required-mark';
import { RequiredValueException } from '../../../src/exceptions/domain/required-value.exception';

class Nickname {}

class CustomerName {
  readonly [RequiredMark.symbol] = true;
}

function filterReturning(result: unknown) {
  return vi.fn((_value: unknown) => result);
}

describe('TypeInput', () => {
  describe('deciding whether a form field was filled in', () => {
    it.each([
      ['a field sent as null', null],
      ['a field left out of the request', undefined],
      ['an empty text box', ''],
      ['a text box with only spaces', '   '],
      ['a text area with only tabs and line breaks', '\t\n\r\n'],
    ])('%s is missing', (_, value) => {
      expect(TypeInput.isMissing(value)).toBe(true);
    });

    it.each([
      ['a name', 'a'],
      ['a name with surrounding spaces', ' a '],
      ['a zero quantity', 0],
      ['NaN', NaN],
      ['an unchecked checkbox', false],
      ['an empty list of tags', []],
      ['an empty settings object', {}],
    ])('%s is present', (_, value) => {
      expect(TypeInput.isMissing(value)).toBe(false);
    });
  });

  describe('accepting a filled-in field', () => {
    it('hands it once, untouched, to the type filter and keeps what the filter returns', () => {
      const filter = filterReturning('converted');
      expect(TypeInput.accept(new Nickname(), ' a ', filter)).toBe('converted');
      expect(filter).toHaveBeenCalledTimes(1);
      expect(filter).toHaveBeenCalledWith(' a ');
    });

    it('lets the error of a filter that rejects the input reach the caller', () => {
      const filter = vi.fn(() => {
        throw new Error('invalid input');
      });
      expect(() => TypeInput.accept(new Nickname(), 'a', filter)).toThrow('invalid input');
    });
  });

  describe('accepting a missing field', () => {
    it.each([
      ['null', null],
      ['undefined', undefined],
      ['a blank text', '   '],
    ])('stores %s as null in an optional nickname, without calling the filter', (_, value) => {
      const filter = filterReturning('converted');
      expect(TypeInput.accept(new Nickname(), value, filter)).toBeNull();
      expect(filter).not.toHaveBeenCalled();
    });

    it.each([
      ['null', null, 'null'],
      ['undefined', undefined, 'undefined'],
      ['a blank text', '   ', '"   "'],
    ])(
      'rejects %s for a required customer name, without calling the filter',
      (_, value, received) => {
        const filter = filterReturning('converted');
        const accept = () => TypeInput.accept(new CustomerName(), value, filter);
        expect(accept).toThrow(RequiredValueException);
        expect(accept).toThrow(
          `Validation Error: CustomerName is required, but received ${received}.`,
        );
        expect(filter).not.toHaveBeenCalled();
      },
    );
  });

  describe('accepting a field the filter turns into null', () => {
    it('stores null in an optional nickname', () => {
      expect(TypeInput.accept(new Nickname(), 'none', filterReturning(null))).toBeNull();
    });

    it('rejects it for a required customer name, reporting what the user typed', () => {
      expect(() => TypeInput.accept(new CustomerName(), 'none', filterReturning(null))).toThrow(
        'Validation Error: CustomerName is required, but received "none".',
      );
    });
  });
});
