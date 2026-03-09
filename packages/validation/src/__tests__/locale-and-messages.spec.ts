import { describe, expect, it } from '@jest/globals';
import { validate } from '../validators/validate';
import { check } from './helpers';

describe('locale', () => {
  it('defaults to en when locale is omitted', () => {
    const errors = check('bad', 'isEmail');
    expect(errors).toEqual(['must be a valid email address']);
  });

  it('explicit en locale', () => {
    const r = validate({
      locale: 'en',
      fields: [{ field: 'f', value: 'bad', validations: ['isEmail'] }],
    });
    expect(r.errors['f']).toEqual(['must be a valid email address']);
  });

  it('es locale', () => {
    const r = validate({
      locale: 'es',
      fields: [{ field: 'f', value: 'bad', validations: ['isEmail'] }],
    });
    expect(r.errors['f']).toEqual(['debe ser un correo electrónico válido']);
  });

  it('locale applies to all fields', () => {
    const r = validate({
      locale: 'es',
      fields: [
        { field: 'email', value: 'bad', validations: ['isEmail'] },
        { field: 'name', value: '', validations: ['isNotEmpty'] },
      ],
    });
    expect(r.errors.email[0]).toContain('correo');
    expect(r.errors.name[0]).toContain('vacío');
  });
});

describe('param interpolation in messages', () => {
  it('single param {0} — en', () => {
    const errors = check('ab', ['isMinLength', 10]);
    expect(errors[0]).toBe('must be at least 10 characters long');
  });

  it('single param {0} — es', () => {
    const r = validate({
      locale: 'es',
      fields: [{ field: 'f', value: 'hi', validations: [['isMinLength', 5]] }],
    });
    expect(r.errors['f'][0]).toBe('debe tener al menos 5 caracteres');
  });

  it('two params {0} and {1} — en', () => {
    const errors = check(200, ['isInRange', 0, 100]);
    expect(errors[0]).toBe('must be between 0 and 100');
  });

  it('two params {0} and {1} — es', () => {
    const r = validate({
      locale: 'es',
      fields: [{ field: 'f', value: 200, validations: [['isInRange', 0, 120]] }],
    });
    expect(r.errors['f'][0]).toBe('debe estar entre 0 y 120');
  });

  it('string param appears in message', () => {
    const errors = check('hello world', ['isStartsWith', 'foo']);
    expect(errors[0]).toContain('foo');
  });
});

describe('custom messages', () => {
  it('overrides default en message', () => {
    const errors = check('bad', { rule: 'isEmail', message: 'Enter a valid email' });
    expect(errors).toEqual(['Enter a valid email']);
  });

  it('overrides es locale message', () => {
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
    expect(r.errors['f']).toEqual(['Correo inválido']);
  });

  it('custom message is returned even when rule has params', () => {
    const errors = check('hi', { rule: 'isMinLength', params: [10], message: 'Name too short' });
    expect(errors).toEqual(['Name too short']);
  });

  it('custom message does not affect other fields', () => {
    const r = validate({
      fields: [
        { field: 'a', value: 'bad', validations: [{ rule: 'isEmail', message: 'Custom A' }] },
        { field: 'b', value: 'bad', validations: ['isEmail'] },
      ],
    });
    expect(r.errors['a']).toEqual(['Custom A']);
    expect(r.errors['b']).toEqual(['must be a valid email address']);
  });
});
