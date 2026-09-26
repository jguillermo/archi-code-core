/* eslint-disable @typescript-eslint/no-extraneous-class -- the decorated classes are empty on purpose */
import { describe, it, expect } from '@jest/globals';
import { Validations, ownValidations } from '../../src/decorator/validations';
import { ValidationConfigError } from '../../src/helpers/errors';

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
