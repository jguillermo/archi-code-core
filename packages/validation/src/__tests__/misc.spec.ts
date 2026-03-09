import { describe, it } from '@jest/globals';
import { invalid, valid } from './helpers';

describe('isCreditCard', () => {
  describe('valid — passes Luhn algorithm', () => {
    it('Visa 16-digit', () => valid('4111111111111111', 'isCreditCard'));
    it('Mastercard', () => valid('5500005555555559', 'isCreditCard'));
    it('Diners Club 14-digit', () => valid('30569309025904', 'isCreditCard'));
  });

  describe('invalid — fails Luhn', () => {
    it('Visa with last digit wrong', () => invalid('4111111111111112', 'isCreditCard'));
    it('all same digits', () => invalid('1111111111111111', 'isCreditCard'));
  });

  describe('invalid — format issues', () => {
    it('too short (9 digits)', () => invalid('411111111', 'isCreditCard'));
    it('has letters', () => invalid('4111111111111abc', 'isCreditCard'));
    // Rust implementation strips non-digit chars before Luhn check → hyphens are removed → passes
    it('valid — hyphens stripped before Luhn check', () =>
      valid('4111-1111-1111-1111', 'isCreditCard'));
    it('empty string', () => invalid('', 'isCreditCard'));
  });

  describe('wrong value types', () => {
    it('number (not string)', () => invalid(4111111111111111, 'isCreditCard'));
    it('null', () => invalid(null, 'isCreditCard'));
    it('object', () => invalid({}, 'isCreditCard'));
    it('boolean', () => invalid(true, 'isCreditCard'));
  });
});

describe('isJson', () => {
  describe('valid JSON strings', () => {
    it('object', () => valid('{"key":"value"}', 'isJson'));
    it('array', () => valid('[1,2,3]', 'isJson'));
    it('nested object', () => valid('{"a":{"b":1}}', 'isJson'));
    it('number', () => valid('42', 'isJson'));
    it('null literal', () => valid('null', 'isJson'));
    it('boolean literal', () => valid('true', 'isJson'));
    it('string literal', () => valid('"hello"', 'isJson'));
    it('empty object', () => valid('{}', 'isJson'));
    it('empty array', () => valid('[]', 'isJson'));
  });

  describe('invalid JSON strings', () => {
    it('unquoted key', () => invalid('{key:"value"}', 'isJson'));
    it('trailing comma', () => invalid('{"key":"value",}', 'isJson'));
    it('single quotes', () => invalid("{'key':'value'}", 'isJson'));
    it('plain text', () => invalid('hello world', 'isJson'));
    it('undefined literal', () => invalid('undefined', 'isJson'));
    it('empty string', () => invalid('', 'isJson'));
  });

  describe('wrong value types', () => {
    it('actual object (not string)', () => invalid({ key: 'value' }, 'isJson'));
    it('actual array', () => invalid([1, 2, 3], 'isJson'));
    it('number', () => invalid(42, 'isJson'));
    it('null', () => invalid(null, 'isJson'));
    it('boolean', () => invalid(true, 'isJson'));
  });
});

describe('isHexColor', () => {
  describe('valid hex colors', () => {
    it('6-digit lowercase', () => valid('#ff5733', 'isHexColor'));
    it('6-digit uppercase', () => valid('#FF5733', 'isHexColor'));
    it('6-digit mixed case', () => valid('#Ff5733', 'isHexColor'));
    it('3-digit shorthand', () => valid('#fff', 'isHexColor'));
    it('3-digit with digits', () => valid('#123', 'isHexColor'));
    it('black', () => valid('#000000', 'isHexColor'));
    it('white', () => valid('#ffffff', 'isHexColor'));
  });

  describe('invalid hex colors', () => {
    it('missing # prefix', () => invalid('ff5733', 'isHexColor'));
    it('4-digit', () => invalid('#ffff', 'isHexColor'));
    it('5-digit', () => invalid('#fffff', 'isHexColor'));
    it('7-digit', () => invalid('#fffffff', 'isHexColor'));
    it('invalid hex char z', () => invalid('#zzzzzz', 'isHexColor'));
    it('rgb() format', () => invalid('rgb(255,0,0)', 'isHexColor'));
    it('empty string', () => invalid('', 'isHexColor'));
    it('just a hash', () => invalid('#', 'isHexColor'));
  });

  describe('wrong value types', () => {
    it('number', () => invalid(0xff5733, 'isHexColor'));
    it('null', () => invalid(null, 'isHexColor'));
    it('object', () => invalid({}, 'isHexColor'));
    it('boolean', () => invalid(true, 'isHexColor'));
    it('array', () => invalid(['#fff'], 'isHexColor'));
  });
});

describe('isBase64', () => {
  describe('valid base64 strings', () => {
    it('hello world encoded', () => valid('SGVsbG8gV29ybGQ=', 'isBase64'));
    it('test encoded', () => valid('dGVzdA==', 'isBase64'));
    it('with + and / chars (valid base64 alphabet)', () => valid('SGVsbG8+V29ybGQ=', 'isBase64'));
  });

  describe('invalid base64 strings', () => {
    it('invalid char !', () => invalid('SGVsbG8!', 'isBase64'));
    it('missing padding', () => invalid('SGVsbG8', 'isBase64'));
    it('empty string', () => invalid('', 'isBase64'));
    it('plain text', () => invalid('hello world', 'isBase64'));
  });

  describe('wrong value types', () => {
    it('number', () => invalid(123, 'isBase64'));
    it('null', () => invalid(null, 'isBase64'));
    it('object', () => invalid({}, 'isBase64'));
    it('boolean', () => invalid(true, 'isBase64'));
  });
});

describe('isSlug', () => {
  describe('valid slugs', () => {
    it('simple slug', () => valid('hello-world', 'isSlug'));
    it('single word', () => valid('hello', 'isSlug'));
    it('with numbers', () => valid('post-123', 'isSlug'));
    it('multiple hyphens', () => valid('my-blog-post-title', 'isSlug'));
    it('all digits', () => valid('123', 'isSlug'));
  });

  describe('invalid slugs', () => {
    it('uppercase letters', () => invalid('Hello-World', 'isSlug'));
    it('all caps', () => invalid('HELLO', 'isSlug'));
    it('spaces', () => invalid('hello world', 'isSlug'));
    it('underscore', () => invalid('hello_world', 'isSlug'));
    it('leading hyphen', () => invalid('-hello', 'isSlug'));
    it('trailing hyphen', () => invalid('hello-', 'isSlug'));
    it('special char @', () => invalid('hello@world', 'isSlug'));
    it('dot', () => invalid('hello.world', 'isSlug'));
    it('empty string', () => invalid('', 'isSlug'));
  });

  describe('wrong value types', () => {
    it('number', () => invalid(123, 'isSlug'));
    it('null', () => invalid(null, 'isSlug'));
    it('object', () => invalid({}, 'isSlug'));
    it('boolean', () => invalid(false, 'isSlug'));
    it('array', () => invalid(['hello-world'], 'isSlug'));
  });
});
