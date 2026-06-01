import assert from 'assert';
import assertString from '../../src/validators/util/assertString';
import tryToString from '../../src/validators/util/tryToString';
import { toString, ConvertError } from '../../src/convert';

describe('toString (convert module)', () => {
  it('keeps strings as-is', () => {
    assert.strictEqual(toString('hello'), 'hello');
    assert.strictEqual(toString(''), '');
  });

  it('converts finite numbers to string', () => {
    assert.strictEqual(toString(42), '42');
    assert.strictEqual(toString(0), '0');
    assert.strictEqual(toString(3.14), '3.14');
  });

  it('converts booleans to string', () => {
    assert.strictEqual(toString(true), 'true');
    assert.strictEqual(toString(false), 'false');
  });

  it('throws ConvertError for null', () => {
    assert.throws(() => toString(null), ConvertError);
  });

  it('throws ConvertError for undefined', () => {
    assert.throws(() => toString(undefined), ConvertError);
  });

  it('throws ConvertError for NaN', () => {
    assert.throws(() => toString(NaN), ConvertError);
  });

  it('throws ConvertError for plain object', () => {
    assert.throws(() => toString({}), ConvertError);
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
