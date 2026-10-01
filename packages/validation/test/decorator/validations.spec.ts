/* eslint-disable @typescript-eslint/no-extraneous-class -- the decorated classes are empty on purpose */
import { describe, it, expect, jest } from '@jest/globals';
import { Validations, ownValidations, keyOf } from '../../src/decorator/validations';
import { ValidationConfigError } from '../../src/helpers/errors';
import type { Validation } from '../../src/decorator/validations';
import { validate } from '../../src/decorator/validate';

interface DecoratorModules {
  validations: typeof import('../../src/decorator/validations');
  validate: typeof import('../../src/decorator/validate');
}

// A second, independent copy of the decorator modules, as when an app loads both the CommonJS and
// the ES module build, or two installed copies of the package.
function loadAnotherCopy(): DecoratorModules {
  let loaded: DecoratorModules | undefined;
  jest.isolateModules(() => {
    loaded = {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      validations: require('../../src/decorator/validations'),
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      validate: require('../../src/decorator/validate'),
    };
  });
  return loaded as DecoratorModules;
}

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

  it('rejects a malformed declaration when the class is decorated, storing nothing', () => {
    const decorate = (validations: unknown) => () => {
      class Target {}
      try {
        Validations(validations as Validation[])(Target);
      } finally {
        expect(ownValidations.get(Target)).toBeUndefined();
      }
    };
    const fn = () => true;
    const cases: [unknown, string][] = [
      [undefined, '@Validations expects an array of validations'],
      [{ validator: 'isInt' }, '@Validations expects an array of validations'],
      [[null], 'A validation must be an object'],
      [['isInt'], 'A validation must be an object'],
      [[{}], 'A validation needs "validator" or "custom"'],
      [[{ message: 'x' }], 'A validation needs "validator" or "custom"'],
      [
        [{ validator: 'isInt', custom: 'rule', fn }],
        'A validation cannot have both "validator" and "custom"',
      ],
      [[{ custom: 'rule' }], 'Custom "rule" needs a "fn" function'],
      [[{ custom: 'rule', fn: 'nope' }], 'Custom "rule" needs a "fn" function'],
      [[{ custom: '', fn }], '"custom" must be a non-empty string'],
      [[{ custom: 42, fn }], '"custom" must be a non-empty string'],
      [[{ validator: 'isNope' }], 'Unknown validator "isNope"'],
      [[{ validator: 'isAlphaLocales' }], 'Unknown validator "isAlphaLocales"'],
      [[{ validator: 'toString' }], 'Unknown validator "toString"'],
      [[{ validator: 7 }], 'Unknown validator "7"'],
      [[{ validator: 'isInt' }, { validator: 'isNope' }], 'Unknown validator "isNope"'],
    ];
    for (const [validations, message] of cases) {
      expect(decorate(validations)).toThrow(new ValidationConfigError(message));
    }
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

  it('shares one registry between every copy of the module', () => {
    const other = loadAnotherCopy();
    expect(other.validations.ownValidations).toBe(ownValidations);
    expect(
      (globalThis as Record<symbol, unknown>)[Symbol.for('@archi-code/validation/decorator.v1')],
    ).toBe(ownValidations);

    class DecoratedHere {}
    Validations([{ validator: 'isInt' }])(DecoratedHere);
    expect(other.validate.validate(DecoratedHere, 'x').errors).toEqual([
      { validator: 'isInt', message: 'Value does not satisfy isInt' },
    ]);

    class DecoratedThere {}
    other.validations.Validations([{ validator: 'isEmail' }])(DecoratedThere);
    expect(validate(DecoratedThere, 'x').errors).toEqual([
      { validator: 'isEmail', message: 'Value does not satisfy isEmail' },
    ]);
  });
});
