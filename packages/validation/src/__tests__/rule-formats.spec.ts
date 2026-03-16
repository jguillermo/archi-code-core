import { describe, expect, it } from '@jest/globals';
import { check, invalid, valid } from './helpers';

describe('rule formats', () => {
  describe('simple string rule — "isEmail"', () => {
    it('passes for valid value', () => valid('a@b.com', 'isEmail'));
    it('fails for invalid value', () => invalid('bad', 'isEmail'));
  });

  describe('array rule with params — ["isMinLength", 5]', () => {
    it('passes when value meets param', () => valid('hello', ['isMinLength', 3]));
    it('fails when value does not meet param', () => invalid('hi', ['isMinLength', 3]));
  });

  describe('config object rule — { rule, params?, message? }', () => {
    it('passes with rule only', () => valid('a@b.com', { rule: 'isEmail' }));
    it('fails with rule only', () => invalid('bad', { rule: 'isEmail' }));

    it('passes with rule + params', () => valid('hello', { rule: 'isMinLength', params: [3] }));
    it('fails with rule + params', () => invalid('hi', { rule: 'isMinLength', params: [3] }));

    it('custom message ignored — returns rule code 25 (isEmail)', () => {
      const errors = check('bad', { rule: 'isEmail', message: 'Custom error' });
      expect(errors).toEqual([25]);
    });

    it('custom message with params — returns rule code 1 (isMinLength)', () => {
      const errors = check('hi', { rule: 'isMinLength', params: [5], message: 'Too short' });
      expect(errors).toEqual([1]);
    });
  });

  describe('three formats mixed on same field', () => {
    it('each format runs independently — returns failing codes', () => {
      const errors = check('AB', 'isNotEmpty', ['isMinLength', 5], {
        rule: 'isLowercase',
        message: 'must be lower',
      });
      // isMinLength=1, isLowercase=9; isNotEmpty=0 should NOT appear
      expect(errors).toContain(1);
      expect(errors).toContain(9);
      expect(errors).not.toContain(0);
    });

    it('stops reporting only the rules that fail', () => {
      const errors = check('hello-world', 'isNotEmpty', 'isSlug', ['isMaxLength', 50]);
      expect(errors).toEqual([]);
    });
  });
});
