import { describe, it, expect } from '@jest/globals';
import { validator, createValidator } from '../src';

describe('createValidator', () => {
  it('returns a new object that includes built-in validators', () => {
    const myValidator = createValidator({});
    expect(myValidator.isEmail('foo@bar.com')).toBe(true);
    expect(myValidator.isEmail('not-an-email')).toBe(false);
  });

  it('includes custom validators', () => {
    const myValidator = createValidator({
      isPositiveInt: (v: unknown) => typeof v === 'number' && Number.isInteger(v) && v > 0,
    });
    expect(myValidator.isPositiveInt(5)).toBe(true);
    expect(myValidator.isPositiveInt(-1)).toBe(false);
    expect(myValidator.isPositiveInt(3.14)).toBe(false);
  });

  it('does NOT mutate the original validator object', () => {
    const myValidator = createValidator({
      myCustom: () => true,
    });
    expect((validator as any).myCustom).toBeUndefined();
    expect(myValidator.myCustom()).toBe(true);
  });

  it('extensions can use built-in validators', () => {
    const myValidator = createValidator({
      isSpanishPhone: (v: unknown) => myValidator.isMobilePhone(v as string, 'es-ES'),
    });
    expect(myValidator.isSpanishPhone('+34612345678')).toBe(true);
    expect(myValidator.isSpanishPhone('+12125551234')).toBe(false);
  });

  it('has no prototype (Object.create(null))', () => {
    const myValidator = createValidator({});
    expect(Object.getPrototypeOf(myValidator)).toBeNull();
  });
});
