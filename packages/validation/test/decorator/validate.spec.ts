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
        { custom: 'tracked', fn: () => (calls.push('tracked'), true) },
        { custom: 'isEven', fn: (v) => Number(v) % 2 === 0, message: 'Must be even' },
      ],
      '1',
    );
    expect(calls).toEqual(['tracked']);
    expect(errors).toEqual([
      { validator: 'isInt', message: 'Value does not satisfy isInt' },
      { validator: 'isEmail', message: 'Value does not satisfy isEmail' },
      { custom: 'isEven', message: 'Must be even' },
    ]);
  });

  it('passes properties to the validator as its options object', () => {
    const list: Validation[] = [
      { validator: 'isMobilePhone', properties: { locale: 'es-ES', strictMode: true } },
    ];
    expect(validate(list, '+34612345678')).toEqual([]);
    expect(validate(list, '612345678')).toEqual([
      { validator: 'isMobilePhone', message: 'Value does not satisfy isMobilePhone' },
    ]);
    expect(
      validate(
        [{ validator: 'isHash', properties: { algorithm: 'md5' } }],
        'd41d8cd98f00b204e9800998ecf8427e',
      ),
    ).toEqual([]);
  });

  it('uses a default message for a custom validation without message', () => {
    expect(validate([{ custom: 'isAnswer', fn: (v) => v === 42 }], 1)).toEqual([
      { custom: 'isAnswer', message: 'Value does not satisfy isAnswer' },
    ]);
  });

  it('runs a built-in and a custom with the same name, each with its own error', () => {
    expect(validate([{ validator: 'isInt' }, { custom: 'isInt', fn: () => false }], 'x')).toEqual([
      { validator: 'isInt', message: 'Value does not satisfy isInt' },
      { custom: 'isInt', message: 'Value does not satisfy isInt' },
    ]);
  });

  it('throws ValidationConfigError for an unknown validator', () => {
    expect(() => validate([{ validator: 'isNothing' } as unknown as Validation], 'x')).toThrow(
      ValidationConfigError,
    );
    expect(() => validate([{ validator: 'isAlphaLocales' } as unknown as Validation], 'x')).toThrow(
      'Unknown validator "isAlphaLocales"',
    );
  });
});
