import { describe, it } from '@jest/globals';
import { invalid, valid } from './helpers';

describe('isEmail', () => {
  describe('valid emails', () => {
    it('simple email', () => valid('user@example.com', 'isEmail'));
    it('with subdomain', () => valid('user@sub.example.com', 'isEmail'));
    it('with plus tag', () => valid('user+tag@example.com', 'isEmail'));
    it('with dots in local part', () => valid('first.last@example.org', 'isEmail'));
    it('with numbers in local part', () => valid('user123@example.com', 'isEmail'));
    it('short TLD', () => valid('user@example.io', 'isEmail'));
    it('long TLD', () => valid('user@example.museum', 'isEmail'));
  });

  describe('invalid emails', () => {
    it('missing @', () => invalid('notanemail', 'isEmail'));
    it('missing domain', () => invalid('user@', 'isEmail'));
    it('missing local part', () => invalid('@example.com', 'isEmail'));
    it('space in local part', () => invalid('user @example.com', 'isEmail'));
    it('double @', () => invalid('user@@example.com', 'isEmail'));
    it('empty string', () => invalid('', 'isEmail'));
    it('only @', () => invalid('@', 'isEmail'));
  });

  describe('wrong value types', () => {
    it('number', () => invalid(123, 'isEmail'));
    it('null', () => invalid(null, 'isEmail'));
    it('undefined-like null', () => invalid(null, 'isEmail'));
    it('object', () => invalid({ email: 'a@b.com' }, 'isEmail'));
    it('array', () => invalid(['a@b.com'], 'isEmail'));
    it('boolean true', () => invalid(true, 'isEmail'));
    it('boolean false', () => invalid(false, 'isEmail'));
    it('empty object', () => invalid({}, 'isEmail'));
    it('empty array', () => invalid([], 'isEmail'));
  });
});
