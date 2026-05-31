/**
 * All tests that tests any utility.
 * Prevent any breaking of functionality
 */
import assert from 'assert';
import assertString from '../../src/validators/util/assertString';
import toString from '../../src/validators/util/toString';

describe('toString util', () => {
  it('converts null to empty string', () => {
    assert.strictEqual(toString(null), '');
  });

  it('converts undefined to empty string', () => {
    assert.strictEqual(toString(undefined), '');
  });

  it('converts NaN to empty string', () => {
    assert.strictEqual(toString(NaN), '');
  });

  it('converts plain object to [object Object]', () => {
    assert.strictEqual(toString({}), '[object Object]');
  });

  it('uses custom toString method on objects', () => {
    assert.strictEqual(toString({ toString: () => 'custom' }), 'custom');
  });

  it('keeps strings as-is', () => {
    assert.strictEqual(toString('hello'), 'hello');
    assert.strictEqual(toString(''), '');
  });

  it('converts numbers to string', () => {
    assert.strictEqual(toString(42), '42');
    assert.strictEqual(toString(0), '0');
    assert.strictEqual(toString(3.14), '3.14');
  });

  it('converts booleans to string', () => {
    assert.strictEqual(toString(true), 'true');
    assert.strictEqual(toString(false), 'false');
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
