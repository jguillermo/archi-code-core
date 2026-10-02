import { describe, expect, it, jest } from '@jest/globals';
import { expectTypeOf } from 'expect-type';
import { Validations } from '@archi-code/validation';
import type { ValidationResult } from '@archi-code/validation';
import { CreatedAt, DateType, UpdatedAt } from './date-type';
import { AbstractType, Required } from './abstract-type';
import { TypePrimitiveException } from '../exceptions/domain/type-primitive.exception';
import { RequiredValueException } from '../exceptions/domain/required-value.exception';

class RequiredDate extends Required(DateType) {}

const convertibleInputs: [unknown, string][] = [
  [new Date('2018-03-23T16:02:15.000Z'), '2018-03-23T16:02:15.000Z'],
  ['2018-03-23', '2018-03-23T00:00:00.000Z'],
  ['2018-03-23T16:02:15.000Z', '2018-03-23T16:02:15.000Z'],
  ['2018-03-23T16:02:15', '2018-03-23T16:02:15.000Z'],
  ['2018-03-23 16:02:15', '2018-03-23T16:02:15.000Z'],
  ['2018-03-23T16:02:15+02:00', '2018-03-23T14:02:15.000Z'],
];

const emptyInputs: [string, unknown][] = [
  ['null', null],
  ['undefined', undefined],
  ['an empty string', ''],
  ['only spaces', '   '],
];

const notConvertibleInputs: [unknown, string][] = [
  ['random', '"random"'],
  ['2018-02-30', '"2018-02-30"'],
  ['23/03/2018', '"23/03/2018"'],
  ['2018-03-23T25:00:00', '"2018-03-23T25:00:00"'],
  [new Date('invalid'), 'Date(Invalid)'],
  [1521820800000, '1521820800000'],
  [true, 'true'],
  [{ a: 1 }, '{"a":1}'],
];

function primitiveError(received: string): string {
  return `Validation Error: Expected a valid Date, but received ${received}.`;
}

function requiredError(received: string): string {
  return `Validation Error: RequiredDate is required, but received ${received}.`;
}

function datesIn2018() {
  const isIn2018 = jest.fn((value: unknown) => (value as Date).getUTCFullYear() === 2018);

  @Validations([{ custom: 'isIn2018', fn: isIn2018 }])
  class OptionalIn2018 extends DateType {}

  @Validations([{ custom: 'isIn2018', fn: isIn2018 }])
  class RequiredIn2018 extends Required(DateType) {}

  return { OptionalIn2018, RequiredIn2018, isIn2018 };
}

const isIn2018Error = { custom: 'isIn2018', message: 'Value does not satisfy isIn2018' };

describe('DateType (optional)', () => {
  describe('typing', () => {
    it('is an AbstractType of Date that takes a Date, null or nothing and holds Date | null', () => {
      expectTypeOf<DateType>().toMatchTypeOf<AbstractType<Date>>();
      expectTypeOf<ConstructorParameters<typeof DateType>>().toEqualTypeOf<[value?: Date | null]>();
      expectTypeOf<DateType['value']>().toEqualTypeOf<Date | null>();
      expectTypeOf<DateType['validate']>().toEqualTypeOf<() => ValidationResult<Date | null>>();
    });

    it('its value cannot be used as a plain Date', () => {
      // @ts-expect-error an optional value may be null
      const date: Date = new DateType(new Date(0)).value;
      expect(date).toEqual(new Date(0));
    });
  });

  describe('conversion', () => {
    it.each(convertibleInputs)('%p → %p', (input, expected) => {
      const value = new DateType(input as Date).value;
      expect(value).toBeInstanceOf(Date);
      expect(value?.toISOString()).toBe(expected);
    });

    it.each(emptyInputs)('%s → null', (_, input) => {
      expect(new DateType(input as Date).value).toBeNull();
    });

    it('no value → null', () => {
      expect(new DateType().value).toBeNull();
    });

    it.each(notConvertibleInputs)('%p throws TypePrimitiveException', (input, received) => {
      const create = () => new DateType(input as Date);
      expect(create).toThrow(TypePrimitiveException);
      expect(create).toThrow(primitiveError(received));
    });
  });

  describe('immutability', () => {
    it('holds a copy, so later changes to the given Date do not reach it', () => {
      const input = new Date('2018-03-23T00:00:00.000Z');
      const vo = new DateType(input);
      input.setUTCFullYear(2020);
      expect(vo.value).not.toBe(input);
      expect(vo.toString).toBe('2018-03-23T00:00:00.000Z');
    });

    it('its value is still a Date', () => {
      const value = new DateType(new Date(0)).value;
      expect(value).toBeInstanceOf(Date);
      expect(value?.getTime()).toBe(0);
    });

    it('cannot be changed from outside', () => {
      const vo = new DateType(new Date('2018-03-23T00:00:00.000Z'));
      expect(() => vo.value?.setUTCFullYear(2020)).toThrow(TypeError);
      expect(vo.toString).toBe('2018-03-23T00:00:00.000Z');
    });

    it('keeps validate in sync, since the value cannot change', () => {
      const { OptionalIn2018 } = datesIn2018();
      const vo = new OptionalIn2018(new Date('2018-03-23'));
      expect(vo.validate().ok).toBe(true);
      expect(() => vo.value?.setUTCFullYear(2020)).toThrow(TypeError);
      expect(vo.validate().ok).toBe(true);
    });
  });

  describe('validate', () => {
    it.each(convertibleInputs)('%p is valid', (input) => {
      const instance = new DateType(input as Date);
      expect(instance.validate()).toEqual({ ok: true, value: instance.value, errors: [] });
    });

    it.each(emptyInputs)('%s is valid as null', (_, input) => {
      expect(new DateType(input as Date).validate()).toEqual({ ok: true, value: null, errors: [] });
    });

    it('runs its validations on a value', () => {
      const { OptionalIn2018 } = datesIn2018();
      expect(new OptionalIn2018(new Date('2018-03-23')).validate().ok).toBe(true);
      expect(new OptionalIn2018(new Date('2020-01-01')).validate().errors).toEqual([isIn2018Error]);
    });

    it.each(emptyInputs)('%s is valid without running its validations', (_, input) => {
      const { OptionalIn2018, isIn2018 } = datesIn2018();
      expect(new OptionalIn2018(input as Date).validate()).toEqual({
        ok: true,
        value: null,
        errors: [],
      });
      expect(isIn2018).not.toHaveBeenCalled();
    });
  });

  describe('isNull / toString', () => {
    it.each([
      [
        'a value',
        new DateType(new Date('2018-03-23T16:02:15.000Z')),
        false,
        '2018-03-23T16:02:15.000Z',
      ],
      ['an empty value', new DateType(null), true, ''],
    ])('%s → isNull %s, toString %p', (_, instance, isNull, text) => {
      expect(instance.isNull).toBe(isNull);
      expect(instance.toString).toBe(text);
    });
  });
});

describe('Required(DateType)', () => {
  describe('typing', () => {
    it('takes only a Date and holds a Date', () => {
      expectTypeOf<ConstructorParameters<typeof RequiredDate>>().toEqualTypeOf<[value: Date]>();
      expectTypeOf<RequiredDate['value']>().toEqualTypeOf<Date>();
      expectTypeOf<RequiredDate['validate']>().toEqualTypeOf<() => ValidationResult<Date>>();
    });

    it('does not accept a missing value or a value of another type', () => {
      // @ts-expect-error a required date needs a value
      expect(() => new RequiredDate()).toThrow(RequiredValueException);
      // @ts-expect-error a required date does not accept null
      expect(() => new RequiredDate(null)).toThrow(RequiredValueException);
      // @ts-expect-error a required date does not accept undefined
      expect(() => new RequiredDate(undefined)).toThrow(RequiredValueException);
      // @ts-expect-error a required date does not accept a string
      expect(new RequiredDate('2018-03-23').toString).toBe('2018-03-23T00:00:00.000Z');
    });
  });

  describe('construction', () => {
    it.each(convertibleInputs)('%p → %p', (input, expected) => {
      expect(new RequiredDate(input as Date).value.toISOString()).toBe(expected);
    });

    it.each(emptyInputs)('%s throws RequiredValueException', (_, input) => {
      const received = typeof input === 'string' ? `"${input}"` : 'null';
      const create = () => new RequiredDate(input as Date);
      expect(create).toThrow(RequiredValueException);
      expect(create).toThrow(requiredError(received));
    });

    it('throws TypePrimitiveException for a value that cannot be converted', () => {
      expect(() => new RequiredDate('random' as unknown as Date)).toThrow(
        primitiveError('"random"'),
      );
    });
  });

  describe('validate', () => {
    it('runs its validations on a value', () => {
      const { RequiredIn2018 } = datesIn2018();
      expect(new RequiredIn2018(new Date('2018-03-23')).validate().ok).toBe(true);
      expect(new RequiredIn2018(new Date('2020-01-01')).validate().errors).toEqual([isIn2018Error]);
    });

    it('does not make DateType required', () => {
      expect(new DateType(null).validate()).toEqual({ ok: true, value: null, errors: [] });
    });
  });
});

describe('CreatedAt', () => {
  it('is a required date', () => {
    expectTypeOf<ConstructorParameters<typeof CreatedAt>>().toEqualTypeOf<[value: Date]>();
    expectTypeOf<CreatedAt['value']>().toEqualTypeOf<Date>();
    expect(() => new CreatedAt(null as unknown as Date)).toThrow(
      'Validation Error: CreatedAt is required, but received null.',
    );
  });

  it('now creates it with the current date', () => {
    jest.useFakeTimers({ now: new Date('2024-05-01T10:00:00.000Z') });
    const createdAt = CreatedAt.now();
    jest.useRealTimers();

    expect(createdAt).toBeInstanceOf(CreatedAt);
    expect(createdAt.toString).toBe('2024-05-01T10:00:00.000Z');
  });
});

describe('UpdatedAt', () => {
  it('is a required date', () => {
    expectTypeOf<ConstructorParameters<typeof UpdatedAt>>().toEqualTypeOf<[value: Date]>();
    expectTypeOf<UpdatedAt['value']>().toEqualTypeOf<Date>();
    expect(() => new UpdatedAt(null as unknown as Date)).toThrow(
      'Validation Error: UpdatedAt is required, but received null.',
    );
  });

  it('now creates it with the current date', () => {
    jest.useFakeTimers({ now: new Date('2024-05-01T10:00:00.000Z') });
    const updatedAt = UpdatedAt.now();
    jest.useRealTimers();

    expect(updatedAt).toBeInstanceOf(UpdatedAt);
    expect(updatedAt.toString).toBe('2024-05-01T10:00:00.000Z');
  });

  it('setNow changes it to the current date', () => {
    const updatedAt = new UpdatedAt(new Date('2020-01-01T00:00:00.000Z'));
    const before = updatedAt.validate();

    jest.useFakeTimers({ now: new Date('2024-05-01T10:00:00.000Z') });
    updatedAt.setNow();
    jest.useRealTimers();

    expect(updatedAt.toString).toBe('2024-05-01T10:00:00.000Z');
    expect(updatedAt.validate()).not.toBe(before);
    expect(() => updatedAt.value.setUTCFullYear(2000)).toThrow(TypeError);
  });
});
