import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import { Validations } from '@archi-code/validation';
import type { ValidationResult } from '@archi-code/validation';
import { BooleanType } from '../../../src/domain/type/boolean-type';
import { AbstractType } from '../../../src/domain/type/abstract-type';
import { Required } from '../../../src/domain/type/required/required-type';
import { TypePrimitiveException } from '../../../src/domain/exceptions/type-primitive.exception';
import { RequiredValueException } from '../../../src/domain/exceptions/required-value.exception';
import { ValidationException } from '../../../src/domain/exceptions/validation.exception';

class AcceptsMarketing extends BooleanType {}
class IsGift extends BooleanType {}
class EmailVerified extends Required(BooleanType) {}

@Validations([{ custom: 'isAccepted', fn: (value) => value === true, message: 'Must be accepted' }])
class AcceptsTerms extends Required(BooleanType) {}

const formInputs: [string, unknown, boolean][] = [
  ['a checked checkbox from a JSON body', true, true],
  ['an unchecked checkbox from a JSON body', false, false],
  ['a 1 stored by a legacy database', 1, true],
  ['a 0 stored by a legacy database', 0, false],
  ['"true" from a query string', 'true', true],
  ['"false" from a query string', 'false', false],
  ['"TRUE" from a CSV import', 'TRUE', true],
  ['" False " with spaces from a CSV import', ' False ', false],
  ['"1" from a form post', '1', true],
  ['"0" from a form post', '0', false],
];

const blankFormFields: [string, unknown][] = [
  ['a field sent as null', null],
  ['a field left out of the request', undefined],
];

const brokenClientInputs: [string, unknown, string][] = [
  ['an empty form value', '', '""'],
  ['a form value with only spaces', '   ', '"   "'],
  ['"yes"', 'yes', '"yes"'],
  ['"no"', 'no', '"no"'],
  ['a word', 'abc', '"abc"'],
  ['the number 2', 2, '2'],
  ['the number -1', -1, '-1'],
  ['NaN', NaN, 'NaN'],
  ['an object', { a: 1 }, '{"a":1}'],
  ['an empty list', [], '[]'],
];

function primitiveError(received: string): string {
  return `Validation Error: Expected a valid Boolean, but received ${received}.`;
}

function requiredError(typeName: string, received: string): string {
  return `Validation Error: ${typeName} is required, but received ${received}.`;
}

function thrownBy(run: () => unknown): unknown {
  try {
    run();
  } catch (error) {
    return error;
  }
  return undefined;
}

function consents() {
  const isTrue = vi.fn((value: unknown) => value === true);

  @Validations([{ custom: 'isTrue', fn: isTrue }])
  class AcceptsCookies extends BooleanType {}

  @Validations([{ custom: 'isTrue', fn: isTrue }])
  class AcceptsPrivacyPolicy extends Required(BooleanType) {}

  return { AcceptsCookies, AcceptsPrivacyPolicy, isTrue };
}

function issuesOf(build: () => unknown): unknown {
  return (thrownBy(build) as ValidationException).errors;
}

const isTrueBroken = (type: string) => [
  { field: null, code: 'isTrue', message: `${type}: Value does not satisfy isTrue` },
];

describe('BooleanType', () => {
  describe('an optional marketing consent', () => {
    it('is typed as boolean | null, built from a boolean, null or nothing', () => {
      expectTypeOf<AcceptsMarketing>().toMatchTypeOf<AbstractType<boolean>>();
      expectTypeOf<ConstructorParameters<typeof AcceptsMarketing>>().toEqualTypeOf<
        [value?: boolean | null]
      >();
      expectTypeOf<AcceptsMarketing['value']>().toEqualTypeOf<boolean | null>();
      expectTypeOf<AcceptsMarketing['validate']>().toEqualTypeOf<
        () => ValidationResult<boolean | null>
      >();
    });

    it('cannot be used as a plain boolean without checking for null', () => {
      // @ts-expect-error an optional value may be null
      const flag: boolean = new AcceptsMarketing(true).value;
      expect(flag).toBe(true);
    });

    it.each(formInputs)('turns %s into a boolean', (_, input, expected) => {
      expect(new AcceptsMarketing(input as boolean).value).toBe(expected);
      expect(new AcceptsMarketing(input as boolean).validate()).toEqual({
        ok: true,
        value: expected,
        errors: [],
      });
    });

    it.each(blankFormFields)('stores %s as null, meaning "not answered yet"', (_, input) => {
      expect(new AcceptsMarketing(input as boolean).value).toBeNull();
      expect(new AcceptsMarketing(input as boolean).validate()).toEqual({
        ok: true,
        value: null,
        errors: [],
      });
    });

    it('is null when the question was never asked', () => {
      expect(new AcceptsMarketing().value).toBeNull();
    });

    it.each(brokenClientInputs)(
      'rejects %s sent by a broken client with TypePrimitiveException',
      (_, input, received) => {
        const create = () => new AcceptsMarketing(input as boolean);
        expect(create).toThrow(TypePrimitiveException);
        expect(create).toThrow(primitiveError(received));
      },
    );
  });

  describe('a required email verified flag', () => {
    it('is typed as boolean and built only from a boolean', () => {
      expectTypeOf<ConstructorParameters<typeof EmailVerified>>().toEqualTypeOf<[value: boolean]>();
      expectTypeOf<EmailVerified['value']>().toEqualTypeOf<boolean>();
      expectTypeOf<EmailVerified['validate']>().toEqualTypeOf<() => ValidationResult<boolean>>();
    });

    it('does not compile without a flag, but still throws if one sneaks in at runtime', () => {
      // @ts-expect-error a required boolean needs a value
      expect(() => new EmailVerified()).toThrow(RequiredValueException);
      // @ts-expect-error a required boolean does not accept null
      expect(() => new EmailVerified(null)).toThrow(RequiredValueException);
      // @ts-expect-error a required boolean does not accept undefined
      expect(() => new EmailVerified(undefined)).toThrow(RequiredValueException);
      // @ts-expect-error a required boolean does not accept a string
      expect(new EmailVerified('true').value).toBe(true);
    });

    it.each(formInputs)('turns %s into a flag, false included', (_, input, expected) => {
      expect(new EmailVerified(input as boolean).value).toBe(expected);
      expect(new EmailVerified(input as boolean).validate()).toEqual({
        ok: true,
        value: expected,
        errors: [],
      });
    });

    it.each(blankFormFields)(
      'rejects %s with a RequiredValueException naming the type',
      (_, input) => {
        const create = () => new EmailVerified(input as boolean);
        expect(create).toThrow(RequiredValueException);
        expect(create).toThrow(requiredError('EmailVerified', 'null'));
      },
    );

    it('rejects "yes" with TypePrimitiveException', () => {
      expect(() => new EmailVerified('yes' as unknown as boolean)).toThrow(primitiveError('"yes"'));
    });

    it('does not make the plain BooleanType required', () => {
      expect(new BooleanType(null).validate()).toEqual({ ok: true, value: null, errors: [] });
    });
  });

  describe('consents that must be given', () => {
    it('an optional cookie consent cannot be built as false once answered', () => {
      const { AcceptsCookies } = consents();
      expect(new AcceptsCookies(true).validate()).toEqual({ ok: true, value: true, errors: [] });
      expect(issuesOf(() => new AcceptsCookies(false))).toEqual(isTrueBroken('AcceptsCookies'));
    });

    it.each(blankFormFields)(
      'an unanswered cookie consent (%s) is valid without running the rule',
      (_, input) => {
        const { AcceptsCookies, isTrue } = consents();
        expect(new AcceptsCookies(input as boolean).validate()).toEqual({
          ok: true,
          value: null,
          errors: [],
        });
        expect(isTrue).not.toHaveBeenCalled();
      },
    );

    it('a required privacy policy consent of false is present but cannot be built', () => {
      const { AcceptsPrivacyPolicy } = consents();
      expect(new AcceptsPrivacyPolicy(true).validate()).toEqual({
        ok: true,
        value: true,
        errors: [],
      });
      expect(issuesOf(() => new AcceptsPrivacyPolicy(false))).toEqual(
        isTrueBroken('AcceptsPrivacyPolicy'),
      );
    });

    it('signing up with the terms accepted builds the consent', () => {
      expect(new AcceptsTerms(true).value).toBe(true);
    });

    it('signing up without accepting the terms throws ValidationException', () => {
      const signUp = () => new AcceptsTerms(false);
      expect(signUp).toThrow(ValidationException);
      expect(signUp).toThrow('Validation failed, AcceptsTerms: Must be accepted');
      expect(issuesOf(signUp)).toEqual([
        { field: null, code: 'isAccepted', message: 'AcceptsTerms: Must be accepted' },
      ]);
    });
  });

  describe('comparing flags', () => {
    it('two consents with the same answer are equal', () => {
      expect(
        new AcceptsMarketing(true).equals(new AcceptsMarketing('true' as unknown as boolean)),
      ).toBe(true);
    });

    it('two consents with different answers are not equal', () => {
      expect(new AcceptsMarketing(true).equals(new AcceptsMarketing(false))).toBe(false);
    });

    it('a marketing consent and a gift flag with the same answer are not equal', () => {
      expect(new AcceptsMarketing(true).equals(new IsGift(true))).toBe(false);
    });

    it('two unanswered consents are equal', () => {
      expect(new AcceptsMarketing().equals(new AcceptsMarketing(null))).toBe(true);
    });
  });

  describe('showing and serializing a flag', () => {
    it.each([
      ['true', new AcceptsMarketing(true), 'true'],
      ['false', new AcceptsMarketing(false), 'false'],
      ['an unanswered consent', new AcceptsMarketing(null), ''],
    ])('toString() of %s gives %o', (_, flag, text) => {
      expect(flag.toString()).toBe(text);
    });

    it('can be used in a template literal for an audit log line', () => {
      expect(`marketing=${new AcceptsMarketing(false)}`).toBe('marketing=false');
    });
  });
});
