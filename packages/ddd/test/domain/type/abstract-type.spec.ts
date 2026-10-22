import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import { Validations } from '@archi-code/validation';
import type { Validatable, ValidationResult } from '@archi-code/validation';
import { AbstractType } from '../../../src/domain/type/abstract-type';
import { Required } from '../../../src/domain/type/required/required';
import { RequiredValueException } from '../../../src/exceptions/domain/required-value.exception';
import { TypePrimitiveException } from '../../../src/exceptions/domain/type-primitive.exception';
import { ValidationException } from '../../../src/exceptions/domain/validation.exception';

class CountryCode extends AbstractType<string> {
  static spain(): CountryCode {
    return new CountryCode('ES');
  }

  protected filter(value: unknown): string {
    if (typeof value !== 'string' || !/^[a-z]{2}$/i.test(value.trim())) {
      throw new TypePrimitiveException('CountryCode', value);
    }
    return value.trim().toUpperCase();
  }
}

class BillingCountry extends Required(CountryCode) {}

class ShippingCountry extends CountryCode {}

class Discount extends AbstractType<number> {
  protected filter(value: unknown): number | null {
    return value === 'none' ? null : Number(value);
  }
}

class RequiredDiscount extends Required(Discount) {}

class GeoPoint extends AbstractType<{ lat: number; lng: number }> {
  protected filter(value: unknown): { lat: number; lng: number } {
    return Object.freeze({ ...(value as { lat: number; lng: number }) });
  }

  protected hasSameValue(other: this): boolean {
    return this._value?.lat === other._value?.lat && this._value?.lng === other._value?.lng;
  }
}

class Coordinates extends AbstractType<{ lat: number; lng: number }> {
  protected filter(value: unknown): { lat: number; lng: number } {
    return Object.freeze({ ...(value as { lat: number; lng: number }) });
  }
}

@Validations([{ validator: 'isEmail' }])
class Email extends AbstractType<string> {
  protected filter(value: unknown): string {
    return String(value).trim().toLowerCase();
  }
}

class CustomerEmail extends Required(Email) {}

function spiedCountryCode() {
  const filterSpy = vi.fn((value: unknown) => String(value));
  class SpiedCountry extends AbstractType<string> {
    protected filter(value: unknown): string {
      return filterSpy(value);
    }
  }
  return { SpiedCountry, filterSpy };
}

const valid = <T>(value: T) => ({ ok: true, value, errors: [] });

function issuesOf(build: () => unknown): unknown {
  try {
    build();
  } catch (error) {
    return (error as ValidationException).errors;
  }
  return undefined;
}

describe('AbstractType: writing a custom value object', () => {
  describe('typing', () => {
    it('an optional value object takes T, null or nothing and exposes T | null', () => {
      expectTypeOf<ConstructorParameters<typeof CountryCode>>().toEqualTypeOf<
        [value?: string | null]
      >();
      expectTypeOf<CountryCode['value']>().toEqualTypeOf<string | null>();
      expectTypeOf<CountryCode['validate']>().toEqualTypeOf<
        () => ValidationResult<string | null>
      >();
      expectTypeOf<CountryCode>().toMatchTypeOf<Validatable<string | null>>();
    });

    it('a required value object takes only T and exposes T', () => {
      expectTypeOf<ConstructorParameters<typeof BillingCountry>>().toEqualTypeOf<[value: string]>();
      expectTypeOf<BillingCountry['value']>().toEqualTypeOf<string>();
      expectTypeOf<BillingCountry>().toMatchTypeOf<Validatable<string>>();
    });

    it('the value of an optional value object cannot be used where a plain T is expected', () => {
      // @ts-expect-error an optional value may be null
      const code: string = new CountryCode('es').value;
      expect(code).toBe('ES');
    });

    it('exposes isNull, toString() and equals(), and no assertValid()', () => {
      expectTypeOf<CountryCode['isNull']>().toEqualTypeOf<boolean>();
      expectTypeOf<CountryCode['toString']>().toEqualTypeOf<() => string>();
      expectTypeOf<CountryCode['equals']>().toEqualTypeOf<
        <E extends AbstractType<any>>(other: E) => boolean
      >();
      expectTypeOf<CountryCode>().not.toHaveProperty('assertValid');
    });

    it('the stored value cannot be reassigned from a subclass', () => {
      class Resettable extends CountryCode {
        reset(): void {
          // @ts-expect-error the value of a value object is readonly
          this._value = null;
        }
      }
      expect(typeof Resettable.prototype.reset).toBe('function');
    });
  });

  describe('building it from user input', () => {
    it('a country typed in a form as " es " is stored as "ES"', () => {
      expect(new CountryCode(' es ').value).toBe('ES');
    });

    it('passes the raw input to filter exactly once', () => {
      const { SpiedCountry, filterSpy } = spiedCountryCode();
      new SpiedCountry(' pt ');
      expect(filterSpy).toHaveBeenCalledTimes(1);
      expect(filterSpy).toHaveBeenCalledWith(' pt ');
    });

    it.each([
      ['a field that was not sent', []],
      ['a JSON null', [null]],
      ['an undefined property', [undefined]],
    ])('%s is stored as null without calling filter', (_, args) => {
      const { SpiedCountry, filterSpy } = spiedCountryCode();
      const country = new SpiedCountry(...(args as [string | null]));
      expect(country.value).toBeNull();
      expect(filterSpy).not.toHaveBeenCalled();
    });

    it.each([
      ['an empty text box', ''],
      ['a text box with only spaces and line breaks', ' \t\n '],
    ])('%s is a value: filter receives it and decides', (_, input) => {
      const { SpiedCountry, filterSpy } = spiedCountryCode();
      expect(new SpiedCountry(input).value).toBe(input);
      expect(filterSpy).toHaveBeenCalledWith(input);
    });

    it.each([
      ['a zero discount', 0, 0],
      ['a discount sent as false by a checkbox', false, 0],
    ])('keeps %s: falsy input is still a value', (_, input, expected) => {
      expect(new Discount(input as unknown as number).value).toBe(expected);
    });

    it('stores what filter returns, so filter can turn a sentinel like "none" into null', () => {
      expect(new Discount('none' as unknown as number).value).toBeNull();
    });

    it.each([
      ['NaN', NaN],
      ['an empty list', []],
      ['an empty object', {}],
      ['a name with surrounding spaces', ' pt '],
    ])('hands %s to filter: only null, undefined and blank text count as missing', (_, input) => {
      const { SpiedCountry, filterSpy } = spiedCountryCode();
      new SpiedCountry(input as string);
      expect(filterSpy).toHaveBeenCalledWith(input);
    });

    it('reports what the user typed when a required type turns it into null', () => {
      class RequiredDiscount extends Required(Discount) {}
      expect(() => new RequiredDiscount('none' as unknown as number)).toThrow(
        'Validation Error: RequiredDiscount is required, but received "none".',
      );
    });

    it('rejects input filter does not understand, with the exception filter throws', () => {
      const create = () => new CountryCode('Spain');
      expect(create).toThrow(TypePrimitiveException);
      expect(create).toThrow(
        'Validation Error: Expected a valid CountryCode, but received "Spain".',
      );
    });

    it('keeps static factories of the custom type', () => {
      expect(CountryCode.spain().value).toBe('ES');
    });
  });

  describe('reading it', () => {
    it.each([
      ['a country that was not given', new CountryCode(), true, ''],
      ['a country', new CountryCode('fr'), false, 'FR'],
      ['a zero discount', new Discount(0), false, '0'],
      ['a negative discount', new Discount(-1.5), false, '-1.5'],
      [
        'a discount turned into null by filter',
        new Discount('none' as unknown as number),
        true,
        '',
      ],
    ])('%s → isNull %s, toString() %o', (_, valueObject, isNull, text) => {
      expect(valueObject.isNull).toBe(isNull);
      expect(valueObject.toString()).toBe(text);
    });

    it('can be written into a log line or a message with a template literal', () => {
      const country = new CountryCode('it');
      expect(`Shipping to ${country}`).toBe('Shipping to IT');
      expect(String(new CountryCode())).toBe('');
    });
  });

  describe('recognizing value objects built by another copy of the package (CJS and ESM side by side)', () => {
    it('a value object of the other copy is still an AbstractType', async () => {
      vi.resetModules();
      const other = await import('../../../src/domain/type/string-type');
      const otherBase = await import('../../../src/domain/type/abstract-type');
      expect(otherBase.AbstractType).not.toBe(AbstractType);
      expect(new other.StringType('Huelva')).toBeInstanceOf(AbstractType);
      expect(new CountryCode('es')).toBeInstanceOf(otherBase.AbstractType);
    });

    it('only the base class matches by brand: concrete classes keep the normal instanceof', async () => {
      vi.resetModules();
      const other = await import('../../../src/domain/type/string-type');
      const { StringType } = await import('../../../src/domain/type/string-type');
      expect(new other.StringType('x')).toBeInstanceOf(StringType);
      expect(new CountryCode('es')).not.toBeInstanceOf(StringType);
      expect(new CountryCode('es')).not.toBeInstanceOf(ShippingCountry);
    });

    it.each([
      ['null', null],
      ['a raw text', 'ES'],
      ['a plain object', { _value: 'ES' }],
    ])('%s is not a value object', (_, candidate) => {
      expect(candidate).not.toBeInstanceOf(AbstractType);
    });
  });

  describe('comparing two value objects', () => {
    it('two countries built from different spellings of the same code are equal', () => {
      expect(new CountryCode('es').equals(new CountryCode(' ES '))).toBe(true);
    });

    it('two countries with different codes are not equal', () => {
      expect(new CountryCode('es').equals(new CountryCode('pt'))).toBe(false);
    });

    it('two empty optional countries of the same class are equal', () => {
      expect(new ShippingCountry().equals(new ShippingCountry(null))).toBe(true);
    });

    it('a billing country and a shipping country with the same code are different concepts', () => {
      expect(new BillingCountry('es').equals(new ShippingCountry('es'))).toBe(false);
      expect(new ShippingCountry('es').equals(new CountryCode('es'))).toBe(false);
    });

    it('compares a structured value by content when the subclass says how (hasSameValue)', () => {
      const office = new GeoPoint({ lat: 37.26, lng: -6.95 });
      expect(office.equals(new GeoPoint({ lng: -6.95, lat: 37.26 }))).toBe(true);
      expect(office.equals(new GeoPoint({ lat: 37.26, lng: -6.9 }))).toBe(false);
    });

    it('compares a structured value by reference when the subclass does not say how', () => {
      const office = { lat: 37.26, lng: -6.95 };
      expect(new Coordinates(office).equals(new Coordinates(office))).toBe(false);
      expect(new Coordinates().equals(new Coordinates(null))).toBe(true);
    });

    it('only accepts another value object at compile time', () => {
      // @ts-expect-error a raw code is not a value object
      expect(new CountryCode('es').equals('ES')).toBe(false);
      // @ts-expect-error a missing country is not a value object
      expect(new CountryCode('es').equals(null)).toBe(false);
    });

    it.each([
      ['null', null],
      ['undefined', undefined],
      ['the raw code', 'ES'],
      ['a plain object with the same value', { value: 'ES' }],
    ])('a country is never equal to %s', (_, other) => {
      expect(new CountryCode('es').equals(other as unknown as CountryCode)).toBe(false);
    });
  });

  describe('always valid: the constructor checks the rules declared with @Validations', () => {
    it('a well formed email is built and validate() confirms it', () => {
      const email = new Email(' Ana@Example.com ');
      expect(email.value).toBe('ana@example.com');
      expect(email.validate()).toEqual(valid('ana@example.com'));
    });

    it('a malformed email cannot be built: ValidationException names the class and the rule', () => {
      const build = () => new Email('ana');
      expect(build).toThrow(ValidationException);
      expect(build).toThrow('Validation failed, Email: Value does not satisfy isEmail');
      expect(issuesOf(build)).toEqual([
        { field: null, code: 'isEmail', message: 'Email: Value does not satisfy isEmail' },
      ]);
    });

    it('reports every broken rule at once, not only the first one', () => {
      @Validations([{ validator: 'isLength', properties: { min: 6 } }])
      class SignUpEmail extends CustomerEmail {}

      const signUp = () => new SignUpEmail('a@b');
      expect(signUp).toThrow(
        'Validation failed, SignUpEmail: Value does not satisfy isEmail, SignUpEmail: Value does not satisfy isLength',
      );
      expect(issuesOf(signUp)).toEqual([
        { field: null, code: 'isEmail', message: 'SignUpEmail: Value does not satisfy isEmail' },
        { field: null, code: 'isLength', message: 'SignUpEmail: Value does not satisfy isLength' },
      ]);
    });

    it('a value object without declared validations is always built', () => {
      expect(new CountryCode('es').validate()).toEqual(valid('ES'));
    });

    it('an optional email that was not given is built without running its validations', () => {
      const isCorporate = vi.fn(() => false);

      @Validations([{ custom: 'isCorporate', fn: isCorporate }])
      class WorkEmail extends Email {}

      expect(new WorkEmail().value).toBeNull();
      expect(isCorporate).not.toHaveBeenCalled();
    });

    it('checks the filtered value, not what the user typed', () => {
      const isLowercase = vi.fn((value: unknown) => value === String(value).toLowerCase());

      @Validations([{ custom: 'isLowercase', fn: isLowercase }])
      class NormalizedEmail extends Email {}

      expect(new NormalizedEmail(' ANA@EXAMPLE.COM ').value).toBe('ana@example.com');
      expect(isLowercase).toHaveBeenCalledWith('ana@example.com');
    });

    it('a subclass adds its rules after the inherited ones', () => {
      @Validations([
        { custom: 'isCorporate', fn: (value) => String(value).endsWith('@acme.example') },
      ])
      class WorkEmail extends CustomerEmail {}

      expect(issuesOf(() => new WorkEmail('ana'))).toEqual([
        { field: null, code: 'isEmail', message: 'WorkEmail: Value does not satisfy isEmail' },
        {
          field: null,
          code: 'isCorporate',
          message: 'WorkEmail: Value does not satisfy isCorporate',
        },
      ]);
      expect(issuesOf(() => new WorkEmail('ana@gmail.com'))).toEqual([
        {
          field: null,
          code: 'isCorporate',
          message: 'WorkEmail: Value does not satisfy isCorporate',
        },
      ]);
      expect(new WorkEmail('ana@acme.example').value).toBe('ana@acme.example');
    });

    it('runs the rules once when the value object is built', () => {
      const isPositive = vi.fn(() => true);

      @Validations([{ custom: 'isPositive', fn: isPositive }])
      class PositiveDiscount extends Discount {}

      new PositiveDiscount(5);
      expect(isPositive).toHaveBeenCalledTimes(1);
      expect(isPositive).toHaveBeenCalledWith(5);
    });

    it('validate() runs the rules again on every call and returns a new frozen result', () => {
      const email = new Email('ana@example.com');
      const first = email.validate();
      const second = email.validate();
      expect(second).not.toBe(first);
      expect(second).toEqual(first);
      expect(Object.isFrozen(first)).toBe(true);
      expect(Object.isFrozen(first.errors)).toBe(true);
    });

    it('keeps no validation state in the instance', () => {
      const email = new Email('ana@example.com');
      email.validate();
      expect(Object.keys(email)).toEqual(['_value']);
    });
  });

  describe('Required(...): a value object that must always have a value', () => {
    it('a missing billing country throws RequiredValueException with the class name', () => {
      // @ts-expect-error a required value object needs a value
      expect(() => new BillingCountry()).toThrow(RequiredValueException);
      expect(() => new BillingCountry(null as unknown as string)).toThrow(
        'Validation Error: BillingCountry is required, but received null.',
      );
    });

    it('does not call filter for a missing value', () => {
      const { SpiedCountry, filterSpy } = spiedCountryCode();
      class RequiredSpied extends Required(SpiedCountry) {}
      expect(() => new RequiredSpied(null as unknown as string)).toThrow(RequiredValueException);
      expect(filterSpy).not.toHaveBeenCalled();
    });

    it('throws when filter turns the input into null, reporting what was received', () => {
      expect(() => new RequiredDiscount('none' as unknown as number)).toThrow(
        'Validation Error: RequiredDiscount is required, but received "none".',
      );
    });

    it('throws before any declared rule runs', () => {
      const isCorporate = vi.fn(() => true);

      @Validations([{ custom: 'isCorporate', fn: isCorporate }])
      class WorkEmail extends CustomerEmail {}

      expect(() => new WorkEmail(null as unknown as string)).toThrow(RequiredValueException);
      expect(isCorporate).not.toHaveBeenCalled();
    });

    it('a zero discount is a present value', () => {
      expect(new RequiredDiscount(0).validate()).toEqual(valid(0));
    });

    it('keeps the wrapped type: instanceof, static factories and validations', () => {
      expect(new BillingCountry('es')).toBeInstanceOf(CountryCode);
      expect(BillingCountry.spain().value).toBe('ES');
      expect(issuesOf(() => new CustomerEmail('ana'))).toEqual([
        { field: null, code: 'isEmail', message: 'CustomerEmail: Value does not satisfy isEmail' },
      ]);
    });

    it('does not make the wrapped type required', () => {
      expect(new CountryCode(null).validate()).toEqual(valid(null));
    });
  });
});
