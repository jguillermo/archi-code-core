/* eslint-disable @typescript-eslint/no-extraneous-class -- the decorated classes are empty on purpose */
import { describe, it, expect } from '@jest/globals';
import { Validations, ownValidations } from '../../src/decorator/validations';
import { ValidationConfigError } from '../../src/helpers/errors';
import type { Validation } from '../../src/decorator/validations';

describe('Validations', () => {
  it('stores the validations of the class in declaration order', () => {
    @Validations([{ validator: 'isInt', properties: { min: 2 } }, { validator: 'isEmail' }])
    class Target {}
    expect(ownValidations.get(Target)).toEqual([
      { validator: 'isInt', properties: { min: 2 } },
      { validator: 'isEmail' },
    ]);
  });

  it('appends when applied more than once', () => {
    class Target {}
    Validations([{ validator: 'isInt' }])(Target);
    Validations([{ validator: 'isEmail' }])(Target);
    expect(ownValidations.get(Target)?.map((v) => v.validator)).toEqual(['isInt', 'isEmail']);
  });

  it('does not touch the parent', () => {
    @Validations([{ validator: 'isInt' }])
    class Parent {}
    @Validations([{ validator: 'isEmail' }])
    class Child extends Parent {}
    expect(ownValidations.get(Parent)).toEqual([{ validator: 'isInt' }]);
    expect(ownValidations.get(Child)).toEqual([{ validator: 'isEmail' }]);
  });

  it('keeps a frozen copy, unaffected by later changes to the declared objects', () => {
    const values = ['a', 'b'];
    const range = { min: 2 };
    const pattern = /^a/g;
    const declared: Validation[] = [
      { validator: 'isIn', properties: values },
      { validator: 'isInt', properties: range },
      { validator: 'matches', properties: pattern },
    ];
    @Validations(declared)
    class Target {}
    range.min = 100;
    values.push('c');
    declared.push({ validator: 'isPort' });

    const stored = ownValidations.get(Target) ?? [];
    expect(stored).toEqual([
      { validator: 'isIn', properties: ['a', 'b'] },
      { validator: 'isInt', properties: { min: 2 } },
      { validator: 'matches', properties: pattern },
    ]);
    const [storedValues, storedRange, storedPattern] = stored.map(
      (v) => (v as { properties?: unknown }).properties,
    );
    expect(Object.isFrozen(stored[0])).toBe(true);
    expect(Object.isFrozen(storedValues)).toBe(true);
    expect(Object.isFrozen(storedRange)).toBe(true);
    expect(storedPattern).toBe(pattern);
    expect(Object.isFrozen(pattern)).toBe(false);
    expect(Object.isFrozen(range)).toBe(false);
    expect(() => {
      (storedRange as { min: number }).min = 100;
    }).toThrow(TypeError);
  });

  it('rejects a validator declared twice in the same class', () => {
    expect(() =>
      Validations([
        { validator: 'isInt', properties: { min: 1 } },
        { validator: 'isInt', properties: { min: 9 } },
      ])(class {}),
    ).toThrow(new ValidationConfigError('Validator "isInt" is declared more than once'));
    class Target {}
    Validations([{ validator: 'rule', fn: () => true }])(Target);
    expect(() => Validations([{ validator: 'rule', fn: () => false }])(Target)).toThrow(
      ValidationConfigError,
    );
    expect(ownValidations.get(Target)?.map((v) => v.validator)).toEqual(['rule']);
  });

  it('only decorates classes', () => {
    expect(() => {
      class Target {
        // @ts-expect-error not a property decorator
        @Validations([{ validator: 'isInt' }])
        value = 1;
      }
      return Target;
    }).toThrow('@Validations can only decorate a class');
    // @ts-expect-error not a class
    expect(() => Validations([{ validator: 'isInt' }])({})).toThrow(ValidationConfigError);
  });
});
