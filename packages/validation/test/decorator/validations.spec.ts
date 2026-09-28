/* eslint-disable @typescript-eslint/no-extraneous-class -- the decorated classes are empty on purpose */
import { describe, it, expect } from '@jest/globals';
import { Validations, ownValidations, keyOf } from '../../src/decorator/validations';
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

  it('appends when applied more than once, a repeated validation replacing the earlier one in its place', () => {
    const odd = () => false;
    class Target {}
    Validations([
      { validator: 'isInt', properties: { min: 1 } },
      { custom: 'rule', fn: () => true },
    ])(Target);
    Validations([
      { validator: 'isEmail' },
      { custom: 'rule', fn: odd },
      { validator: 'isInt', properties: { min: 9 } },
    ])(Target);
    expect(ownValidations.get(Target)).toEqual([
      { validator: 'isInt', properties: { min: 9 } },
      { custom: 'rule', fn: odd },
      { validator: 'isEmail' },
    ]);
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
      { validator: 'isIn', properties: { values } },
      { validator: 'isInt', properties: range },
      { validator: 'matches', properties: { pattern } },
    ];
    @Validations(declared)
    class Target {}
    range.min = 100;
    values.push('c');
    declared.push({ validator: 'isPort' });

    const stored = ownValidations.get(Target) ?? [];
    expect(stored).toEqual([
      { validator: 'isIn', properties: { values: ['a', 'b'] } },
      { validator: 'isInt', properties: { min: 2 } },
      { validator: 'matches', properties: { pattern } },
    ]);
    const [storedValues, storedRange, storedPattern] = stored.map(
      (v) => (v as { properties?: unknown }).properties,
    );
    expect(Object.isFrozen(stored[0])).toBe(true);
    expect(Object.isFrozen(storedValues)).toBe(true);
    expect(Object.isFrozen((storedValues as { values: unknown }).values)).toBe(true);
    expect(Object.isFrozen(storedRange)).toBe(true);
    expect((storedPattern as { pattern: RegExp }).pattern).toBe(pattern);
    expect(Object.isFrozen(pattern)).toBe(false);
    expect(Object.isFrozen(range)).toBe(false);
    expect(() => {
      (storedRange as { min: number }).min = 100;
    }).toThrow(TypeError);
  });

  it('rejects a validator or a custom declared twice in the same list', () => {
    expect(() =>
      Validations([
        { validator: 'isInt', properties: { min: 1 } },
        { validator: 'isInt', properties: { min: 9 } },
      ])(class {}),
    ).toThrow(new ValidationConfigError('Validator "isInt" is declared more than once'));
    class Target {}
    expect(() =>
      Validations([
        { custom: 'rule', fn: () => true },
        { custom: 'rule', fn: () => false },
      ])(Target),
    ).toThrow(new ValidationConfigError('Custom "rule" is declared more than once'));
    expect(ownValidations.get(Target)).toBeUndefined();
  });

  it('keeps a built-in and a custom with the same name apart', () => {
    const fn = () => true;
    @Validations([{ validator: 'isInt' }, { custom: 'isInt', fn }])
    class Target {}
    expect(ownValidations.get(Target)).toEqual([{ validator: 'isInt' }, { custom: 'isInt', fn }]);
    expect(keyOf({ validator: 'isInt' })).not.toBe(keyOf({ custom: 'isInt', fn }));
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
