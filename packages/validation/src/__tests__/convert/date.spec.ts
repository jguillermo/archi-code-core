import { describe, expect, it } from '@jest/globals';
import { toDate, ConvertError } from '../../convert';

describe('toDate', () => {
  describe('valid conversions', () => {
    it('Date instance → same Date', () => {
      const d = new Date('2024-01-15');
      expect(toDate(d).getTime()).toBe(d.getTime());
    });
    it('ISO string "2024-01-15" → Date', () => {
      const d = toDate('2024-01-15');
      expect(d).toBeInstanceOf(Date);
      expect(d.getUTCFullYear()).toBe(2024);
    });
    it('ISO string with time → Date', () => {
      const d = toDate('2024-06-15T12:30:00Z');
      expect(d).toBeInstanceOf(Date);
      expect(d.getUTCHours()).toBe(12);
    });
  });

  describe('invalid values throw ConvertError', () => {
    it('string "not-a-date" throws', () =>
      expect(() => toDate('not-a-date')).toThrow(ConvertError));
    it('number timestamp throws', () => expect(() => toDate(1705276800000)).toThrow(ConvertError));
    it('null throws', () => expect(() => toDate(null)).toThrow(ConvertError));
    it('undefined throws', () => expect(() => toDate(undefined)).toThrow(ConvertError));
    it('boolean throws', () => expect(() => toDate(true)).toThrow(ConvertError));
  });
});
