import { describe, it, expect, jest } from '@jest/globals';
import { expectTypeOf } from 'expect-type';
import { runValidations } from '../../src';
import type { ValidationResult } from '../../src';
import { Validations, ownValidations } from '../../src/decorator/validations';
import type { Validation, ValidatedClass } from '../../src';
import { ValidationConfigError } from '../../src';

const recordingRunOrder = (order: string[], name: string, result = true): Validation => ({
  custom: name,
  fn: () => (order.push(name), result),
});

const builtInError = (name: string, message = `Value does not satisfy ${name}`) => ({
  validator: name,
  message,
});

const customError = (name: string, message = `Value does not satisfy ${name}`) => ({
  custom: name,
  message,
});

const isRequiredError = builtInError('isRequired');

const missingValues: [string, null | undefined][] = [
  ['null', null],
  ['undefined', undefined],
];

const presentValues: [string, unknown][] = [
  ['an empty string', ''],
  ['a blank string', '   '],
  ['zero', 0],
  ['false', false],
  ['NaN', NaN],
  ['an empty array', []],
  ['an empty object', {}],
  ['a string', 'x'],
];

describe('runValidations', () => {
  describe('target', () => {
    it.each([
      ['an instance', new (class Target {})()],
      ['a plain object', {}],
      ['an array', []],
      ['null', null],
      ['undefined', undefined],
      ['a string', 'Target'],
      ['a number', 1],
    ])('rejects %s instead of a class', (_, target) => {
      expect(() => runValidations(target as unknown as ValidatedClass, 'x')).toThrow(
        new ValidationConfigError('runValidations expects a class, not an instance or a value'),
      );
    });

    it('rejects a non-class target even when the value is missing', () => {
      expect(() => runValidations({} as unknown as ValidatedClass, null)).toThrow(
        ValidationConfigError,
      );
    });

    it('accepts an abstract class', () => {
      @Validations([{ validator: 'isInt' }])
      abstract class Base {}
      expect(runValidations(Base, 'x').errors).toEqual([builtInError('isInt')]);
    });

    it('accepts a function whose prototype chain ends in null', () => {
      const Target = function () {} as unknown as ValidatedClass;
      Object.setPrototypeOf(Target, null);
      Validations([{ validator: 'isInt' }])(Target);
      expect(runValidations(Target, 'x').errors).toEqual([builtInError('isInt')]);
    });
  });

  describe('result', () => {
    it('is ok, with the value and no errors, when every validation passes', () => {
      @Validations([{ validator: 'isInt', properties: { min: 2 } }, { validator: 'isPort' }])
      class Port {}
      expect(runValidations(Port, '80')).toEqual({ ok: true, value: '80', errors: [] });
    });

    it('is not ok, with the value and the errors, when a validation fails', () => {
      @Validations([{ validator: 'isInt', properties: { min: 2 } }])
      class Age {}
      expect(runValidations(Age, '1')).toEqual({
        ok: false,
        value: '1',
        errors: [builtInError('isInt')],
      });
    });

    it('is ok for a class without validations, whatever the value', () => {
      class Plain {}
      expect(runValidations(Plain, 'anything')).toEqual({
        ok: true,
        value: 'anything',
        errors: [],
      });
      expect(runValidations(Plain, null)).toEqual({ ok: true, value: null, errors: [] });
    });

    it('ok is true exactly when errors is empty', () => {
      @Validations([{ validator: 'isEmail' }])
      class Email {}
      for (const value of ['user@example.com', 'x', null, '']) {
        const result = runValidations(Email, value);
        expect(result.ok).toBe(result.errors.length === 0);
      }
    });

    it('keeps the value as it was passed, without copying, converting or freezing it', () => {
      @Validations([{ custom: 'never', fn: () => false }])
      class Target {}
      const value = { nested: [1, 2] };
      expect(runValidations(Target, value).value).toBe(value);
      expect(Object.isFrozen(value)).toBe(false);
      expect(runValidations(Target, '5').value).toBe('5');
    });

    it.each(missingValues)('keeps a missing value as it was passed: %s', (_, value) => {
      @Validations([{ validator: 'isRequired' }])
      class Required {}
      class Optional {}
      expect(runValidations(Required, value).value).toBe(value);
      expect(runValidations(Optional, value).value).toBe(value);
    });

    it('is frozen, its errors list and each error included', () => {
      @Validations([{ validator: 'isEmail' }, { custom: 'never', fn: () => false }])
      class Email {}
      for (const result of [
        runValidations(Email, 'user@example.com'),
        runValidations(Email, 'x'),
        runValidations(Email, null),
      ]) {
        expect(Object.isFrozen(result)).toBe(true);
        expect(Object.isFrozen(result.errors)).toBe(true);
        for (const error of result.errors) expect(Object.isFrozen(error)).toBe(true);
      }
    });

    it('is a new object on every call', () => {
      @Validations([{ validator: 'isEmail' }])
      class Email {}
      expect(runValidations(Email, 'x')).not.toBe(runValidations(Email, 'x'));
      expect(runValidations(Email, 'x')).toEqual(runValidations(Email, 'x'));
    });

    it('is typed with the type of the value', () => {
      class Target {}
      expectTypeOf(runValidations(Target, '5')).toEqualTypeOf<ValidationResult<string>>();
      expectTypeOf(runValidations(Target, 5)).toEqualTypeOf<ValidationResult<number>>();
      expectTypeOf(runValidations(Target, null)).toEqualTypeOf<ValidationResult<null>>();
    });
  });

  describe('built-in validations', () => {
    it('reports nothing when the validator passes', () => {
      @Validations([{ validator: 'isEmail' }])
      class Email {}
      expect(runValidations(Email, 'user@example.com').errors).toEqual([]);
    });

    it('reports the validator name and a default message when it fails', () => {
      @Validations([{ validator: 'isEmail' }])
      class Email {}
      expect(runValidations(Email, 'x').errors).toEqual([
        { validator: 'isEmail', message: 'Value does not satisfy isEmail' },
      ]);
    });

    it('reports the declared message when it fails', () => {
      @Validations([{ validator: 'isEmail', message: 'Enter a valid email' }])
      class Email {}
      expect(runValidations(Email, 'x').errors).toEqual([
        { validator: 'isEmail', message: 'Enter a valid email' },
      ]);
    });

    it('passes properties to the validator as its options object', () => {
      @Validations([
        { validator: 'isMobilePhone', properties: { locale: 'es-ES', strictMode: true } },
      ])
      class Phone {}
      expect(runValidations(Phone, '+34612345678').errors).toEqual([]);
      expect(runValidations(Phone, '612345678').errors).toEqual([builtInError('isMobilePhone')]);

      @Validations([{ validator: 'isHash', properties: { algorithm: 'md5' } }])
      class Md5 {}
      expect(runValidations(Md5, 'd41d8cd98f00b204e9800998ecf8427e').errors).toEqual([]);

      @Validations([{ validator: 'isInt', properties: { min: 2 } }])
      class Age {}
      expect(runValidations(Age, '2').errors).toEqual([]);
      expect(runValidations(Age, '1').errors).toEqual([builtInError('isInt')]);
    });

    it('throws ValidationConfigError for a validator stored by a newer copy of the package', () => {
      class Target {}
      ownValidations.set(Target, [{ validator: 'isFromTheFuture' } as unknown as Validation]);
      expect(() => runValidations(Target, 'x')).toThrow(
        new ValidationConfigError('Unknown validator "isFromTheFuture"'),
      );
    });
  });

  describe('custom validations', () => {
    it('calls fn once with the value as it was passed', () => {
      const fn = jest.fn((_value: unknown) => true);
      @Validations([{ custom: 'rule', fn }])
      class Target {}
      const value = { id: 1 };
      runValidations(Target, value);
      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith(value);
    });

    it('reports nothing when fn returns true', () => {
      @Validations([{ custom: 'isAnswer', fn: (v) => v === 42 }])
      class Answer {}
      expect(runValidations(Answer, 42).errors).toEqual([]);
    });

    it('reports the custom name and a default message when fn returns false', () => {
      @Validations([{ custom: 'isAnswer', fn: (v) => v === 42 }])
      class Answer {}
      expect(runValidations(Answer, 1).errors).toEqual([
        { custom: 'isAnswer', message: 'Value does not satisfy isAnswer' },
      ]);
    });

    it('reports the declared message when fn returns false', () => {
      @Validations([{ custom: 'isEven', fn: (v) => Number(v) % 2 === 0, message: 'Must be even' }])
      class Even {}
      expect(runValidations(Even, 3).errors).toEqual([
        { custom: 'isEven', message: 'Must be even' },
      ]);
    });

    it('lets an error thrown by fn propagate', () => {
      @Validations([
        {
          custom: 'explodes',
          fn: () => {
            throw new Error('boom');
          },
        },
      ])
      class Target {}
      expect(() => runValidations(Target, 'x')).toThrow('boom');
    });
  });

  describe('every validation runs', () => {
    it('keeps running after a failure and reports each failure in declared order', () => {
      const order: string[] = [];
      @Validations([
        { validator: 'isInt', properties: { min: 2 } },
        { validator: 'isEmail' },
        recordingRunOrder(order, 'tracked'),
        { custom: 'isEven', fn: (v) => Number(v) % 2 === 0, message: 'Must be even' },
      ])
      class Target {}
      expect(runValidations(Target, '1').errors).toEqual([
        builtInError('isInt'),
        builtInError('isEmail'),
        customError('isEven', 'Must be even'),
      ]);
      expect(order).toEqual(['tracked']);
    });

    it('runs the validations in the declared order', () => {
      const order: string[] = [];
      @Validations([
        recordingRunOrder(order, 'first'),
        recordingRunOrder(order, 'second'),
        recordingRunOrder(order, 'third'),
      ])
      class Target {}
      runValidations(Target, 'x');
      expect(order).toEqual(['first', 'second', 'third']);
    });

    it('runs a built-in and a custom with the same name, each with its own error', () => {
      @Validations([{ validator: 'isInt' }, { custom: 'isInt', fn: () => false }])
      class Target {}
      expect(runValidations(Target, 'x').errors).toEqual([
        builtInError('isInt'),
        customError('isInt'),
      ]);
    });
  });

  describe('inheritance', () => {
    it('runs the parent validations first, then each subclass in turn', () => {
      const order: string[] = [];
      @Validations([recordingRunOrder(order, 'grandParent')])
      abstract class GrandParent {}
      @Validations([recordingRunOrder(order, 'parent')])
      class Parent extends GrandParent {}
      class Plain extends Parent {}
      @Validations([recordingRunOrder(order, 'child')])
      class Child extends Plain {}
      expect(runValidations(Child, 'x').errors).toEqual([]);
      expect(order).toEqual(['grandParent', 'parent', 'child']);
      order.length = 0;
      expect(runValidations(Parent, 'x').errors).toEqual([]);
      expect(order).toEqual(['grandParent', 'parent']);
    });

    it('runs the parent validations for a subclass without its own', () => {
      @Validations([{ validator: 'isEmail' }])
      class Email {}
      class WorkEmail extends Email {}
      expect(runValidations(WorkEmail, 'x').errors).toEqual([builtInError('isEmail')]);
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

      const belowParentMinButValidPort = '3';
      expect(runValidations(Child, belowParentMinButValidPort).errors).toEqual([
        builtInError('isInt'),
        customError('rule', 'grandParent rule'),
        customError('last'),
      ]);
      expect(runValidations(Child, '70000').errors).toEqual([
        customError('rule', 'grandParent rule'),
        builtInError('isPort', 'child port'),
        customError('last'),
      ]);
      expect(runValidations(Parent, '70000').errors).toEqual([
        customError('rule', 'grandParent rule'),
        builtInError('isPort', 'parent port'),
      ]);
      expect(runValidations(GrandParent, '3').errors).toEqual([
        customError('rule', 'grandParent rule'),
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
      expect(runValidations(B, '3').errors).toEqual([
        builtInError('isInt'),
        customError('isEven', 'child even'),
        customError('isInt'),
      ]);
    });

    it('sees validations added to a parent after the subclass was defined', () => {
      class Parent {}
      @Validations([{ validator: 'isEmail' }])
      class Child extends Parent {}
      expect(runValidations(Child, 'x').errors).toEqual([builtInError('isEmail')]);
      Validations([{ validator: 'isInt' }])(Parent);
      expect(runValidations(Child, 'x').errors).toEqual([
        builtInError('isInt'),
        builtInError('isEmail'),
      ]);
    });
  });

  describe('what counts as a value', () => {
    it.each(missingValues)('%s is a missing value', (_, value) => {
      const fn = jest.fn(() => false);
      @Validations([{ custom: 'rule', fn }])
      class Optional {}
      expect(runValidations(Optional, value).ok).toBe(true);
      expect(fn).not.toHaveBeenCalled();
    });

    it.each(presentValues)('%s is a value, so the validations run', (_, value) => {
      const fn = jest.fn((_value: unknown) => false);
      @Validations([{ custom: 'rule', fn }])
      class Optional {}
      expect(runValidations(Optional, value).errors).toEqual([customError('rule')]);
      expect(fn).toHaveBeenCalledWith(value);
    });

    it.each(presentValues)('%s passes isRequired', (_, value) => {
      @Validations([{ validator: 'isRequired' }])
      class Required {}
      expect(runValidations(Required, value)).toEqual({ ok: true, value, errors: [] });
    });
  });

  describe('optional: isRequired is not declared', () => {
    it.each(missingValues)('is ok for %s without running any validation', (_, value) => {
      const rule = jest.fn(() => false);
      @Validations([{ validator: 'isEmail' }, { custom: 'rule', fn: rule }])
      class OptionalEmail {}
      expect(runValidations(OptionalEmail, value)).toEqual({ ok: true, value, errors: [] });
      expect(rule).not.toHaveBeenCalled();
    });

    it.each(missingValues)('does not reach a validator unknown to this copy for %s', (_, value) => {
      class Target {}
      ownValidations.set(Target, [{ validator: 'isFromTheFuture' } as unknown as Validation]);
      expect(runValidations(Target, value).ok).toBe(true);
    });

    it('runs every validation when there is a value', () => {
      const order: string[] = [];
      @Validations([
        { validator: 'isEmail' },
        recordingRunOrder(order, 'rule', false),
        { validator: 'isLength', properties: { min: 5 } },
      ])
      class OptionalEmail {}
      expect(runValidations(OptionalEmail, 'x').errors).toEqual([
        builtInError('isEmail'),
        customError('rule'),
        builtInError('isLength'),
      ]);
      expect(order).toEqual(['rule']);
    });

    it('is ok when there is a value that passes every validation', () => {
      @Validations([{ validator: 'isEmail' }])
      class OptionalEmail {}
      expect(runValidations(OptionalEmail, 'user@example.com').ok).toBe(true);
    });

    it('a custom named isRequired does not make the value required', () => {
      const fn = jest.fn(() => false);
      @Validations([{ custom: 'isRequired', fn }])
      class Target {}
      expect(runValidations(Target, null)).toEqual({ ok: true, value: null, errors: [] });
      expect(fn).not.toHaveBeenCalled();
      expect(runValidations(Target, 'x').errors).toEqual([customError('isRequired')]);
    });
  });

  describe('required: isRequired is declared', () => {
    describe('without a value', () => {
      it.each(missingValues)(
        'fails only isRequired for %s, running no other validation',
        (_, value) => {
          const rule = jest.fn(() => false);
          @Validations([
            { validator: 'isEmail' },
            { custom: 'rule', fn: rule },
            { validator: 'isRequired' },
          ])
          class RequiredEmail {}
          expect(runValidations(RequiredEmail, value)).toEqual({
            ok: false,
            value,
            errors: [isRequiredError],
          });
          expect(rule).not.toHaveBeenCalled();
        },
      );

      it.each([
        ['first', [{ validator: 'isRequired' }, { validator: 'isEmail' }, { validator: 'isInt' }]],
        [
          'in the middle',
          [{ validator: 'isEmail' }, { validator: 'isRequired' }, { validator: 'isInt' }],
        ],
        ['last', [{ validator: 'isEmail' }, { validator: 'isInt' }, { validator: 'isRequired' }]],
      ] as [string, Validation[]][])(
        'fails only isRequired when it is declared %s',
        (_, validations) => {
          class Target {}
          Validations(validations)(Target);
          expect(runValidations(Target, null).errors).toEqual([isRequiredError]);
        },
      );

      it('reports the declared isRequired message', () => {
        @Validations([{ validator: 'isRequired', message: 'Name is required' }])
        class Name {}
        expect(runValidations(Name, null).errors).toEqual([
          builtInError('isRequired', 'Name is required'),
        ]);
      });

      it('fails isRequired declared by a parent, without running the subclass validations', () => {
        const childRule = jest.fn(() => false);
        @Validations([{ validator: 'isRequired' }])
        class Required {}
        @Validations([{ custom: 'childRule', fn: childRule }])
        class Child extends Required {}
        expect(runValidations(Child, null).errors).toEqual([isRequiredError]);
        expect(childRule).not.toHaveBeenCalled();
      });

      it('fails isRequired declared by a subclass, without running the parent validations', () => {
        const parentRule = jest.fn(() => false);
        @Validations([{ custom: 'parentRule', fn: parentRule }, { validator: 'isEmail' }])
        class Email {}
        @Validations([{ validator: 'isRequired' }])
        class RequiredEmail extends Email {}
        expect(runValidations(RequiredEmail, undefined).errors).toEqual([isRequiredError]);
        expect(parentRule).not.toHaveBeenCalled();
        expect(runValidations(Email, undefined).ok).toBe(true);
      });

      it('uses the message of the subclass that redeclares isRequired', () => {
        @Validations([{ validator: 'isRequired', message: 'parent' }])
        class Parent {}
        @Validations([{ validator: 'isRequired', message: 'child' }])
        class Child extends Parent {}
        expect(runValidations(Child, null).errors).toEqual([builtInError('isRequired', 'child')]);
        expect(runValidations(Parent, null).errors).toEqual([builtInError('isRequired', 'parent')]);
      });

      it('stays required in a subclass without its own validations', () => {
        @Validations([{ validator: 'isRequired' }, { validator: 'isEmail' }])
        class RequiredEmail {}
        class WorkEmail extends RequiredEmail {}
        expect(runValidations(WorkEmail, null).errors).toEqual([isRequiredError]);
      });

      it('fails isRequired declared by a grandparent, across a class without validations', () => {
        @Validations([{ validator: 'isRequired' }])
        class GrandParent {}
        class Parent extends GrandParent {}
        @Validations([{ validator: 'isEmail' }])
        class Child extends Parent {}
        expect(runValidations(Child, null).errors).toEqual([isRequiredError]);
      });

      it('fails isRequired added by a later @Validations on the same class', () => {
        class Target {}
        Validations([{ validator: 'isEmail' }])(Target);
        expect(runValidations(Target, null).ok).toBe(true);
        Validations([{ validator: 'isRequired' }])(Target);
        expect(runValidations(Target, null).errors).toEqual([isRequiredError]);
      });

      it('does not reach a validator unknown to this copy', () => {
        class Target {}
        ownValidations.set(Target, [
          { validator: 'isFromTheFuture' } as unknown as Validation,
          { validator: 'isRequired' },
        ]);
        expect(runValidations(Target, null).errors).toEqual([isRequiredError]);
        expect(() => runValidations(Target, 'x')).toThrow(
          new ValidationConfigError('Unknown validator "isFromTheFuture"'),
        );
      });

      it('returns a frozen result, its error included', () => {
        @Validations([{ validator: 'isRequired' }])
        class Required {}
        const result = runValidations(Required, null);
        expect(Object.isFrozen(result)).toBe(true);
        expect(Object.isFrozen(result.errors)).toBe(true);
        expect(Object.isFrozen(result.errors[0])).toBe(true);
      });
    });

    describe('with a value', () => {
      it('runs every validation, isRequired included, and reports only the failures', () => {
        const order: string[] = [];
        @Validations([
          { validator: 'isEmail' },
          { validator: 'isRequired' },
          recordingRunOrder(order, 'rule', false),
        ])
        class RequiredEmail {}
        expect(runValidations(RequiredEmail, 'x').errors).toEqual([
          builtInError('isEmail'),
          customError('rule'),
        ]);
        expect(order).toEqual(['rule']);
      });

      it('keeps the declared order of the other validations, wherever isRequired is', () => {
        const order: string[] = [];
        @Validations([
          recordingRunOrder(order, 'first'),
          { validator: 'isRequired' },
          recordingRunOrder(order, 'second'),
        ])
        class Parent {}
        @Validations([recordingRunOrder(order, 'third')])
        class Child extends Parent {}
        expect(runValidations(Child, 'x').ok).toBe(true);
        expect(order).toEqual(['first', 'second', 'third']);
      });

      it('is ok when the value passes every validation', () => {
        @Validations([{ validator: 'isRequired' }, { validator: 'isEmail' }])
        class RequiredEmail {}
        expect(runValidations(RequiredEmail, 'user@example.com')).toEqual({
          ok: true,
          value: 'user@example.com',
          errors: [],
        });
      });

      it('runs the validations of the parent and the subclass', () => {
        @Validations([{ validator: 'isRequired' }, { validator: 'isEmail' }])
        class RequiredEmail {}
        @Validations([{ validator: 'isLength', properties: { min: 20 } }])
        class LongEmail extends RequiredEmail {}
        expect(runValidations(LongEmail, 'x').errors).toEqual([
          builtInError('isEmail'),
          builtInError('isLength'),
        ]);
      });
    });
  });
});
