import { describe, expect, it } from '@jest/globals';
import { validate } from '../validators/validate';

describe('output structure', () => {
  it('ok:true when all fields pass', () => {
    const r = validate({
      fields: [{ field: 'email', value: 'a@b.com', validations: ['isEmail'] }],
    });
    expect(r.ok).toBe(true);
    expect(r.errors).toEqual({ email: [] });
  });

  it('ok:false when at least one field fails', () => {
    const r = validate({ fields: [{ field: 'email', value: 'bad', validations: ['isEmail'] }] });
    expect(r.ok).toBe(false);
    expect(r.errors.email.length).toBeGreaterThan(0);
  });

  it('all field keys present in errors regardless of pass/fail', () => {
    const r = validate({
      fields: [
        { field: 'a', value: 'ok@ok.com', validations: ['isEmail'] },
        { field: 'b', value: 'bad', validations: ['isEmail'] },
      ],
    });
    expect(r.errors).toHaveProperty('a');
    expect(r.errors).toHaveProperty('b');
    expect(r.errors['a']).toEqual([]);
    expect(r.errors['b'].length).toBeGreaterThan(0);
  });

  it('collects multiple errors for the same field', () => {
    const r = validate({
      fields: [
        { field: 'f', value: '', validations: ['isNotEmpty', ['isMinLength', 5], 'isAlpha'] },
      ],
    });
    expect(r.errors['f']).toHaveLength(3);
  });

  it('empty validations array always passes', () => {
    const r = validate({ fields: [{ field: 'f', value: null, validations: [] }] });
    expect(r.ok).toBe(true);
    expect(r.errors['f']).toEqual([]);
  });

  it('errors only contains the fields that were passed', () => {
    const r = validate({
      fields: [
        { field: 'name', value: 'John', validations: ['isNotEmpty'] },
        { field: 'age', value: 25, validations: ['isPositiveInteger'] },
      ],
    });
    // HashMap does not guarantee insertion order — check keys as a set
    expect(Object.keys(r.errors).sort()).toEqual(['age', 'name']);
  });
});
