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

    it('custom message overrides default error text', () => {
      const errors = check('bad', { rule: 'isEmail', message: 'Custom error' });
      expect(errors).toEqual(['Custom error']);
    });

    it('custom message with params', () => {
      const errors = check('hi', { rule: 'isMinLength', params: [5], message: 'Too short' });
      expect(errors).toEqual(['Too short']);
    });
  });

  describe('three formats mixed on same field', () => {
    it('each format runs independently', () => {
      const errors = check('AB', 'isNotEmpty', ['isMinLength', 5], {
        rule: 'isLowercase',
        message: 'must be lower',
      });
      expect(errors).toContain('must be at least 5 characters long');
      expect(errors).toContain('must be lower');
      expect(errors).not.toContain('must not be empty');
    });

    it('stops reporting only the rules that fail', () => {
      const errors = check('hello-world', 'isNotEmpty', 'isSlug', ['isMaxLength', 50]);
      expect(errors).toEqual([]);
    });
  });
});
