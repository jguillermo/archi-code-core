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

// validate() returns numeric rule codes — locale does not affect the output.
// Use validateJson() if you need locale-aware string messages.

describe('locale', () => {
  it('returns failing rule code regardless of locale (en default)', () => {
    const errors = check('bad', 'isEmail');
    expect(errors).toEqual([C.isEmail]);
  });

  it('explicit en locale — same code', () => {
    const r = validate({
      locale: 'en',
      fields: [{ field: 'f', value: 'bad', validations: ['isEmail'] }],
    });
    expect(r.errors['f']).toEqual([C.isEmail]);
  });

  it('es locale — same code (locale does not affect codes)', () => {
    const r = validate({
      locale: 'es',
      fields: [{ field: 'f', value: 'bad', validations: ['isEmail'] }],
    });
    expect(r.errors['f']).toEqual([C.isEmail]);
  });

  it('locale applies to all fields — codes are consistent', () => {
    const r = validate({
      locale: 'es',
      fields: [
        { field: 'email', value: 'bad', validations: ['isEmail'] },
        { field: 'name', value: '', validations: ['isNotEmpty'] },
      ],
    });
    expect(r.errors.email).toEqual([C.isEmail]);
    expect(r.errors.name).toEqual([C.isNotEmpty]);
  });
});

describe('param rules return the correct code', () => {
  it('isMinLength failure returns code 1', () => {
    const errors = check('ab', ['isMinLength', 10]);
    expect(errors).toEqual([C.isMinLength]);
  });

  it('es locale isMinLength — same code', () => {
    const r = validate({
      locale: 'es',
      fields: [{ field: 'f', value: 'hi', validations: [['isMinLength', 5]] }],
    });
    expect(r.errors['f']).toEqual([C.isMinLength]);
  });

  it('isInRange failure returns code 21', () => {
    const errors = check(200, ['isInRange', 0, 100]);
    expect(errors).toEqual([C.isInRange]);
  });

  it('es locale isInRange — same code', () => {
    const r = validate({
      locale: 'es',
      fields: [{ field: 'f', value: 200, validations: [['isInRange', 0, 120]] }],
    });
    expect(r.errors['f']).toEqual([C.isInRange]);
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

  it('es locale + custom message — still returns code', () => {
    const r = validate({
      locale: 'es',
      fields: [
        {
          field: 'f',
          value: 'bad',
          validations: [{ rule: 'isEmail', message: 'Correo inválido' }],
        },
      ],
    });
    expect(r.errors['f']).toEqual([C.isEmail]);
  });

  it('custom message with params returns code', () => {
    const errors = check('hi', { rule: 'isMinLength', params: [10], message: 'Name too short' });
    expect(errors).toEqual([C.isMinLength]);
  });

  it('custom message on one field does not affect another', () => {
    const r = validate({
      fields: [
        { field: 'a', value: 'bad', validations: [{ rule: 'isEmail', message: 'Custom A' }] },
        { field: 'b', value: 'bad', validations: ['isEmail'] },
      ],
    });
    expect(r.errors['a']).toEqual([C.isEmail]);
    expect(r.errors['b']).toEqual([C.isEmail]);
  });
});
