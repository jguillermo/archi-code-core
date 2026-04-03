import { describe, expect, it } from '@jest/globals';
import { toBeDate, ConvertError } from '../../convert';

describe('toBeDate', () => {
  describe('valid conversions', () => {
    it('Date instance → same Date', () => {
      const d = new Date('2024-01-15');
      expect(toBeDate(d).getTime()).toBe(d.getTime());
    });
    it('ISO string "2024-01-15" → Date', () => {
      const d = toBeDate('2024-01-15');
      expect(d).toBeInstanceOf(Date);
      expect(d.getUTCFullYear()).toBe(2024);
    });
    it('ISO string with time → Date', () => {
      const d = toBeDate('2024-06-15T12:30:00Z');
      expect(d).toBeInstanceOf(Date);
      expect(d.getUTCHours()).toBe(12);
    });
  });

  describe('invalid values throw ConvertError', () => {
    it('string "not-a-date" throws', () =>
      expect(() => toBeDate('not-a-date')).toThrow(ConvertError));
    it('number timestamp throws', () =>
      expect(() => toBeDate(1705276800000)).toThrow(ConvertError));
    it('null throws', () => expect(() => toBeDate(null)).toThrow(ConvertError));
    it('undefined throws', () => expect(() => toBeDate(undefined)).toThrow(ConvertError));
    it('boolean throws', () => expect(() => toBeDate(true)).toThrow(ConvertError));
  });
});
