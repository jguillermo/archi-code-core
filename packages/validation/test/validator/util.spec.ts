import assert from 'assert';
import assertString from '../../src/validators/util/assertString';
import tryToString from '../../src/validators/util/tryToString';
import { toString, ConvertMessages } from '../../src/convert';

describe('toString (convert module)', () => {
  it('keeps strings as-is', () => {
    assert.deepStrictEqual(toString('hello'), { ok: true, value: 'hello', error: null });
    assert.deepStrictEqual(toString(''), { ok: true, value: '', error: null });
  });

  it('converts finite numbers to string', () => {
    assert.deepStrictEqual(toString(42), { ok: true, value: '42', error: null });
    assert.deepStrictEqual(toString(0), { ok: true, value: '0', error: null });
    assert.deepStrictEqual(toString(3.14), { ok: true, value: '3.14', error: null });
  });

  it('converts booleans to string', () => {
    assert.deepStrictEqual(toString(true), { ok: true, value: 'true', error: null });
    assert.deepStrictEqual(toString(false), { ok: true, value: 'false', error: null });
  });

  it.each([[null], [undefined], [NaN], [{}]])('%p → { ok: false, error }', (v) => {
    assert.deepStrictEqual(toString(v), { ok: false, value: null, error: ConvertMessages.STRING });
  });
});

describe('tryToString', () => {
  it('returns string for string input', () => {
    assert.strictEqual(tryToString('hello'), 'hello');
    assert.strictEqual(tryToString(''), '');
  });

  it('returns string for boolean input', () => {
    assert.strictEqual(tryToString(true), 'true');
    assert.strictEqual(tryToString(false), 'false');
  });

  it('returns string for finite number', () => {
    assert.strictEqual(tryToString(42), '42');
    assert.strictEqual(tryToString(0), '0');
    assert.strictEqual(tryToString(3.14), '3.14');
  });

  it('returns false for null', () => assert.strictEqual(tryToString(null), false));
  it('returns false for undefined', () => assert.strictEqual(tryToString(undefined), false));
  it('returns false for NaN', () => assert.strictEqual(tryToString(NaN), false));
  it('returns false for Infinity', () => assert.strictEqual(tryToString(Infinity), false));
  it('returns false for objects', () => assert.strictEqual(tryToString({}), false));
  it('returns false for arrays', () => assert.strictEqual(tryToString([]), false));
  it('returns false for Symbol', () => assert.strictEqual(tryToString(Symbol('x')), false));

  it('never throws', () => {
    assert.doesNotThrow(() => tryToString(null));
    assert.doesNotThrow(() => tryToString({}));
    assert.doesNotThrow(() => tryToString(Symbol()));
  });
});

describe('assertString', () => {
  it('Should throw an error if argument provided is an undefined', () => {
    assert.throws(() => {
      assertString();
    }, TypeError);
  });

  it('Should throw an error if argument provided is a null', () => {
    assert.throws(() => {
      assertString(null);
    }, TypeError);
  });

  it('Should throw an error if argument provided is a Boolean', () => {
    assert.throws(() => {
      assertString(true);
    }, TypeError);
  });

  it('Should throw an error if argument provided is a Date', () => {
    assert.throws(() => {
      assertString(new Date());
    }, TypeError);
  });

  it('Should throw an error if argument provided is a Number(NaN)', () => {
    assert.throws(() => {
      assertString(NaN);
    }, TypeError);
  });

  it('Should throw an error if argument provided is a Number', () => {
    assert.throws(() => {
      assertString(2024);
    }, TypeError);
  });

  it('Should throw an error if argument provided is an Object', () => {
    assert.throws(() => {
      assertString({});
    }, TypeError);
  });

  it('Should throw an error if argument provided is an Array', () => {
    assert.throws(() => {
      assertString([]);
    }, TypeError);
  });

  it('Should not throw an error if the argument is an empty string', () => {
    assert.doesNotThrow(() => {
      assertString('');
    });
  });

  it('Should not throw an error if the argument is a String', () => {
    assert.doesNotThrow(() => {
      assertString('antidisestablishmentarianism');
    });
  });
});
