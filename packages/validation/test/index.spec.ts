/**
 * Compile-time contract of the public API (checked by ts-jest diagnostics / tsc --noEmit).
 */
import { describe, expect, it } from '@jest/globals';
import { expectTypeOf } from 'expect-type';
import * as fs from 'fs';
import * as path from 'path';
import * as api from '../src';
import {
  validator,
  validate,
  Validations,
  toEnum,
  toInteger,
  toDate,
  canBeEnum,
  scorePassword,
  ValidationConfigError,
} from '../src';
import type { Converted, ConvertMessage } from '../src/convert';
import type {
  ValidatorRegistry,
  IsEmailOptions,
  IsRgbColorOptions,
  IsISO31661Alpha2Options,
  MobilePhoneLocale,
  HashAlgorithm,
  VATCountryCode,
  IsCreditCardOptions,
  CreditCardProvider,
  IsIntOptions,
  IsHashOptions,
  ValidationProperties,
  ValidationError,
  ValidationResult,
  ValidationSuccess,
  ValidationFailure,
  Validatable,
} from '../src';

describe('public types', () => {
  it('validators return boolean', () => {
    expectTypeOf(validator.isEmail).returns.toEqualTypeOf<boolean>();
    expectTypeOf(validator.isStrongPassword('x')).toEqualTypeOf<boolean>();
    expectTypeOf(validator.isStrongPassword).returns.toEqualTypeOf<boolean>();
    expectTypeOf(scorePassword).returns.toEqualTypeOf<number>();
  });

  it('every function of the validator registry returns boolean (and only boolean)', () => {
    type NonBooleanValidators = {
      [K in keyof ValidatorRegistry]: ValidatorRegistry[K] extends (...args: never[]) => infer R
        ? [R] extends [boolean]
          ? [boolean] extends [R]
            ? never
            : K
          : K
        : never;
    }[keyof ValidatorRegistry];
    expectTypeOf<NonBooleanValidators>().toEqualTypeOf<never>();
  });

  it('options match the implementation', () => {
    expectTypeOf(validator.isAfter).toBeCallableWith('2024-01-01', {
      comparisonDate: '2023-01-01',
    });
    // @ts-expect-error no shorthand: the second argument is always the options object
    expectTypeOf(validator.isAfter).toBeCallableWith('2024-01-01', '2023-01-01');
    expectTypeOf(validator.isUUID).toBeCallableWith('x', { version: 'loose' });
    expectTypeOf(validator.isHexColor).toBeCallableWith('#fff', { require_hashtag: true });
    expectTypeOf(validator.isIBAN).toBeCallableWith('x', { whitelist: ['ES'] });
    expectTypeOf(validator.isLength).toBeCallableWith('x', { max: 1, graphemes: true });
    expectTypeOf(validator.isDate).toBeCallableWith('01/01/24', {
      format: 'DD/MM/YY',
      twoDigitYearPivot: 50,
    });
  });

  it('locale lists are read-only', () => {
    expectTypeOf(validator.isAlphaLocales).toEqualTypeOf<readonly string[]>();
  });

  it('convertTo is precisely typed', () => {
    expectTypeOf(toInteger).returns.toEqualTypeOf<Converted<number>>();
    expectTypeOf(toDate).returns.toEqualTypeOf<Converted<Date>>();
    expectTypeOf(toEnum('a', ['a', 'b'] as const)).toEqualTypeOf<Converted<'a' | 'b'>>();
    expectTypeOf(canBeEnum).returns.toEqualTypeOf<boolean>();
  });

  it('result.ok narrows: value is T when ok; value null + error otherwise', () => {
    const r = toInteger('42');
    if (r.ok) {
      expectTypeOf(r.value).toEqualTypeOf<number>();
    } else {
      expectTypeOf(r.value).toEqualTypeOf<null>();
      expectTypeOf(r.error).toEqualTypeOf<ConvertMessage>();
    }
    expect(r).toEqual({ ok: true, value: 42, error: null });
    expect(toInteger('x')).toEqual({ ok: false, value: null, error: 'Value is not an integer' });
  });

  it('Validations types each built-in validation with the properties of its validator', () => {
    Validations([
      { validator: 'isInt', properties: { min: 2 } },
      { validator: 'isMobilePhone', properties: { locale: 'es-ES', strictMode: true } },
      { validator: 'isLength', properties: { min: 2, max: 10 } },
      { custom: 'isEven', fn: (v) => Number(v) % 2 === 0 },
    ]);
    // @ts-expect-error isInt has no "foo" option
    void (() => Validations([{ validator: 'isInt', properties: { foo: 1 } }]));
    // @ts-expect-error isHash requires its algorithm
    void (() => Validations([{ validator: 'isHash' }]));
    // @ts-expect-error properties is always an object, never a shorthand
    void (() => Validations([{ validator: 'isHash', properties: 'md5' }]));
    // @ts-expect-error nor the shorthand forms of an options parameter
    void (() => Validations([{ validator: 'isLength', properties: 2 }]));
    // @ts-expect-error "options" no longer exists
    void (() => Validations([{ validator: 'isEmail', options: {} }]));
    // @ts-expect-error isPort takes no properties
    void (() => Validations([{ validator: 'isPort', properties: {} }]));
    // @ts-expect-error a custom validation is named with "custom", not "validator"
    void (() => Validations([{ validator: 'isEven', fn: () => true }]));
    // @ts-expect-error a validation has "validator" or "custom", never both
    void (() => Validations([{ validator: 'isInt', custom: 'isEven', fn: () => true }]));
    Validations([
      { validator: 'isHash', properties: { algorithm: 'md5' } },
      { validator: 'isEmail' },
      { validator: 'isPort' },
    ]);
    // @ts-expect-error unknown validator
    void (() => Validations([{ validator: 'isNothing' }]));
  });

  it('validate takes a class and the value, and returns the result', () => {
    abstract class Base {
      abstract id: string;
    }
    expect(validate(Base, '5')).toEqual({ ok: true, value: '5', errors: [] });
    // @ts-expect-error an instance is not a class
    void (() => validate({}, '5'));
    // @ts-expect-error the list form no longer exists
    void (() => validate([{ validator: 'isInt' }], '5'));
    expectTypeOf(validate(Base, '5')).toEqualTypeOf<ValidationResult<string>>();
    expectTypeOf<ValidationResult<number>>().toEqualTypeOf<
      ValidationSuccess<number> | ValidationFailure<number>
    >();
    expectTypeOf<ValidationSuccess<number>>().toEqualTypeOf<{
      readonly ok: true;
      readonly value: number;
      readonly errors: readonly [];
    }>();
    expectTypeOf<ValidationFailure<number>>().toEqualTypeOf<{
      readonly ok: false;
      readonly value: number;
      readonly errors: readonly ValidationError[];
    }>();
    expectTypeOf<ValidationError>().toEqualTypeOf<
      { validator: string; message: string } | { custom: string; message: string }
    >();
    expectTypeOf<Validatable<number>>().toEqualTypeOf<{ validate(): ValidationResult<number> }>();
  });

  it('every validator takes the value and, at most, one options object', () => {
    type NonStandardValidators = {
      [K in keyof ValidatorRegistry]: ValidatorRegistry[K] extends (...args: any[]) => boolean
        ? Parameters<ValidatorRegistry[K]> extends
            | [value: unknown]
            | [value: unknown, options?: object]
            | [value: unknown, options: object]
          ? Parameters<ValidatorRegistry[K]>[0] extends unknown
            ? unknown extends Parameters<ValidatorRegistry[K]>[0]
              ? never
              : K
            : K
          : K
        : never;
    }[keyof ValidatorRegistry];
    expectTypeOf<NonStandardValidators>().toEqualTypeOf<never>();
    expectTypeOf<ValidationProperties<'isPort'>>().toEqualTypeOf<never>();
    expectTypeOf<ValidationProperties<'isInt'>>().toEqualTypeOf<IsIntOptions>();
    expectTypeOf<ValidationProperties<'isHash'>>().toEqualTypeOf<IsHashOptions>();
    expectTypeOf<IsHashOptions>().toEqualTypeOf<{ algorithm: HashAlgorithm }>();
  });

  it('ValidationConfigError is exported and carries its name at runtime', () => {
    expect(new ValidationConfigError('x').name).toBe('ValidationConfigError');
  });

  describe('autocomplete of validator options', () => {
    it('each validator exposes its named options type', () => {
      expectTypeOf(validator.isEmail).parameter(1).toEqualTypeOf<IsEmailOptions | undefined>();
      expectTypeOf(validator.isRgbColor)
        .parameter(1)
        .toEqualTypeOf<IsRgbColorOptions | undefined>();
      expectTypeOf<ValidatorRegistry>().toEqualTypeOf<typeof validator>();
    });

    it('options the registry used to hide are now typed', () => {
      expectTypeOf(validator.isRgbColor).toBeCallableWith('rgb(1, 2, 3)', { allowSpaces: true });
      expectTypeOf<IsISO31661Alpha2Options>().toHaveProperty('userAssignedCodes');
    });

    it('unknown options are compile errors (the editor flags them)', () => {
      // @ts-expect-error — not an option of isEmail
      validator.isEmail('a@b.com', { not_an_option: true });
      // @ts-expect-error — typo of allow_display_name
      validator.isEmail('a@b.com', { allow_display_nam: true });
      expect(true).toBe(true);
    });

    it('known locales / countries / algorithms are suggested, any string still accepted', () => {
      expectTypeOf<'es-ES'>().toMatchTypeOf<MobilePhoneLocale>();
      expectTypeOf<Extract<MobilePhoneLocale, 'es-ES'>>().toEqualTypeOf<'es-ES'>();
      expectTypeOf<Extract<HashAlgorithm, 'sha256'>>().toEqualTypeOf<'sha256'>();
      expectTypeOf<Extract<VATCountryCode, 'ES'>>().toEqualTypeOf<'ES'>();
      expectTypeOf<Extract<CreditCardProvider, 'visa'>>().toEqualTypeOf<'visa'>();
      expectTypeOf<IsCreditCardOptions['provider']>().toEqualTypeOf<
        CreditCardProvider | undefined
      >();
      expectTypeOf(validator.isMobilePhone).toBeCallableWith('600000000', {
        locale: 'any-other-string',
      });
    });
  });
});

describe('tree-shakable named exports', () => {
  const exported = api as unknown as Record<string, unknown>;

  it('every member of the validator registry is exported by name, as the same function / list', () => {
    for (const [name, member] of Object.entries(validator)) {
      expect(exported[name]).toBe(member);
    }
    expect(api.isEmail('ana@example.com')).toBe(true);
    expectTypeOf(api.isEmail).toEqualTypeOf<typeof validator.isEmail>();
  });

  it('named validator exports come straight from their own file (never through the registry barrel)', () => {
    const index = fs.readFileSync(path.join(__dirname, '../src/index.ts'), 'utf8');
    const fromBarrel = [...index.matchAll(/export \{([^}]*)\} from '\.\/validators';/g)].map((m) =>
      m[1].trim(),
    );
    expect(fromBarrel).toEqual(['validator']);
  });

  it('no validator module imports the registry barrel (it would pull every validator into the bundle)', () => {
    const dir = path.join(__dirname, '../src/validators');
    const offenders = fs
      .readdirSync(dir, { recursive: true, encoding: 'utf8' })
      .filter((f) => f.endsWith('.ts') && f !== 'index.ts')
      .filter((f) =>
        /from '\.\.?\/(?:\.\.\/)?(?:validators\/?)?(?:index)?'/.test(
          fs.readFileSync(path.join(dir, f), 'utf8'),
        ),
      );
    expect(offenders).toEqual([]);
  });
});
