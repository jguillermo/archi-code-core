import { describe, expect, it } from '@jest/globals';
import { validate } from '../validators/validate';
import { check } from './helpers';

// Rule codes — must match RC in validate.ts
const C = {
  isNotEmpty: 0,
  isMinLength: 1,
  isInRange: 21,
  isEmail: 25,
  isStartsWith: 12,
} as const;

// createValidator() returns numeric rule codes — locale does not affect validation output.
// Use validateJson() if you need locale-aware string messages.

describe('locale', () => {
  it('returns failing rule code', () => {
    const errors = check('bad', 'isEmail');
    expect(errors).toEqual([C.isEmail]);
  });

  it('codes are consistent across multiple fields', () => {
    const r = validate(
      [
        { field: 'email', validations: ['isEmail'] },
        { field: 'name', validations: ['isNotEmpty'] },
      ],
      { email: 'bad', name: '' },
    );
    expect(r.errors.email).toEqual([C.isEmail]);
    expect(r.errors.name).toEqual([C.isNotEmpty]);
  });
});

describe('param rules return the correct code', () => {
  it('isMinLength failure returns code 1', () => {
    const errors = check('ab', ['isMinLength', 10]);
    expect(errors).toEqual([C.isMinLength]);
  });

  it('isInRange failure returns code 21', () => {
    const errors = check(200, ['isInRange', 0, 100]);
    expect(errors).toEqual([C.isInRange]);
  });

  it('isStartsWith failure returns code 12', () => {
    const errors = check('hello world', ['isStartsWith', 'foo']);
    expect(errors).toEqual([C.isStartsWith]);
  });
});

describe('custom messages — ignored, code is returned', () => {
  it('config rule with message returns the rule code', () => {
    const errors = check('bad', { rule: 'isEmail', message: 'Enter a valid email' });
    expect(errors).toEqual([C.isEmail]);
  });

  it('custom message with params returns code', () => {
    const errors = check('hi', { rule: 'isMinLength', params: [10], message: 'Name too short' });
    expect(errors).toEqual([C.isMinLength]);
  });

  it('custom message on one field does not affect another', () => {
    const r = validate(
      [
        { field: 'a', validations: [{ rule: 'isEmail', message: 'Custom A' }] },
        { field: 'b', validations: ['isEmail'] },
      ],
      { a: 'bad', b: 'bad' },
    );
    expect(r.errors['a']).toEqual([C.isEmail]);
    expect(r.errors['b']).toEqual([C.isEmail]);
  });
});
