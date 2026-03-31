import { describe, expect, it } from '@jest/globals';
import { createValidator } from '../validators/validate';

describe('output structure', () => {
  it('ok:true when all fields pass', () => {
    const v = createValidator([{ field: 'email', validations: ['isEmail'] }]);
    const r = v.validate({ email: 'a@b.com' });
    expect(r.ok).toBe(true);
    expect(r.errors).toEqual({ email: [] });
  });

  it('ok:false when at least one field fails', () => {
    const v = createValidator([{ field: 'email', validations: ['isEmail'] }]);
    const r = v.validate({ email: 'bad' });
    expect(r.ok).toBe(false);
    expect(r.errors.email.length).toBeGreaterThan(0);
  });

  it('all field keys present in errors regardless of pass/fail', () => {
    const v = createValidator([
      { field: 'a', validations: ['isEmail'] },
      { field: 'b', validations: ['isEmail'] },
    ]);
    const r = v.validate({ a: 'ok@ok.com', b: 'bad' });
    expect(r.errors).toHaveProperty('a');
    expect(r.errors).toHaveProperty('b');
    expect(r.errors['a']).toEqual([]);
    expect(r.errors['b'].length).toBeGreaterThan(0);
  });

  it('collects multiple errors for the same field', () => {
    const v = createValidator([
      { field: 'f', validations: ['isNotEmpty', ['isMinLength', 5], 'isAlpha'] },
    ]);
    const r = v.validate({ f: '' });
    expect(r.errors['f']).toHaveLength(3);
  });

  it('empty validations array always passes', () => {
    const v = createValidator([{ field: 'f', validations: [] }]);
    const r = v.validate({ f: null });
    expect(r.ok).toBe(true);
    expect(r.errors['f']).toEqual([]);
  });

  it('errors only contains the fields that were passed', () => {
    const v = createValidator([
      { field: 'name', validations: ['isNotEmpty'] },
      { field: 'age', validations: ['isPositiveInteger'] },
    ]);
    const r = v.validate({ name: 'John', age: 25 });
    expect(Object.keys(r.errors).sort()).toEqual(['age', 'name']);
  });
});
