import { describe, it, expect } from '@jest/globals';
import { validate } from '../../src/decorator/validate';
import { ValidationConfigError } from '../../src/helpers/errors';
import type { Validation } from '../../src/decorator/validations';

describe('validate', () => {
  it('returns an empty list when every validation passes', () => {
    expect(
      validate([{ validator: 'isInt', properties: { min: 2 } }, { validator: 'isPort' }], '80'),
    ).toEqual([]);
  });

  it('runs every validation even after one fails and reports each failure', () => {
    const calls: string[] = [];
    const errors = validate(
      [
        { validator: 'isInt', properties: { min: 2 } },
        { validator: 'isEmail' },
        { validator: 'tracked', fn: () => (calls.push('tracked'), true) },
        { validator: 'isEven', fn: (v) => Number(v) % 2 === 0, message: 'Must be even' },
      ],
      '1',
    );
    expect(calls).toEqual(['tracked']);
    expect(errors).toEqual([
      { validator: 'isInt', message: 'Value does not satisfy isInt' },
      { validator: 'isEmail', message: 'Value does not satisfy isEmail' },
      { validator: 'isEven', message: 'Must be even' },
    ]);
  });

  it('passes properties and options as the second and third arguments', () => {
    const list: Validation[] = [
      { validator: 'isMobilePhone', properties: 'es-ES', options: { strictMode: true } },
    ];
    expect(validate(list, '+34612345678')).toEqual([]);
    expect(validate(list, '612345678')).toEqual([
      {
        validator: 'isMobilePhone',
        message: 'Value does not satisfy isMobilePhone',
      },
    ]);
  });

  it('uses a default message for a custom validation without message', () => {
    expect(validate([{ validator: 'isAnswer', fn: (v) => v === 42 }], 1)).toEqual([
      { validator: 'isAnswer', message: 'Value does not satisfy isAnswer' },
    ]);
  });

  it('throws ValidationConfigError for an unknown validator without fn', () => {
    expect(() => validate([{ validator: 'isNothing' } as unknown as Validation], 'x')).toThrow(
      ValidationConfigError,
    );
    expect(() => validate([{ validator: 'isAlphaLocales' } as unknown as Validation], 'x')).toThrow(
      'Unknown validator "isAlphaLocales"',
    );
  });
});
