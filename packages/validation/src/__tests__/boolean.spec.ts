import { describe, it } from '@jest/globals';
import { invalid, valid } from './helpers';

describe('isBooleanString', () => {
  describe('valid — native boolean values', () => {
    it('boolean true', () => valid(true, 'isBooleanString'));
    it('boolean false', () => valid(false, 'isBooleanString'));
  });

  describe('valid — string representations', () => {
    it('"true"', () => valid('true', 'isBooleanString'));
    it('"false"', () => valid('false', 'isBooleanString'));
    it('"1"', () => valid('1', 'isBooleanString'));
    it('"0"', () => valid('0', 'isBooleanString'));
    it('"yes"', () => valid('yes', 'isBooleanString'));
    it('"no"', () => valid('no', 'isBooleanString'));
    it('"on"', () => valid('on', 'isBooleanString'));
    it('"off"', () => valid('off', 'isBooleanString'));
  });

  describe('valid — case insensitive', () => {
    it('"TRUE"', () => valid('TRUE', 'isBooleanString'));
    it('"FALSE"', () => valid('FALSE', 'isBooleanString'));
    it('"YES"', () => valid('YES', 'isBooleanString'));
    it('"NO"', () => valid('NO', 'isBooleanString'));
    it('"ON"', () => valid('ON', 'isBooleanString'));
    it('"OFF"', () => valid('OFF', 'isBooleanString'));
    it('"True" (mixed case)', () => valid('True', 'isBooleanString'));
  });

  describe('invalid — ambiguous or non-boolean strings', () => {
    it('"maybe"', () => invalid('maybe', 'isBooleanString'));
    it('"2"', () => invalid('2', 'isBooleanString'));
    it('"t"', () => invalid('t', 'isBooleanString'));
    it('"f"', () => invalid('f', 'isBooleanString'));
    it('"y"', () => invalid('y', 'isBooleanString'));
    it('"n"', () => invalid('n', 'isBooleanString'));
    it('empty string', () => invalid('', 'isBooleanString'));
    it('"truthy"', () => invalid('truthy', 'isBooleanString'));
  });

  describe('wrong value types', () => {
    it('number 1', () => invalid(1, 'isBooleanString'));
    it('number 0', () => invalid(0, 'isBooleanString'));
    it('number 2', () => invalid(2, 'isBooleanString'));
    it('null', () => invalid(null, 'isBooleanString'));
    it('object', () => invalid({}, 'isBooleanString'));
    it('array', () => invalid([], 'isBooleanString'));
    it('array with true', () => invalid([true], 'isBooleanString'));
  });
});
