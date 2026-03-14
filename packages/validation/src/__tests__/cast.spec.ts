import { describe, expect, it } from '@jest/globals';
import {
  canBeBoolean,
  canBeDate,
  canBeFloat,
  canBeInteger,
  canBeJson,
  canBeString,
  CastError,
} from '../cast';

// ─── canBeBoolean ─────────────────────────────────────────────────────────────

describe('canBeBoolean', () => {
  describe('boolean input — returned as-is', () => {
    it('true → true', () => expect(canBeBoolean(true)).toBe(true));
    it('false → false', () => expect(canBeBoolean(false)).toBe(false));
  });

  describe('number input', () => {
    it('1 → true', () => expect(canBeBoolean(1)).toBe(true));
    it('0 → false', () => expect(canBeBoolean(0)).toBe(false));
    it('2 throws', () => expect(() => canBeBoolean(2)).toThrow(CastError));
    it('-1 throws', () => expect(() => canBeBoolean(-1)).toThrow(CastError));
  });

  describe('string input via WASM (case-insensitive)', () => {
    it.each(['true', 'TRUE', 'True', '1', 'yes', 'YES', 'on', 'ON'])('"%s" → true', (s) => {
      expect(canBeBoolean(s)).toBe(true);
    });
    it.each(['false', 'FALSE', 'False', '0', 'no', 'NO', 'off', 'OFF'])('"%s" → false', (s) => {
      expect(canBeBoolean(s)).toBe(false);
    });
    it('whitespace-padded "  true  " → true', () => expect(canBeBoolean('  true  ')).toBe(true));
    it('"maybe" throws', () => expect(() => canBeBoolean('maybe')).toThrow(CastError));
    it('"2" throws', () => expect(() => canBeBoolean('2')).toThrow(CastError));
  });

  describe('unconvertible types throw CastError', () => {
    it('null throws', () => expect(() => canBeBoolean(null)).toThrow(CastError));
    it('undefined throws', () => expect(() => canBeBoolean(undefined)).toThrow(CastError));
    it('object throws', () => expect(() => canBeBoolean({})).toThrow(CastError));
    it('array throws', () => expect(() => canBeBoolean([])).toThrow(CastError));
  });
});

// ─── canBeInteger ─────────────────────────────────────────────────────────────

describe('canBeInteger', () => {
  describe('integer number — returned as-is', () => {
    it('42 → 42', () => expect(canBeInteger(42)).toBe(42));
    it('-7 → -7', () => expect(canBeInteger(-7)).toBe(-7));
    it('0 → 0', () => expect(canBeInteger(0)).toBe(0));
    it('Number.MAX_SAFE_INTEGER', () =>
      expect(canBeInteger(Number.MAX_SAFE_INTEGER)).toBe(Number.MAX_SAFE_INTEGER));
  });

  describe('float number throws', () => {
    it('3.14 throws', () => expect(() => canBeInteger(3.14)).toThrow(CastError));
    it('0.1 throws', () => expect(() => canBeInteger(0.1)).toThrow(CastError));
    it('NaN throws', () => expect(() => canBeInteger(NaN)).toThrow(CastError));
    it('Infinity throws', () => expect(() => canBeInteger(Infinity)).toThrow(CastError));
  });

  describe('string input via WASM', () => {
    it('"42" → 42', () => expect(canBeInteger('42')).toBe(42));
    it('"-7" → -7', () => expect(canBeInteger('-7')).toBe(-7));
    it('"  10  " → 10 (trims whitespace)', () => expect(canBeInteger('  10  ')).toBe(10));
    it('"3.14" throws', () => expect(() => canBeInteger('3.14')).toThrow(CastError));
    it('"hello" throws', () => expect(() => canBeInteger('hello')).toThrow(CastError));
    it('"" throws', () => expect(() => canBeInteger('')).toThrow(CastError));
  });

  describe('boolean input', () => {
    it('true → 1', () => expect(canBeInteger(true)).toBe(1));
    it('false → 0', () => expect(canBeInteger(false)).toBe(0));
  });

  describe('unconvertible types throw CastError', () => {
    it('null throws', () => expect(() => canBeInteger(null)).toThrow(CastError));
    it('undefined throws', () => expect(() => canBeInteger(undefined)).toThrow(CastError));
    it('object throws', () => expect(() => canBeInteger({})).toThrow(CastError));
  });
});

// ─── canBeFloat ───────────────────────────────────────────────────────────────

describe('canBeFloat', () => {
  describe('finite number — returned as-is', () => {
    it('3.14 → 3.14', () => expect(canBeFloat(3.14)).toBe(3.14));
    it('42 → 42', () => expect(canBeFloat(42)).toBe(42));
    it('-0.5 → -0.5', () => expect(canBeFloat(-0.5)).toBe(-0.5));
    it('0 → 0', () => expect(canBeFloat(0)).toBe(0));
  });

  describe('non-finite number throws', () => {
    it('NaN throws', () => expect(() => canBeFloat(NaN)).toThrow(CastError));
    it('Infinity throws', () => expect(() => canBeFloat(Infinity)).toThrow(CastError));
    it('-Infinity throws', () => expect(() => canBeFloat(-Infinity)).toThrow(CastError));
  });

  describe('string input via WASM', () => {
    it('"3.14" → 3.14', () => expect(canBeFloat('3.14')).toBe(3.14));
    it('"42" → 42', () => expect(canBeFloat('42')).toBe(42));
    it('"  -1.5  " → -1.5 (trims)', () => expect(canBeFloat('  -1.5  ')).toBe(-1.5));
    it('"hello" throws', () => expect(() => canBeFloat('hello')).toThrow(CastError));
    it('"" throws', () => expect(() => canBeFloat('')).toThrow(CastError));
    it('"Infinity" throws', () => expect(() => canBeFloat('Infinity')).toThrow(CastError));
  });

  describe('boolean input', () => {
    it('true → 1', () => expect(canBeFloat(true)).toBe(1));
    it('false → 0', () => expect(canBeFloat(false)).toBe(0));
  });

  describe('unconvertible types throw CastError', () => {
    it('null throws', () => expect(() => canBeFloat(null)).toThrow(CastError));
    it('undefined throws', () => expect(() => canBeFloat(undefined)).toThrow(CastError));
    it('object throws', () => expect(() => canBeFloat({})).toThrow(CastError));
  });
});

// ─── canBeString ──────────────────────────────────────────────────────────────

describe('canBeString', () => {
  describe('string — returned as-is', () => {
    it('"hello" → "hello"', () => expect(canBeString('hello')).toBe('hello'));
    it('"" → ""', () => expect(canBeString('')).toBe(''));
  });

  describe('number input', () => {
    it('42 → "42"', () => expect(canBeString(42)).toBe('42'));
    it('3.14 → "3.14"', () => expect(canBeString(3.14)).toBe('3.14'));
    it('-0 → "0"', () => expect(canBeString(-0)).toBe('0'));
    it('NaN throws', () => expect(() => canBeString(NaN)).toThrow(CastError));
    it('Infinity throws', () => expect(() => canBeString(Infinity)).toThrow(CastError));
  });

  describe('boolean input', () => {
    it('true → "true"', () => expect(canBeString(true)).toBe('true'));
    it('false → "false"', () => expect(canBeString(false)).toBe('false'));
  });

  describe('bigint input', () => {
    it('BigInt(42) → "42"', () => expect(canBeString(BigInt(42))).toBe('42'));
    it('BigInt(-100) → "-100"', () => expect(canBeString(BigInt(-100))).toBe('-100'));
  });

  describe('unconvertible types throw CastError', () => {
    it('null throws', () => expect(() => canBeString(null)).toThrow(CastError));
    it('undefined throws', () => expect(() => canBeString(undefined)).toThrow(CastError));
    it('object throws', () => expect(() => canBeString({})).toThrow(CastError));
    it('array throws', () => expect(() => canBeString([])).toThrow(CastError));
  });
});

// ─── canBeDate ────────────────────────────────────────────────────────────────

describe('canBeDate', () => {
  describe('Date input', () => {
    it('valid Date → returns Date with same timestamp', () => {
      const d = new Date('2024-01-15');
      expect(canBeDate(d).getTime()).toBe(d.getTime());
    });
    it('Invalid Date throws', () => {
      expect(() => canBeDate(new Date('not a date'))).toThrow(CastError);
    });
  });

  describe('string input via WASM (ISO 8601)', () => {
    it('"2024-01-15" → Date', () => {
      const d = canBeDate('2024-01-15');
      expect(d).toBeInstanceOf(Date);
      expect(d.getUTCFullYear()).toBe(2024);
      expect(d.getUTCMonth()).toBe(0); // January = 0
      expect(d.getUTCDate()).toBe(15);
    });
    it('"2000-12-31" → Date', () => {
      const d = canBeDate('2000-12-31');
      expect(d).toBeInstanceOf(Date);
      expect(d.getUTCFullYear()).toBe(2000);
    });
    it('"2024-06-15T12:30:00Z" → Date with time', () => {
      const d = canBeDate('2024-06-15T12:30:00Z');
      expect(d).toBeInstanceOf(Date);
      expect(d.getUTCHours()).toBe(12);
      expect(d.getUTCMinutes()).toBe(30);
    });
    it('"not-a-date" throws', () => expect(() => canBeDate('not-a-date')).toThrow(CastError));
    it('"2024-13-01" (invalid month) throws', () =>
      expect(() => canBeDate('2024-13-01')).toThrow(CastError));
    it('"2024-00-01" (invalid month) throws', () =>
      expect(() => canBeDate('2024-00-01')).toThrow(CastError));
  });

  describe('number input (Unix ms timestamp)', () => {
    it('valid timestamp → Date', () => {
      const ts = new Date('2024-01-15').getTime();
      const d = canBeDate(ts);
      expect(d).toBeInstanceOf(Date);
      expect(d.getTime()).toBe(ts);
    });
    it('0 → epoch Date', () => {
      const d = canBeDate(0);
      expect(d.getUTCFullYear()).toBe(1970);
    });
    it('Infinity throws', () => expect(() => canBeDate(Infinity)).toThrow(CastError));
    it('NaN throws', () => expect(() => canBeDate(NaN)).toThrow(CastError));
  });

  describe('unconvertible types throw CastError', () => {
    it('null throws', () => expect(() => canBeDate(null)).toThrow(CastError));
    it('undefined throws', () => expect(() => canBeDate(undefined)).toThrow(CastError));
    it('boolean throws', () => expect(() => canBeDate(true)).toThrow(CastError));
    it('object throws', () => expect(() => canBeDate({})).toThrow(CastError));
  });
});

// ─── canBeJson ────────────────────────────────────────────────────────────────

describe('canBeJson', () => {
  describe('string input — validated via WASM and parsed', () => {
    it('"{\\"key\\":1}" → { key: 1 }', () => expect(canBeJson('{"key":1}')).toEqual({ key: 1 }));
    it('"[1,2,3]" → [1,2,3]', () => expect(canBeJson('[1,2,3]')).toEqual([1, 2, 3]));
    it('"42" → 42', () => expect(canBeJson('42')).toBe(42));
    it('"true" → true', () => expect(canBeJson('true')).toBe(true));
    it('"null" → null', () => expect(canBeJson('null')).toBeNull());
    it('"\\"hello\\"" → "hello"', () => expect(canBeJson('"hello"')).toBe('hello'));
    it('"not json" throws', () => expect(() => canBeJson('not json')).toThrow(CastError));
    it('"{unclosed" throws', () => expect(() => canBeJson('{unclosed')).toThrow(CastError));
  });

  describe('object/array input — returned as-is', () => {
    it('object → returned as-is', () => {
      const o = { a: 1 };
      expect(canBeJson(o)).toBe(o);
    });
    it('array → returned as-is', () => {
      const a = [1, 2];
      expect(canBeJson(a)).toBe(a);
    });
    it('null → null', () => expect(canBeJson(null)).toBeNull());
  });

  describe('primitive inputs — returned as-is', () => {
    it('number → returned as-is', () => expect(canBeJson(42)).toBe(42));
    it('boolean → returned as-is', () => expect(canBeJson(true)).toBe(true));
  });

  describe('unconvertible types throw CastError', () => {
    it('undefined throws', () => expect(() => canBeJson(undefined)).toThrow(CastError));
    it('function throws', () => expect(() => canBeJson(() => {})).toThrow(CastError));
    it('symbol throws', () => expect(() => canBeJson(Symbol())).toThrow(CastError));
  });
});

// ─── CastError identity ───────────────────────────────────────────────────────

describe('CastError', () => {
  it('is an instance of Error', () => {
    expect(new CastError('x')).toBeInstanceOf(Error);
  });

  it('has name "CastError"', () => {
    expect(new CastError('x').name).toBe('CastError');
  });

  it('thrown errors contain a descriptive message', () => {
    const err = (() => {
      try {
        canBeBoolean('maybe');
      } catch (e) {
        return e;
      }
    })();
    expect(err).toBeInstanceOf(CastError);
    expect((err as CastError).message).toContain('maybe');
  });
});
