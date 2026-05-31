import { describe, expect, it } from '@jest/globals';
import { toEnum, ConvertError } from '../../convert';

const COLORS = ['red', 'green', 'blue'];
const NUMBERS = ['0', '1', '2', '3', '-1'];
const BOOLEANS = ['true', 'false'];
const MIXED = ['red', '1', 'true', '0', '-1', 'hello world'];

describe('toEnum', () => {
  describe('string value → returns same string', () => {
    it('"red" in COLORS → "red"', () => expect(toEnum('red', COLORS)).toBe('red'));
    it('"green" in COLORS → "green"', () => expect(toEnum('green', COLORS)).toBe('green'));
    it('"blue" in COLORS → "blue"', () => expect(toEnum('blue', COLORS)).toBe('blue'));
    it('"0" in NUMBERS → "0"', () => expect(toEnum('0', NUMBERS)).toBe('0'));
    it('"1" in NUMBERS → "1"', () => expect(toEnum('1', NUMBERS)).toBe('1'));
    it('"-1" in NUMBERS → "-1"', () => expect(toEnum('-1', NUMBERS)).toBe('-1'));
    it('"true" in BOOLEANS → "true"', () => expect(toEnum('true', BOOLEANS)).toBe('true'));
    it('"false" in BOOLEANS → "false"', () => expect(toEnum('false', BOOLEANS)).toBe('false'));
    it('"hello world" in MIXED → "hello world"', () => expect(toEnum('hello world', MIXED)).toBe('hello world'));
    it('single-option list ["only"], "only" → "only"', () => expect(toEnum('only', ['only'])).toBe('only'));
    it('very long options list → found', () => {
      const opts = Array.from({ length: 1000 }, (_, i) => `opt${i}`);
      expect(toEnum('opt999', opts)).toBe('opt999');
      expect(toEnum('opt0', opts)).toBe('opt0');
    });
    it('empty string "" in ["","a"] → ""', () => expect(toEnum('', ['', 'a'])).toBe(''));
    it('"a" in single-char options → "a"', () => expect(toEnum('a', ['a', 'b', 'c'])).toBe('a'));
    it('unicode value in options → found', () => expect(toEnum('héllo', ['héllo', 'world'])).toBe('héllo'));
    it('string with spaces in options → exact match', () => expect(toEnum('hello world', ['hello world', 'foo'])).toBe('hello world'));
  });

  describe('number value → returns same number', () => {
    it('1 in ["1","2","3"] → 1', () => expect(toEnum(1, ['1', '2', '3'])).toBe(1));
    it('0 in ["0","1"] → 0', () => expect(toEnum(0, ['0', '1'])).toBe(0));
    it('-1 in ["-1","0","1"] → -1', () => expect(toEnum(-1, ['-1', '0', '1'])).toBe(-1));
    it('2 in ["1","2","3"] → 2', () => expect(toEnum(2, ['1', '2', '3'])).toBe(2));
    it('3.14 in ["3.14","2.71"] → 3.14', () => expect(toEnum(3.14, ['3.14', '2.71'])).toBe(3.14));
    it('42 in ["42"] → 42', () => expect(toEnum(42, ['42'])).toBe(42));
    it('100 in ["99","100","101"] → 100', () => expect(toEnum(100, ['99', '100', '101'])).toBe(100));
  });

  describe('boolean value → returns same boolean', () => {
    it('true in ["true","false"] → true', () => expect(toEnum(true, BOOLEANS)).toBe(true));
    it('false in ["true","false"] → false', () => expect(toEnum(false, BOOLEANS)).toBe(false));
    it('true in ["true"] single option → true', () => expect(toEnum(true, ['true'])).toBe(true));
  });

  describe('value not in options throws ConvertError', () => {
    it('"yellow" not in COLORS throws', () => expect(() => toEnum('yellow', COLORS)).toThrow(ConvertError));
    it('"RED" wrong case throws (case-sensitive)', () => expect(() => toEnum('RED', COLORS)).toThrow(ConvertError));
    it('"Red" wrong case throws', () => expect(() => toEnum('Red', COLORS)).toThrow(ConvertError));
    it('"GREEN" wrong case throws', () => expect(() => toEnum('GREEN', COLORS)).toThrow(ConvertError));
    it('"red " trailing space throws (no trimming)', () => expect(() => toEnum('red ', COLORS)).toThrow(ConvertError));
    it('" red" leading space throws (no trimming)', () => expect(() => toEnum(' red', COLORS)).toThrow(ConvertError));
    it('"" not in COLORS throws', () => expect(() => toEnum('', COLORS)).toThrow(ConvertError));
    it('"blue2" not in COLORS throws', () => expect(() => toEnum('blue2', COLORS)).toThrow(ConvertError));
    it('number 4 not in ["1","2","3"] throws', () => expect(() => toEnum(4, ['1', '2', '3'])).toThrow(ConvertError));
    it('number 1.5 not in ["1","2"] throws', () => expect(() => toEnum(1.5, ['1', '2'])).toThrow(ConvertError));
    it('"only" not in single-option list ["other"] throws', () => expect(() => toEnum('only', ['other'])).toThrow(ConvertError));
    it('"true" not in ["yes","no"] throws', () => expect(() => toEnum('true', ['yes', 'no'])).toThrow(ConvertError));
    it('number 0 not in ["1","2","3"] throws', () => expect(() => toEnum(0, ['1', '2', '3'])).toThrow(ConvertError));
  });

  describe('empty options array always throws', () => {
    it('"red" with empty options throws', () => expect(() => toEnum('red', [])).toThrow(ConvertError));
    it('number 1 with empty options throws', () => expect(() => toEnum(1, [])).toThrow(ConvertError));
    it('true with empty options throws', () => expect(() => toEnum(true, [])).toThrow(ConvertError));
    it('"" with empty options throws', () => expect(() => toEnum('', [])).toThrow(ConvertError));
  });

  describe('null and undefined always throw ConvertError', () => {
    it('null throws', () => expect(() => toEnum(null, COLORS)).toThrow(ConvertError));
    it('undefined throws', () => expect(() => toEnum(undefined, COLORS)).toThrow(ConvertError));
    it('null with empty options throws', () => expect(() => toEnum(null, [])).toThrow(ConvertError));
    it('undefined with empty options throws', () => expect(() => toEnum(undefined, [])).toThrow(ConvertError));
  });

  describe('invalid types throw ConvertError', () => {
    it('plain object {} throws', () => expect(() => toEnum({}, COLORS)).toThrow(ConvertError));
    it('array [] throws', () => expect(() => toEnum([], COLORS)).toThrow(ConvertError));
    it('array ["red"] throws even if "red" is in options', () => expect(() => toEnum(['red'], COLORS)).toThrow(ConvertError));
    it('Date instance throws', () => expect(() => toEnum(new Date(), COLORS)).toThrow(ConvertError));
    it('function throws', () => expect(() => toEnum(() => {}, COLORS)).toThrow(ConvertError));
    it('symbol throws', () => expect(() => toEnum(Symbol('x'), COLORS)).toThrow(ConvertError));
  });

  describe('error message content', () => {
    it('"yellow" not in COLORS error quotes "yellow"', () => expect(() => toEnum('yellow', COLORS)).toThrow(/yellow/));
    it('null error mentions "null/undefined"', () => expect(() => toEnum(null, COLORS)).toThrow(/null\/undefined/));
    it('undefined error mentions "null/undefined"', () => expect(() => toEnum(undefined, COLORS)).toThrow(/null\/undefined/));
    it('object error mentions type', () => expect(() => toEnum({}, COLORS)).toThrow(/object/));
    it('symbol error mentions type', () => expect(() => toEnum(Symbol('x'), COLORS)).toThrow(/symbol/));
    it('function error mentions type', () => expect(() => toEnum(() => {}, COLORS)).toThrow(/function/));
    it('wrong case error says "not a valid enum option"', () => {
      expect(() => toEnum('RED', COLORS)).toThrow(/not a valid enum option/);
    });
  });

  describe('return type matches input type', () => {
    it('string input returns string', () => expect(typeof toEnum('red', COLORS)).toBe('string'));
    it('number input returns number', () => expect(typeof toEnum(1, ['1', '2'])).toBe('number'));
    it('boolean input returns boolean', () => expect(typeof toEnum(true, ['true', 'false'])).toBe('boolean'));
  });

  describe('BigInt throws ConvertError', () => {
    it('BigInt(0) throws', () => expect(() => toEnum(BigInt(0), ['0'])).toThrow(ConvertError));
    it('BigInt(1) throws even when "1" is in options', () => expect(() => toEnum(BigInt(1), ['1', '2', '3'])).toThrow(ConvertError));
    it('BigInt error mentions "bigint" type', () => expect(() => toEnum(BigInt(1), ['1'])).toThrow(/bigint/));
  });

  describe('Promise throws ConvertError', () => {
    it('Promise.resolve("red") throws (not a primitive)', () => {
      expect(() => toEnum(Promise.resolve('red'), COLORS)).toThrow(ConvertError);
    });
    it('new Promise(() => {}) throws', () => expect(() => toEnum(new Promise(() => {}), COLORS)).toThrow(ConvertError));
    it('Promise error mentions "object" type', () => expect(() => toEnum(Promise.resolve('red'), COLORS)).toThrow(/object/));
  });

  describe('function types throw ConvertError', () => {
    it('arrow function throws', () => expect(() => toEnum(() => 'red', COLORS)).toThrow(ConvertError));
    it('regular function throws', () => expect(() => toEnum(function foo() {}, COLORS)).toThrow(ConvertError));
    it('async function throws', () => expect(() => toEnum(async () => 'red', COLORS)).toThrow(ConvertError));
    it('generator function throws', () => expect(() => toEnum(function* () { yield 'red'; }, COLORS)).toThrow(ConvertError));
    it('generator object throws', () => {
      function* gen() { yield 'red'; }
      expect(() => toEnum(gen(), COLORS)).toThrow(ConvertError);
    });
    it('function error mentions "function" type', () => expect(() => toEnum(() => {}, COLORS)).toThrow(/function/));
  });

  describe('RegExp throws ConvertError', () => {
    it('/red/ throws', () => expect(() => toEnum(/red/, COLORS)).toThrow(ConvertError));
    it('new RegExp("red") throws', () => expect(() => toEnum(new RegExp('red'), COLORS)).toThrow(ConvertError));
    it('RegExp error mentions "object" type', () => expect(() => toEnum(/red/, COLORS)).toThrow(/object/));
  });

  describe('Map / Set throw ConvertError', () => {
    it('empty Map throws', () => expect(() => toEnum(new Map(), COLORS)).toThrow(ConvertError));
    it('Map with entries throws', () => expect(() => toEnum(new Map([['color', 'red']]), COLORS)).toThrow(ConvertError));
    it('empty Set throws', () => expect(() => toEnum(new Set(), COLORS)).toThrow(ConvertError));
    it('Set with valid values throws (Set is not a string/number/boolean)', () => {
      expect(() => toEnum(new Set(['red', 'green']), COLORS)).toThrow(ConvertError);
    });
    it('WeakMap throws', () => expect(() => toEnum(new WeakMap(), COLORS)).toThrow(ConvertError));
    it('WeakSet throws', () => expect(() => toEnum(new WeakSet(), COLORS)).toThrow(ConvertError));
  });

  describe('Error instances throw ConvertError', () => {
    it('new Error("red") throws', () => expect(() => toEnum(new Error('red'), COLORS)).toThrow(ConvertError));
    it('new TypeError throws', () => expect(() => toEnum(new TypeError('x'), COLORS)).toThrow(ConvertError));
  });

  describe('TypedArrays throw ConvertError', () => {
    it('Uint8Array([1]) throws', () => expect(() => toEnum(new Uint8Array([1]), ['1'])).toThrow(ConvertError));
    it('Int32Array([0]) throws', () => expect(() => toEnum(new Int32Array([0]), ['0'])).toThrow(ConvertError));
    it('ArrayBuffer throws', () => expect(() => toEnum(new ArrayBuffer(4), COLORS)).toThrow(ConvertError));
  });

  describe('class instances throw ConvertError', () => {
    it('class with no props throws', () => {
      class Empty {}
      expect(() => toEnum(new Empty(), COLORS)).toThrow(ConvertError);
    });
    it('class with string prop throws (the instance itself is not a string)', () => {
      class Color { constructor(public name: string) {} }
      expect(() => toEnum(new Color('red'), COLORS)).toThrow(ConvertError);
    });
  });

  describe('Symbol throws ConvertError', () => {
    it('Symbol("red") throws', () => expect(() => toEnum(Symbol('red'), COLORS)).toThrow(ConvertError));
    it('Symbol() throws', () => expect(() => toEnum(Symbol(), COLORS)).toThrow(ConvertError));
    it('Symbol.for("red") throws', () => expect(() => toEnum(Symbol.for('red'), COLORS)).toThrow(ConvertError));
    it('Symbol error mentions "symbol" type', () => expect(() => toEnum(Symbol('x'), COLORS)).toThrow(/symbol/));
  });

  describe('exact error message text', () => {
    function getMsg(fn: () => void): string {
      try { fn(); } catch (e) { return (e as Error).message; }
      throw new Error('Expected to throw');
    }

    // null/undefined → hardcoded message
    it('null → "Cannot convert null/undefined to enum"', () =>
      expect(getMsg(() => toEnum(null, COLORS))).toBe('Cannot convert null/undefined to enum'));
    it('undefined → "Cannot convert null/undefined to enum"', () =>
      expect(getMsg(() => toEnum(undefined, COLORS))).toBe('Cannot convert null/undefined to enum'));

    // Invalid type → Cannot convert ${typeof v} to enum
    it('{} → "Cannot convert object to enum"', () =>
      expect(getMsg(() => toEnum({}, COLORS))).toBe('Cannot convert object to enum'));
    it('[] → "Cannot convert object to enum" (typeof [] === "object")', () =>
      expect(getMsg(() => toEnum([], COLORS))).toBe('Cannot convert object to enum'));
    it('new Map() → "Cannot convert object to enum"', () =>
      expect(getMsg(() => toEnum(new Map(), COLORS))).toBe('Cannot convert object to enum'));
    it('new Date() → "Cannot convert object to enum"', () =>
      expect(getMsg(() => toEnum(new Date(), COLORS))).toBe('Cannot convert object to enum'));
    it('new Error("x") → "Cannot convert object to enum"', () =>
      expect(getMsg(() => toEnum(new Error('x'), COLORS))).toBe('Cannot convert object to enum'));
    it('() => {} → "Cannot convert function to enum"', () =>
      expect(getMsg(() => toEnum(() => {}, COLORS))).toBe('Cannot convert function to enum'));
    it('async () => {} → "Cannot convert function to enum"', () =>
      expect(getMsg(() => toEnum(async () => {}, COLORS))).toBe('Cannot convert function to enum'));
    it('Symbol("x") → "Cannot convert symbol to enum"', () =>
      expect(getMsg(() => toEnum(Symbol('x'), COLORS))).toBe('Cannot convert symbol to enum'));
    it('BigInt(1) → "Cannot convert bigint to enum"', () =>
      expect(getMsg(() => toEnum(BigInt(1), COLORS))).toBe('Cannot convert bigint to enum'));
    it('new Promise(() => {}) → "Cannot convert object to enum"', () =>
      expect(getMsg(() => toEnum(new Promise(() => {}), COLORS))).toBe('Cannot convert object to enum'));
    it('new Uint8Array() → "Cannot convert object to enum"', () =>
      expect(getMsg(() => toEnum(new Uint8Array(), COLORS))).toBe('Cannot convert object to enum'));

    // Value not in options → "${str}" is not a valid enum option
    it('"yellow" not in COLORS → \'"yellow" is not a valid enum option\'', () =>
      expect(getMsg(() => toEnum('yellow', COLORS))).toBe('"yellow" is not a valid enum option'));
    it('"RED" wrong case → \'"RED" is not a valid enum option\'', () =>
      expect(getMsg(() => toEnum('RED', COLORS))).toBe('"RED" is not a valid enum option'));
    it('"" not in COLORS → \'"" is not a valid enum option\'', () =>
      expect(getMsg(() => toEnum('', COLORS))).toBe('"" is not a valid enum option'));
    it('"red " trailing space → \'"red " is not a valid enum option\'', () =>
      expect(getMsg(() => toEnum('red ', COLORS))).toBe('"red " is not a valid enum option'));
    it('" red" leading space → \'" red" is not a valid enum option\'', () =>
      expect(getMsg(() => toEnum(' red', COLORS))).toBe('" red" is not a valid enum option'));

    // Number not in options → String(v) is used for the message
    it('number 4 not in ["1","2","3"] → \'"4" is not a valid enum option\'', () =>
      expect(getMsg(() => toEnum(4, ['1', '2', '3']))).toBe('"4" is not a valid enum option'));
    it('number 0 not in ["1","2"] → \'"0" is not a valid enum option\'', () =>
      expect(getMsg(() => toEnum(0, ['1', '2']))).toBe('"0" is not a valid enum option'));
    it('number 3.14 not in ["1"] → \'"3.14" is not a valid enum option\'', () =>
      expect(getMsg(() => toEnum(3.14, ['1']))).toBe('"3.14" is not a valid enum option'));

    // Boolean not in options
    it('true not in ["false"] → \'"true" is not a valid enum option\'', () =>
      expect(getMsg(() => toEnum(true, ['false']))).toBe('"true" is not a valid enum option'));
    it('false not in ["true"] → \'"false" is not a valid enum option\'', () =>
      expect(getMsg(() => toEnum(false, ['true']))).toBe('"false" is not a valid enum option'));

    // Empty options list
    it('"red" with [] → \'"red" is not a valid enum option\'', () =>
      expect(getMsg(() => toEnum('red', []))).toBe('"red" is not a valid enum option'));
    it('1 with [] → \'"1" is not a valid enum option\'', () =>
      expect(getMsg(() => toEnum(1, []))).toBe('"1" is not a valid enum option'));
  });
});
