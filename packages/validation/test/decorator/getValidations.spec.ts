/* eslint-disable @typescript-eslint/no-extraneous-class -- the decorated classes are empty on purpose */
import { describe, it, expect } from '@jest/globals';
import { Validations } from '../../src/decorator/validations';
import type { ValidatedClass } from '../../src/decorator/validations';
import { getValidations } from '../../src/decorator/getValidations';
import { validate } from '../../src/decorator/validate';

describe('getValidations', () => {
  it('returns an empty list for a class without validations', () => {
    class Plain {}
    expect(getValidations(Plain)).toEqual([]);
  });

  it('puts the parent validations first, then the child ones, in order', () => {
    @Validations([{ validator: 'isInt' }, { validator: 'isPort' }])
    class Parent {}
    @Validations([{ validator: 'isEmail' }])
    class Child extends Parent {}
    expect(getValidations(Child).map((v) => v.validator)).toEqual(['isInt', 'isPort', 'isEmail']);
  });

  it('keeps the parent declaration when the child repeats a validator', () => {
    @Validations([{ validator: 'isInt', properties: { min: 0 } }])
    class GrandParent {}
    @Validations([{ validator: 'isInt', properties: { min: 5 } }, { validator: 'isPort' }])
    class Parent extends GrandParent {}
    @Validations([{ validator: 'isPort', message: 'child' }, { validator: 'isEmail' }])
    class Child extends Parent {}
    expect(getValidations(Child)).toEqual([
      { validator: 'isInt', properties: { min: 0 } },
      { validator: 'isPort' },
      { validator: 'isEmail' },
    ]);
  });

  it('keeps the first declaration of a validator repeated in the same class', () => {
    @Validations([
      { validator: 'isInt', properties: { min: 1 } },
      { validator: 'isInt', properties: { min: 9 } },
    ])
    class Target {}
    expect(getValidations(Target)).toEqual([{ validator: 'isInt', properties: { min: 1 } }]);
  });

  it('works for classes created with a null prototype chain', () => {
    const Target = function () {} as unknown as ValidatedClass;
    Object.setPrototypeOf(Target, null);
    Validations([{ validator: 'isInt' }])(Target);
    expect(getValidations(Target)).toEqual([{ validator: 'isInt' }]);
  });

  it('validates the parent first, then each subclass in turn', () => {
    const order: string[] = [];
    const track = (name: string) => ({ validator: name, fn: () => (order.push(name), true) });
    @Validations([track('grandParent')])
    abstract class GrandParent {}
    @Validations([track('parent')])
    class Parent extends GrandParent {}
    class Plain extends Parent {}
    @Validations([track('child')])
    class Child extends Plain {}
    expect(validate(getValidations(Child), 'x')).toEqual([]);
    expect(order).toEqual(['grandParent', 'parent', 'child']);
    expect(getValidations(Parent).map((v) => v.validator)).toEqual(['grandParent', 'parent']);
  });
});
