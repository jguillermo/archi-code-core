import { describe, expect, it } from 'vitest';
import { ValueEquality } from '../../../src/type/equality/value-equality';

const shippingAddress = { street: 'Gran Vía 1', city: 'Huelva', zip: '21001' };

describe('ValueEquality', () => {
  describe('scalar values held by string, number, boolean and id types', () => {
    it.each([
      ['the same email text', 'ana@example.com', 'ana@example.com', true],
      ['two different emails', 'ana@example.com', 'eva@example.com', false],
      ['the same price', 19.99, 19.99, true],
      ['two different prices', 19.99, 20, false],
      ['the same flag', true, true, true],
      ['opposite flags', true, false, false],
      ['two missing optional values', null, null, true],
      ['a missing value and a value', null, 'ana@example.com', false],
      ['two NaN measurements', NaN, NaN, true],
      ['a zero discount and a negative zero discount', 0, -0, true],
      ['a number and its text', 18, '18', false],
    ])('%s → %s', (_, left, right, expected) => {
      expect(ValueEquality.equals(left, right)).toBe(expected);
    });
  });

  describe('dates compared by instant, not by reference', () => {
    it('two Date objects for the same delivery instant are equal', () => {
      expect(
        ValueEquality.equals(
          new Date('2024-01-31T10:00:00.000Z'),
          new Date('2024-01-31T11:00:00.000+01:00'),
        ),
      ).toBe(true);
    });

    it('two delivery dates one millisecond apart are different', () => {
      expect(
        ValueEquality.equals(
          new Date('2024-01-31T10:00:00.000Z'),
          new Date('2024-01-31T10:00:00.001Z'),
        ),
      ).toBe(false);
    });

    it('two invalid dates are the same (non) instant', () => {
      expect(ValueEquality.equals(new Date('invalid'), new Date('invalid'))).toBe(true);
    });

    it.each([
      ['its ISO text', '2024-01-31T10:00:00.000Z'],
      ['its timestamp', Date.parse('2024-01-31T10:00:00.000Z')],
      ['a plain object', {}],
      ['null', null],
    ])('a date is never equal to %s', (_, other) => {
      const date = new Date('2024-01-31T10:00:00.000Z');
      expect(ValueEquality.equals(date, other)).toBe(false);
      expect(ValueEquality.equals(other, date)).toBe(false);
    });
  });

  describe('arrays compared item by item', () => {
    it('the same tags in the same order are equal', () => {
      expect(ValueEquality.equals(['ddd', 'node'], ['ddd', 'node'])).toBe(true);
    });

    it('the same tags in another order are different', () => {
      expect(ValueEquality.equals(['ddd', 'node'], ['node', 'ddd'])).toBe(false);
    });

    it('a list with one more tag is different', () => {
      expect(ValueEquality.equals(['ddd'], ['ddd', 'node'])).toBe(false);
      expect(ValueEquality.equals(['ddd', 'node'], ['ddd'])).toBe(false);
    });

    it('two empty lists are equal', () => {
      expect(ValueEquality.equals([], [])).toBe(true);
    });

    it('holiday lists are equal when their dates are the same instants', () => {
      expect(
        ValueEquality.equals(
          [new Date('2024-12-25T00:00:00Z'), new Date('2025-01-01T00:00:00Z')],
          [new Date('2024-12-25T00:00:00Z'), new Date('2025-01-01T00:00:00Z')],
        ),
      ).toBe(true);
    });

    it.each([
      ['an object with index keys', { 0: 'ddd' }],
      ['a text', 'ddd'],
      ['null', null],
    ])('a list is never equal to %s', (_, other) => {
      expect(ValueEquality.equals(['ddd'], other)).toBe(false);
      expect(ValueEquality.equals(other, ['ddd'])).toBe(false);
    });
  });

  describe('JSON objects compared by their own keys', () => {
    it('the same address written in another key order is equal', () => {
      expect(
        ValueEquality.equals(shippingAddress, {
          zip: '21001',
          city: 'Huelva',
          street: 'Gran Vía 1',
        }),
      ).toBe(true);
    });

    it('an address with another zip is different', () => {
      expect(ValueEquality.equals(shippingAddress, { ...shippingAddress, zip: '21002' })).toBe(
        false,
      );
    });

    it('an address with an extra floor is different, in both directions', () => {
      const withFloor = { ...shippingAddress, floor: '2B' };
      expect(ValueEquality.equals(shippingAddress, withFloor)).toBe(false);
      expect(ValueEquality.equals(withFloor, shippingAddress)).toBe(false);
    });

    it('the same number of keys with a different key is different', () => {
      expect(ValueEquality.equals({ city: 'Huelva' }, { town: 'Huelva' })).toBe(false);
    });

    it('a key present with undefined is not the same as a missing key with the same count', () => {
      expect(ValueEquality.equals({ a: undefined }, { b: undefined })).toBe(false);
    });

    it('nested preferences with lists and dates are compared deeply', () => {
      const preferences = () => ({
        locale: 'es-ES',
        channels: ['email', 'sms'],
        quietHours: { from: '22:00', to: '08:00' },
        lastReviewed: new Date('2024-06-01T00:00:00Z'),
      });
      expect(ValueEquality.equals(preferences(), preferences())).toBe(true);
      expect(
        ValueEquality.equals(preferences(), {
          ...preferences(),
          quietHours: { from: '23:00', to: '08:00' },
        }),
      ).toBe(false);
    });

    it('an object is never equal to a scalar', () => {
      expect(ValueEquality.equals(shippingAddress, 'Gran Vía 1, Huelva')).toBe(false);
      expect(ValueEquality.equals('Gran Vía 1, Huelva', shippingAddress)).toBe(false);
    });
  });
});
