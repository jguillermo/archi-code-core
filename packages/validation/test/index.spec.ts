/**
 * Compile-time contract of the public API (checked by ts-jest diagnostics / tsc --noEmit).
 */
import { describe, expect, it } from '@jest/globals';
import { expectTypeOf } from 'expect-type';
import {
  validator,
  createValidator,
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
  IsISO31661Options,
  MobilePhoneLocale,
  HashAlgorithm,
  VATCountryCode,
  IsCreditCardOptions,
  CreditCardProvider,
} from '../src';

describe('public types', () => {
  it('validators return boolean', () => {
    expectTypeOf(validator.isEmail).returns.toEqualTypeOf<boolean>();
    expectTypeOf(validator.isStrongPassword('x')).toEqualTypeOf<boolean>();
    expectTypeOf(validator.isStrongPassword('x', { returnScore: true })).toEqualTypeOf<
      number | false
    >();
    expectTypeOf(scorePassword).returns.toEqualTypeOf<number>();
  });

  it('options match the implementation', () => {
    expectTypeOf(validator.isAfter).toBeCallableWith('2024-01-01', {
      comparisonDate: '2023-01-01',
    });
    expectTypeOf(validator.isAfter).toBeCallableWith('2024-01-01', '2023-01-01');
    expectTypeOf(validator.isUUID).toBeCallableWith('x', 'loose');
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

  it('createValidator merges the registry with the extensions', () => {
    const v = createValidator({ isAnswer: (x: unknown): boolean => x === 42 });
    expectTypeOf(v.isAnswer).toEqualTypeOf<(x: unknown) => boolean>();
    expectTypeOf(v.isEmail).returns.toEqualTypeOf<boolean>();
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
      expectTypeOf<IsISO31661Options>().toHaveProperty('userAssignedCodes');
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
      expectTypeOf(validator.isMobilePhone).toBeCallableWith('600000000', 'any-other-string');
    });
  });
});
