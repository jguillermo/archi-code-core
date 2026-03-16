import { describe, expect, it } from '@jest/globals';
import {
  isNotEmpty,
  isMinLength,
  isMaxLength,
  isExactLength,
  isLengthBetween,
  isAlpha,
  isAlphanumeric,
  isNumeric,
  isAscii,
  isLowercase,
  isUppercase,
  isContains,
  isStartsWith,
  isEndsWith,
  isMatchesRegex,
  isInteger,
  isPositiveInteger,
  isNegativeInteger,
  isFloat,
  isPositiveNumber,
  isNegativeNumber,
  isInRange,
  isMinValue,
  isMaxValue,
  isMultipleOf,
  isEmail,
  isUuid,
  isUuidV4,
  isUuidV7,
  isUrl,
  isUrlWithScheme,
  isIp,
  isIpv4,
  isIpv6,
  isDate,
  isDatetime,
  isTime,
  isBooleanString,
  isCreditCard,
  isJson,
  isHexColor,
  isBase64,
  isSlug,
} from '../validators/direct';

describe('direct validators', () => {
  describe('string', () => {
    it('isNotEmpty', () => {
      expect(isNotEmpty('hello')).toBe(true);
      expect(isNotEmpty('')).toBe(false);
    });
    it('isMinLength', () => {
      expect(isMinLength('hello', 3)).toBe(true);
      expect(isMinLength('hi', 3)).toBe(false);
    });
    it('isMaxLength', () => {
      expect(isMaxLength('hi', 5)).toBe(true);
      expect(isMaxLength('toolong', 5)).toBe(false);
    });
    it('isExactLength', () => {
      expect(isExactLength('abc', 3)).toBe(true);
      expect(isExactLength('ab', 3)).toBe(false);
    });
    it('isLengthBetween', () => {
      expect(isLengthBetween('hello', 3, 10)).toBe(true);
      expect(isLengthBetween('hi', 3, 10)).toBe(false);
    });
    it('isAlpha', () => {
      expect(isAlpha('abc')).toBe(true);
      expect(isAlpha('abc1')).toBe(false);
    });
    it('isAlphanumeric', () => {
      expect(isAlphanumeric('abc123')).toBe(true);
      expect(isAlphanumeric('abc!')).toBe(false);
    });
    it('isNumeric', () => {
      expect(isNumeric('123')).toBe(true);
      expect(isNumeric('12a')).toBe(false);
    });
    it('isAscii', () => {
      expect(isAscii('hello')).toBe(true);
      expect(isAscii('héllo')).toBe(false);
    });
    it('isLowercase', () => {
      expect(isLowercase('hello')).toBe(true);
      expect(isLowercase('Hello')).toBe(false);
    });
    it('isUppercase', () => {
      expect(isUppercase('HELLO')).toBe(true);
      expect(isUppercase('Hello')).toBe(false);
    });
    it('isContains', () => {
      expect(isContains('hello world', 'world')).toBe(true);
      expect(isContains('hello', 'xyz')).toBe(false);
    });
    it('isStartsWith', () => {
      expect(isStartsWith('hello', 'hel')).toBe(true);
      expect(isStartsWith('hello', 'llo')).toBe(false);
    });
    it('isEndsWith', () => {
      expect(isEndsWith('hello', 'llo')).toBe(true);
      expect(isEndsWith('hello', 'hel')).toBe(false);
    });
    it('isMatchesRegex', () => {
      expect(isMatchesRegex('abc123', '^[a-z0-9]+$')).toBe(true);
      expect(isMatchesRegex('ABC', '^[a-z]+$')).toBe(false);
    });
  });

  describe('number', () => {
    it('isInteger', () => {
      expect(isInteger(5)).toBe(true);
      expect(isInteger(5.5)).toBe(false);
    });
    it('isPositiveInteger', () => {
      expect(isPositiveInteger(1)).toBe(true);
      expect(isPositiveInteger(0)).toBe(false);
      expect(isPositiveInteger(-1)).toBe(false);
    });
    it('isNegativeInteger', () => {
      expect(isNegativeInteger(-1)).toBe(true);
      expect(isNegativeInteger(1)).toBe(false);
    });
    it('isFloat', () => {
      expect(isFloat(1.5)).toBe(true);
      expect(isFloat(1)).toBe(true); // integers are valid f64
    });
    it('isPositiveNumber', () => {
      expect(isPositiveNumber(0.1)).toBe(true);
      expect(isPositiveNumber(-0.1)).toBe(false);
    });
    it('isNegativeNumber', () => {
      expect(isNegativeNumber(-0.1)).toBe(true);
      expect(isNegativeNumber(0.1)).toBe(false);
    });
    it('isInRange', () => {
      expect(isInRange(5, 0, 10)).toBe(true);
      expect(isInRange(15, 0, 10)).toBe(false);
    });
    it('isMinValue', () => {
      expect(isMinValue(5, 3)).toBe(true);
      expect(isMinValue(2, 3)).toBe(false);
    });
    it('isMaxValue', () => {
      expect(isMaxValue(5, 10)).toBe(true);
      expect(isMaxValue(15, 10)).toBe(false);
    });
    it('isMultipleOf', () => {
      expect(isMultipleOf(10, 5)).toBe(true);
      expect(isMultipleOf(11, 5)).toBe(false);
    });
  });

  describe('email', () => {
    it('valid', () => expect(isEmail('user@example.com')).toBe(true));
    it('invalid', () => expect(isEmail('notanemail')).toBe(false));
  });

  describe('uuid', () => {
    const v4 = '550e8400-e29b-41d4-a716-446655440000';
    it('isUuid', () => {
      expect(isUuid(v4)).toBe(true);
      expect(isUuid('not-a-uuid')).toBe(false);
    });
    it('isUuidV4', () => {
      expect(isUuidV4('f47ac10b-58cc-4372-a567-0e02b2c3d479')).toBe(true);
      expect(isUuidV4('not-a-uuid')).toBe(false);
    });
    it('isUuidV7', () => {
      expect(isUuidV7('018e3f1a-5b2c-7000-8000-000000000000')).toBe(true);
      expect(isUuidV7('not-a-uuid')).toBe(false);
    });
  });

  describe('url', () => {
    it('isUrl', () => {
      expect(isUrl('https://example.com')).toBe(true);
      expect(isUrl('no-scheme')).toBe(false);
    });
    it('isUrlWithScheme', () => {
      expect(isUrlWithScheme('https://example.com', 'https')).toBe(true);
      expect(isUrlWithScheme('http://example.com', 'https')).toBe(false);
    });
  });

  describe('ip', () => {
    it('isIp', () => {
      expect(isIp('192.168.1.1')).toBe(true);
      expect(isIp('::1')).toBe(true);
      expect(isIp('not-ip')).toBe(false);
    });
    it('isIpv4', () => {
      expect(isIpv4('192.168.1.1')).toBe(true);
      expect(isIpv4('::1')).toBe(false);
    });
    it('isIpv6', () => {
      expect(isIpv6('::1')).toBe(true);
      expect(isIpv6('192.168.1.1')).toBe(false);
    });
  });

  describe('date / time', () => {
    it('isDate', () => {
      expect(isDate('2024-01-15')).toBe(true);
      expect(isDate('15/01/2024')).toBe(false);
    });
    it('isDatetime', () => {
      expect(isDatetime('2024-01-15T10:30:00Z')).toBe(true);
      expect(isDatetime('not-a-date')).toBe(false);
    });
    it('isTime', () => {
      expect(isTime('10:30:00')).toBe(true);
      expect(isTime('25:00:00')).toBe(false);
    });
  });

  describe('boolean', () => {
    it('isBooleanString with string', () => {
      expect(isBooleanString('true')).toBe(true);
      expect(isBooleanString('yes')).toBe(true);
      expect(isBooleanString('maybe')).toBe(false);
    });
    it('isBooleanString with boolean', () => {
      expect(isBooleanString(true)).toBe(true);
      expect(isBooleanString(false)).toBe(true);
    });
  });

  describe('misc', () => {
    it('isCreditCard', () => {
      expect(isCreditCard('4532015112830366')).toBe(true);
      expect(isCreditCard('1234567890123456')).toBe(false);
    });
    it('isJson', () => {
      expect(isJson('{"key":"value"}')).toBe(true);
      expect(isJson('not-json')).toBe(false);
    });
    it('isHexColor', () => {
      expect(isHexColor('#ff0000')).toBe(true);
      expect(isHexColor('ff0000')).toBe(false);
    });
    it('isBase64', () => {
      expect(isBase64('aGVsbG8=')).toBe(true);
      expect(isBase64('not!base64')).toBe(false);
    });
    it('isSlug', () => {
      expect(isSlug('hello-world')).toBe(true);
      expect(isSlug('Hello-World')).toBe(false);
    });
  });
});
