import { describe, expect, it } from '@jest/globals';
import { validate } from '../validators/validate';

describe('output structure', () => {
  it('ok:true when all fields pass', () => {
    const r = validate([{ field: 'email', validations: ['isEmail'] }], { email: 'a@b.com' });
    expect(r.ok).toBe(true);
    expect(r.errors).toEqual({ email: [] });
  });

  it('ok:false when at least one field fails', () => {
    const r = validate([{ field: 'email', validations: ['isEmail'] }], { email: 'bad' });
    expect(r.ok).toBe(false);
    expect(r.errors.email.length).toBeGreaterThan(0);
  });

  it('all field keys present in errors regardless of pass/fail', () => {
    const r = validate(
      [
        { field: 'a', validations: ['isEmail'] },
        { field: 'b', validations: ['isEmail'] },
      ],
      { a: 'ok@ok.com', b: 'bad' },
    );
    expect(r.errors).toHaveProperty('a');
    expect(r.errors).toHaveProperty('b');
    expect(r.errors['a']).toEqual([]);
    expect(r.errors['b'].length).toBeGreaterThan(0);
  });

  it('collects multiple errors for the same field', () => {
    const r = validate(
      [{ field: 'f', validations: ['isNotEmpty', ['isMinLength', 5], 'isAlpha'] }],
      { f: '' },
    );
    expect(r.errors['f']).toHaveLength(3);
  });

  it('empty validations array always passes', () => {
    const r = validate([{ field: 'f', validations: [] }], { f: null });
    expect(r.ok).toBe(true);
    expect(r.errors['f']).toEqual([]);
  });

  it('errors only contains the fields that were passed', () => {
    const r = validate(
      [
        { field: 'name', validations: ['isNotEmpty'] },
        { field: 'age', validations: ['isPositiveInteger'] },
      ],
      { name: 'John', age: 25 },
    );
    expect(Object.keys(r.errors).sort()).toEqual(['age', 'name']);
  });
});
