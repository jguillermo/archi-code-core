import { describe, expect, it, jest } from '@jest/globals';
import { expectTypeOf } from 'expect-type';
import { Validations, isUUID } from '@archi-code/validation';
import type { ValidationResult } from '@archi-code/validation';
import { IdType, UuidType } from './uuid-type';
import { AbstractType, Required } from './abstract-type';
import { TypePrimitiveException } from '../exceptions/domain/type-primitive.exception';
import { RequiredValueException } from '../exceptions/domain/required-value.exception';

class RequiredUuid extends Required(UuidType) {}

const V4 = 'df9ef000-21fc-4e06-b8f7-103c3a133d10';

const convertibleInputs: [string][] = [
  [V4],
  ['DF9EF000-21FC-4E06-B8F7-103C3A133D10'],
  ['6ba7b810-9dad-11d1-80b4-00c04fd430c8'],
  ['00000000-0000-0000-0000-000000000000'],
  ['ffffffff-ffff-ffff-ffff-ffffffffffff'],
];

const emptyInputs: [string, unknown][] = [
  ['null', null],
  ['undefined', undefined],
  ['an empty string', ''],
  ['only spaces', '   '],
];

const notConvertibleInputs: [unknown, string][] = [
  ['abc', '"abc"'],
  ['df9ef000-21fc-4e06-b8f7-103c3a133d1', '"df9ef000-21fc-4e06-b8f7-103c3a133d1"'],
  ['df9ef000-21fc-9e06-b8f7-103c3a133d10', '"df9ef000-21fc-9e06-b8f7-103c3a133d10"'],
  [` ${V4} `, `" ${V4} "`],
  [123, '123'],
  [true, 'true'],
  [{ a: 1 }, '{"a":1}'],
  [[], '[]'],
];

function primitiveError(received: string): string {
  return `Validation Error: Expected a valid UUID, but received ${received}.`;
}

function requiredError(received: string): string {
  return `Validation Error: RequiredUuid is required, but received ${received}.`;
}

function versionFourIds() {
  const isV4 = jest.fn((value: unknown) => isUUID(value, { version: 4 }));

  @Validations([{ custom: 'isV4', fn: isV4 }])
  class OptionalV4 extends UuidType {}

  @Validations([{ custom: 'isV4', fn: isV4 }])
  class RequiredV4 extends Required(UuidType) {}

  return { OptionalV4, RequiredV4, isV4 };
}

const isV4Error = { custom: 'isV4', message: 'Value does not satisfy isV4' };

describe('UuidType (optional)', () => {
  describe('typing', () => {
    it('is an AbstractType of string that takes a string, null or nothing and holds string | null', () => {
      expectTypeOf<UuidType>().toMatchTypeOf<AbstractType<string>>();
      expectTypeOf<ConstructorParameters<typeof UuidType>>().toEqualTypeOf<
        [value?: string | null]
      >();
      expectTypeOf<UuidType['value']>().toEqualTypeOf<string | null>();
      expectTypeOf<UuidType['validate']>().toEqualTypeOf<() => ValidationResult<string | null>>();
    });

    it('its value cannot be used as a plain string', () => {
      // @ts-expect-error an optional value may be null
      const id: string = new UuidType(V4).value;
      expect(id).toBe(V4);
    });
  });

  describe('conversion', () => {
    it.each(convertibleInputs)('%p is kept as it is', (input) => {
      expect(new UuidType(input).value).toBe(input);
    });

    it.each(emptyInputs)('%s → null', (_, input) => {
      expect(new UuidType(input as string).value).toBeNull();
    });

    it('no value → null', () => {
      expect(new UuidType().value).toBeNull();
    });

    it.each(notConvertibleInputs)('%p throws TypePrimitiveException', (input, received) => {
      const create = () => new UuidType(input as string);
      expect(create).toThrow(TypePrimitiveException);
      expect(create).toThrow(primitiveError(received));
    });
  });

  describe('validate', () => {
    it.each(convertibleInputs)('%p is valid', (input) => {
      expect(new UuidType(input).validate()).toEqual({ ok: true, value: input, errors: [] });
    });

    it.each(emptyInputs)('%s is valid as null', (_, input) => {
      expect(new UuidType(input as string).validate()).toEqual({
        ok: true,
        value: null,
        errors: [],
      });
    });

    it('runs its validations on a value', () => {
      const { OptionalV4 } = versionFourIds();
      expect(new OptionalV4(V4).validate()).toEqual({ ok: true, value: V4, errors: [] });
      expect(new OptionalV4('6ba7b810-9dad-11d1-80b4-00c04fd430c8').validate().errors).toEqual([
        isV4Error,
      ]);
    });

    it.each(emptyInputs)('%s is valid without running its validations', (_, input) => {
      const { OptionalV4, isV4 } = versionFourIds();
      expect(new OptionalV4(input as string).validate()).toEqual({
        ok: true,
        value: null,
        errors: [],
      });
      expect(isV4).not.toHaveBeenCalled();
    });
  });

  describe('isNull / toString', () => {
    it.each([
      ['a value', new UuidType(V4), false, V4],
      ['an empty value', new UuidType(null), true, ''],
    ])('%s → isNull %s, toString %p', (_, instance, isNull, text) => {
      expect(instance.isNull).toBe(isNull);
      expect(instance.toString).toBe(text);
    });
  });

  describe('generators', () => {
    it('random returns a new version 4 UUID each time', () => {
      const first = UuidType.random();
      expect(isUUID(first, { version: 4 })).toBe(true);
      expect(UuidType.random()).not.toBe(first);
    });

    it('fromValue returns the same version 5 UUID for the same value and namespace', () => {
      const id = UuidType.fromValue('hello');
      expect(isUUID(id, { version: 5 })).toBe(true);
      expect(UuidType.fromValue('hello')).toBe(id);
      expect(UuidType.fromValue('bye')).not.toBe(id);
      expect(UuidType.fromValue('hello', V4)).not.toBe(id);
    });
  });
});

describe('Required(UuidType)', () => {
  describe('typing', () => {
    it('takes only a string and holds a string', () => {
      expectTypeOf<ConstructorParameters<typeof RequiredUuid>>().toEqualTypeOf<[value: string]>();
      expectTypeOf<RequiredUuid['value']>().toEqualTypeOf<string>();
      expectTypeOf<RequiredUuid['validate']>().toEqualTypeOf<() => ValidationResult<string>>();
    });

    it('does not accept a missing value or a value of another type', () => {
      // @ts-expect-error a required uuid needs a value
      expect(() => new RequiredUuid()).toThrow(RequiredValueException);
      // @ts-expect-error a required uuid does not accept null
      expect(() => new RequiredUuid(null)).toThrow(RequiredValueException);
      // @ts-expect-error a required uuid does not accept undefined
      expect(() => new RequiredUuid(undefined)).toThrow(RequiredValueException);
      // @ts-expect-error a required uuid does not accept a number
      expect(() => new RequiredUuid(1)).toThrow(TypePrimitiveException);
    });
  });

  describe('construction', () => {
    it.each(convertibleInputs)('%p is kept as it is', (input) => {
      expect(new RequiredUuid(input).value).toBe(input);
    });

    it.each(emptyInputs)('%s throws RequiredValueException', (_, input) => {
      const received = typeof input === 'string' ? `"${input}"` : 'null';
      const create = () => new RequiredUuid(input as string);
      expect(create).toThrow(RequiredValueException);
      expect(create).toThrow(requiredError(received));
    });

    it('throws TypePrimitiveException for a value that is not a UUID', () => {
      expect(() => new RequiredUuid('abc')).toThrow(primitiveError('"abc"'));
    });

    it('keeps the generators', () => {
      expect(isUUID(RequiredUuid.random())).toBe(true);
    });
  });

  describe('validate', () => {
    it('runs its validations on a value', () => {
      const { RequiredV4 } = versionFourIds();
      expect(new RequiredV4(V4).validate()).toEqual({ ok: true, value: V4, errors: [] });
      expect(new RequiredV4('6ba7b810-9dad-11d1-80b4-00c04fd430c8').validate().errors).toEqual([
        isV4Error,
      ]);
    });

    it('does not make UuidType required', () => {
      expect(new UuidType(null).validate()).toEqual({ ok: true, value: null, errors: [] });
    });
  });
});

describe('IdType', () => {
  it('is a required UUID', () => {
    expectTypeOf<ConstructorParameters<typeof IdType>>().toEqualTypeOf<[value: string]>();
    expectTypeOf<IdType['value']>().toEqualTypeOf<string>();
    expect(new IdType(V4).value).toBe(V4);
    expect(() => new IdType(null as unknown as string)).toThrow(
      'Validation Error: IdType is required, but received null.',
    );
    expect(() => new IdType('abc')).toThrow(TypePrimitiveException);
  });

  it('is a UuidType', () => {
    expect(new IdType(IdType.random())).toBeInstanceOf(UuidType);
  });
});
