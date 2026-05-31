import { describe, expect, it } from '@jest/globals';
import { ConvertError, toString, toInteger, toFloat, toBoolean, toDate, toJson, toArray, toEnum } from '../../convert';

describe('ConvertError', () => {
  describe('inheritance and identity', () => {
    it('is an instance of Error', () => expect(new ConvertError('x')).toBeInstanceOf(Error));
    it('is an instance of ConvertError', () => expect(new ConvertError('x')).toBeInstanceOf(ConvertError));
    it('has name "ConvertError"', () => expect(new ConvertError('x').name).toBe('ConvertError'));
    it('can be constructed with any message', () => {
      expect(new ConvertError('hello world').message).toBe('hello world');
    });
    it('empty message is valid', () => expect(new ConvertError('').message).toBe(''));
    it('long message is valid', () => {
      const msg = 'x'.repeat(1000);
      expect(new ConvertError(msg).message).toBe(msg);
    });
    it('instanceof check works in catch block', () => {
      let caught: unknown;
      try {
        toInteger('abc');
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(ConvertError);
      expect(caught).toBeInstanceOf(Error);
    });
  });

  describe('can be caught as Error', () => {
    it('toString throws a ConvertError catchable as Error', () => {
      let err: Error | undefined;
      try {
        toString(null as unknown as string);
      } catch (e) {
        err = e as Error;
      }
      expect(err).toBeInstanceOf(Error);
      expect(err?.name).toBe('ConvertError');
    });
  });

  describe('error message content for each converter', () => {
    it('toString invalid type includes type name', () => {
      let msg = '';
      try { toString(null as unknown as string); } catch (e) { msg = (e as Error).message; }
      expect(msg).toContain('object');
    });

    it('toInteger invalid string includes the value', () => {
      let msg = '';
      try { toInteger('abc'); } catch (e) { msg = (e as Error).message; }
      expect(msg).toContain('abc');
    });

    it('toInteger float number includes the value', () => {
      let msg = '';
      try { toInteger(3.14); } catch (e) { msg = (e as Error).message; }
      expect(msg).toContain('3.14');
    });

    it('toFloat empty string has specific message', () => {
      let msg = '';
      try { toFloat(''); } catch (e) { msg = (e as Error).message; }
      expect(msg).toBe('Cannot convert "" to float');
    });

    it('toFloat invalid string includes the value', () => {
      let msg = '';
      try { toFloat('abc'); } catch (e) { msg = (e as Error).message; }
      expect(msg).toContain('abc');
    });

    it('toBoolean invalid uses JSON.stringify', () => {
      let msg = '';
      try { toBoolean({ a: 1 } as unknown as boolean); } catch (e) { msg = (e as Error).message; }
      expect(msg).toContain('{"a":1}');
    });

    it('toDate invalid Date object says "Invalid Date object"', () => {
      let msg = '';
      try { toDate(new Date('bad')); } catch (e) { msg = (e as Error).message; }
      expect(msg).toBe('Invalid Date object');
    });

    it('toDate invalid string quotes the value', () => {
      let msg = '';
      try { toDate('not-a-date'); } catch (e) { msg = (e as Error).message; }
      expect(msg).toContain('not-a-date');
    });

    it('toJson string error says "Cannot convert string to JSON object"', () => {
      let msg = '';
      try { toJson('hello'); } catch (e) { msg = (e as Error).message; }
      expect(msg).toBe('Cannot convert string to JSON object');
    });

    it('toJson null error says "Cannot convert null to JSON object"', () => {
      let msg = '';
      try { toJson(null); } catch (e) { msg = (e as Error).message; }
      expect(msg).toBe('Cannot convert null to JSON object');
    });

    it('toArray invalid string quotes the value', () => {
      let msg = '';
      try { toArray('hello'); } catch (e) { msg = (e as Error).message; }
      expect(msg).toContain('hello');
    });

    it('toEnum null/undefined has specific message', () => {
      let msg = '';
      try { toEnum(null, ['a']); } catch (e) { msg = (e as Error).message; }
      expect(msg).toBe('Cannot convert null/undefined to enum');
    });

    it('toEnum invalid type mentions type', () => {
      let msg = '';
      try { toEnum({} as unknown as string, ['a']); } catch (e) { msg = (e as Error).message; }
      expect(msg).toContain('object');
    });

    it('toEnum value not in options quotes the value', () => {
      let msg = '';
      try { toEnum('yellow', ['red', 'blue']); } catch (e) { msg = (e as Error).message; }
      expect(msg).toContain('yellow');
      expect(msg).toContain('not a valid enum option');
    });
  });

  describe('stack trace is available', () => {
    it('ConvertError has a stack property', () => {
      const err = new ConvertError('test');
      expect(err.stack).toBeDefined();
    });
    it('stack trace includes ConvertError', () => {
      const err = new ConvertError('test');
      expect(err.stack).toContain('ConvertError');
    });
  });

  describe('every converter produces ConvertError (not generic Error)', () => {
    const cases: Array<[string, () => unknown]> = [
      ['toString(null)', () => toString(null as unknown as string)],
      ['toInteger(NaN)', () => toInteger(NaN)],
      ['toInteger("abc")', () => toInteger('abc')],
      ['toFloat(NaN)', () => toFloat(NaN)],
      ['toFloat("")', () => toFloat('')],
      ['toFloat("abc")', () => toFloat('abc')],
      ['toFloat(null)', () => toFloat(null as unknown as number)],
      ['toBoolean(2)', () => toBoolean(2 as unknown as boolean)],
      ['toBoolean(null)', () => toBoolean(null as unknown as boolean)],
      ['toDate("bad")', () => toDate('bad')],
      ['toDate(new Date("bad"))', () => toDate(new Date('bad'))],
      ['toDate(null)', () => toDate(null as unknown as string)],
      ['toJson(null)', () => toJson(null)],
      ['toJson("hello")', () => toJson('hello')],
      ['toJson({})', () => toJson({})],
      ['toArray("hello")', () => toArray('hello')],
      ['toArray(null)', () => toArray(null)],
      ['toArray(42)', () => toArray(42)],
      ['toEnum(null, [])', () => toEnum(null, [])],
      ['toEnum({}, ["a"])', () => toEnum({} as unknown as string, ['a'])],
      ['toEnum("x", ["a"])', () => toEnum('x', ['a'])],
    ];

    it.each(cases)('%s throws ConvertError', (_label, fn) => {
      expect(fn).toThrow(ConvertError);
    });
  });
});
