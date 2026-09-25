import assert from 'assert';
import { assertString } from '../../../src/validators/util/assertString';

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
