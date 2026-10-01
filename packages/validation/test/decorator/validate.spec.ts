/* eslint-disable @typescript-eslint/no-extraneous-class -- the decorated classes are empty on purpose */
import { describe, it, expect } from '@jest/globals';
import { validate } from '../../src/decorator/validate';
import { Validations, ownValidations } from '../../src/decorator/validations';
import type { Validation, ValidatedClass } from '../../src/decorator/validations';
import { ValidationConfigError } from '../../src/helpers/errors';

// A custom validation that records its name when it runs, to observe the run order.
const tracked = (order: string[], name: string, result = true): Validation => ({
  custom: name,
  fn: () => (order.push(name), result),
});

describe('validate', () => {
  it('returns ok true, the validated value and no errors when the value is valid', () => {
    @Validations([{ validator: 'isInt', properties: { min: 2 } }])
    class Age {}
    expect(validate(Age, '5')).toEqual({ ok: true, value: '5', errors: [] });
  });

  it('returns ok false, the validated value and the errors when the value is invalid', () => {
    @Validations([{ validator: 'isInt', properties: { min: 2 } }])
    class Age {}
    expect(validate(Age, '1')).toEqual({
      ok: false,
      value: '1',
      errors: [{ validator: 'isInt', message: 'Value does not satisfy isInt' }],
    });
  });

  it('keeps the validated value as is, without copying or converting it', () => {
    @Validations([{ custom: 'any', fn: () => false }])
    class Target {}
    const value = { nested: [1, 2] };
    expect(validate(Target, value).value).toBe(value);
    expect(Object.isFrozen(value)).toBe(false);
    expect(validate(Target, null).value).toBeNull();
  });

  it('returns a frozen result, errors included', () => {
    @Validations([{ validator: 'isEmail' }])
    class Email {}
    for (const result of [validate(Email, 'user@example.com'), validate(Email, 'x')]) {
      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.errors)).toBe(true);
      for (const error of result.errors) expect(Object.isFrozen(error)).toBe(true);
    }
  });

  it('returns a new result on every call', () => {
    @Validations([{ validator: 'isEmail' }])
    class Email {}
    expect(validate(Email, 'x')).not.toBe(validate(Email, 'x'));
  });

  it('returns an empty list for a class without validations', () => {
    class Plain {}
    expect(validate(Plain, 'anything').errors).toEqual([]);
  });

  it('returns an empty list when every validation passes', () => {
    @Validations([{ validator: 'isInt', properties: { min: 2 } }, { validator: 'isPort' }])
    class Port {}
    expect(validate(Port, '80').errors).toEqual([]);
  });

  it('runs every validation even after one fails and reports each failure', () => {
    const order: string[] = [];
    @Validations([
      { validator: 'isInt', properties: { min: 2 } },
      { validator: 'isEmail' },
      tracked(order, 'tracked'),
      { custom: 'isEven', fn: (v) => Number(v) % 2 === 0, message: 'Must be even' },
    ])
    class Target {}
    expect(validate(Target, '1').errors).toEqual([
      { validator: 'isInt', message: 'Value does not satisfy isInt' },
      { validator: 'isEmail', message: 'Value does not satisfy isEmail' },
      { custom: 'isEven', message: 'Must be even' },
    ]);
    expect(order).toEqual(['tracked']);
  });

  it('passes properties to the validator as its options object', () => {
    @Validations([
      { validator: 'isMobilePhone', properties: { locale: 'es-ES', strictMode: true } },
    ])
    class Phone {}
    expect(validate(Phone, '+34612345678').errors).toEqual([]);
    expect(validate(Phone, '612345678').errors).toEqual([
      { validator: 'isMobilePhone', message: 'Value does not satisfy isMobilePhone' },
    ]);
    @Validations([{ validator: 'isHash', properties: { algorithm: 'md5' } }])
    class Md5 {}
    expect(validate(Md5, 'd41d8cd98f00b204e9800998ecf8427e').errors).toEqual([]);
  });

  it('uses a default message for a custom validation without message', () => {
    @Validations([{ custom: 'isAnswer', fn: (v) => v === 42 }])
    class Answer {}
    expect(validate(Answer, 1).errors).toEqual([
      { custom: 'isAnswer', message: 'Value does not satisfy isAnswer' },
    ]);
  });

  it('runs a built-in and a custom with the same name, each with its own error', () => {
    @Validations([{ validator: 'isInt' }, { custom: 'isInt', fn: () => false }])
    class Target {}
    expect(validate(Target, 'x').errors).toEqual([
      { validator: 'isInt', message: 'Value does not satisfy isInt' },
      { custom: 'isInt', message: 'Value does not satisfy isInt' },
    ]);
  });

  it('runs the parent validations first, then each subclass in turn', () => {
    const order: string[] = [];
    @Validations([tracked(order, 'grandParent')])
    abstract class GrandParent {}
    @Validations([tracked(order, 'parent')])
    class Parent extends GrandParent {}
    class Plain extends Parent {}
    @Validations([tracked(order, 'child')])
    class Child extends Plain {}
    expect(validate(Child, 'x').errors).toEqual([]);
    expect(order).toEqual(['grandParent', 'parent', 'child']);
    order.length = 0;
    expect(validate(Parent, 'x').errors).toEqual([]);
    expect(order).toEqual(['grandParent', 'parent']);
  });

  it('replaces the parent declaration when the child repeats a validation, keeping its place', () => {
    @Validations([
      { validator: 'isInt', properties: { min: 0 } },
      { custom: 'rule', fn: () => false, message: 'grandParent rule' },
    ])
    class GrandParent {}
    @Validations([
      { validator: 'isInt', properties: { min: 5 } },
      { validator: 'isPort', message: 'parent port' },
    ])
    class Parent extends GrandParent {}
    @Validations([
      { validator: 'isPort', message: 'child port' },
      { custom: 'last', fn: () => false },
    ])
    class Child extends Parent {}

    // '3' fails isInt only with min 5, and isPort passes: override visible through the errors.
    expect(validate(Child, '3').errors).toEqual([
      { validator: 'isInt', message: 'Value does not satisfy isInt' },
      { custom: 'rule', message: 'grandParent rule' },
      { custom: 'last', message: 'Value does not satisfy last' },
    ]);
    expect(validate(Child, '70000').errors).toEqual([
      { custom: 'rule', message: 'grandParent rule' },
      { validator: 'isPort', message: 'child port' },
      { custom: 'last', message: 'Value does not satisfy last' },
    ]);
    expect(validate(Parent, '70000').errors).toEqual([
      { custom: 'rule', message: 'grandParent rule' },
      { validator: 'isPort', message: 'parent port' },
    ]);
    expect(validate(GrandParent, '3').errors).toEqual([
      { custom: 'rule', message: 'grandParent rule' },
    ]);
  });

  it('matches by kind and name: a custom never replaces a built-in with the same name', () => {
    @Validations([
      { validator: 'isInt', properties: { min: 0 } },
      { custom: 'isEven', fn: () => false, message: 'parent even' },
    ])
    class A {}
    @Validations([
      { custom: 'isEven', fn: () => false, message: 'child even' },
      { custom: 'isInt', fn: () => false },
      { validator: 'isInt', properties: { min: 5 } },
    ])
    class B extends A {}
    expect(validate(B, '3').errors).toEqual([
      { validator: 'isInt', message: 'Value does not satisfy isInt' },
      { custom: 'isEven', message: 'child even' },
      { custom: 'isInt', message: 'Value does not satisfy isInt' },
    ]);
  });

  it('sees validations added to a parent after the subclass was defined', () => {
    class Parent {}
    @Validations([{ validator: 'isEmail' }])
    class Child extends Parent {}
    Validations([{ validator: 'isInt' }])(Parent);
    expect(
      validate(Child, 'x').errors.map((e) => ('validator' in e ? e.validator : e.custom)),
    ).toEqual(['isInt', 'isEmail']);
  });

  it('works for classes created with a null prototype chain', () => {
    const Target = function () {} as unknown as ValidatedClass;
    Object.setPrototypeOf(Target, null);
    Validations([{ validator: 'isInt' }])(Target);
    expect(validate(Target, 'x').errors).toEqual([
      { validator: 'isInt', message: 'Value does not satisfy isInt' },
    ]);
  });

  it('rejects an instance or a value instead of a class', () => {
    @Validations([{ validator: 'isInt' }])
    class Target {}
    const notClasses = [new Target(), {}, null, undefined, 'Target'];
    for (const target of notClasses) {
      expect(() => validate(target as unknown as ValidatedClass, 'x')).toThrow(
        new ValidationConfigError('validate expects a class, not an instance or a value'),
      );
    }
  });

  it('throws ValidationConfigError for a stored validator this copy does not have', () => {
    // As when another copy of the package, of a newer version, decorated the class.
    class Target {}
    ownValidations.set(Target, [{ validator: 'isFromTheFuture' } as unknown as Validation]);
    expect(() => validate(Target, 'x')).toThrow(
      new ValidationConfigError('Unknown validator "isFromTheFuture"'),
    );
  });
});
