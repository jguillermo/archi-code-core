import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import { Validations } from '@archi-code/validation';
import type { ValidationResult } from '@archi-code/validation';
import { CreatedAt, DateType, UpdatedAt } from '../../src/type/date-type';
import { AbstractType, Required } from '../../src/type/abstract-type';
import { TypePrimitiveException } from '../../src/exceptions/domain/type-primitive.exception';
import { RequiredValueException } from '../../src/exceptions/domain/required-value.exception';
import { ValidationException } from '../../src/exceptions/domain/validation.exception';

class ShippedAt extends DateType {}

class PlacedAt extends Required(DateType) {}

@Validations([
  {
    custom: 'isNotInTheFuture',
    fn: (value) => (value as Date).getTime() <= Date.parse('2026-01-01T00:00:00Z'),
    message: 'A birth date cannot be in the future',
  },
])
class BirthDate extends Required(DateType) {}

const zonedInputs: [string, unknown, string][] = [
  [
    'a Date built by the application',
    new Date('2018-03-23T16:02:15.000Z'),
    '2018-03-23T16:02:15.000Z',
  ],
  ['a date-only birth date', '1990-05-17', '1990-05-17T00:00:00.000Z'],
  ['a UTC timestamp from an API', '2018-03-23T16:02:15.000Z', '2018-03-23T16:02:15.000Z'],
  ['a UTC timestamp without milliseconds', '2018-03-23T16:02:15Z', '2018-03-23T16:02:15.000Z'],
  ['an order placed in Madrid in winter', '2024-01-31T10:00:00+01:00', '2024-01-31T09:00:00.000Z'],
  ['an order placed in New York', '2024-01-31T10:00:00-05:00', '2024-01-31T15:00:00.000Z'],
];

const zonelessInputs: [string, string][] = [
  ['a datetime-local form field', '2024-01-31T10:00:00'],
  ['a datetime-local field with milliseconds', '2024-01-31T10:00:00.250'],
  ['a database dump separated by a space', '2024-01-31 10:00:00'],
  ['a space separated time with milliseconds', '2024-01-31 10:00:00.5'],
];

const emptyInputs: [string, unknown][] = [
  ['null', null],
  ['undefined', undefined],
  ['an empty form field', ''],
  ['a field with only spaces', '   '],
];

const invalidInputs: [string, unknown, string][] = [
  ['free text', 'tomorrow', '"tomorrow"'],
  ['a day that does not exist', '2018-02-30', '"2018-02-30"'],
  ['a European formatted date', '23/03/2018', '"23/03/2018"'],
  ['an hour out of range', '2018-03-23T25:00:00Z', '"2018-03-23T25:00:00Z"'],
  ['an invalid Date object', new Date('invalid'), 'Date(Invalid)'],
  ['an epoch timestamp in milliseconds', 1521820800000, '1521820800000'],
  ['a boolean', true, 'true'],
  ['an object', { at: '2018-03-23' }, '{"at":"2018-03-23"}'],
];

const dateError = (received: string) =>
  `Validation Error: Expected a valid Date, but received ${received}.`;

afterEach(() => {
  vi.useRealTimers();
});

describe('DateType', () => {
  describe('typing', () => {
    it('an optional date takes a Date, null or nothing and holds Date | null', () => {
      expectTypeOf<ShippedAt>().toMatchTypeOf<AbstractType<Date>>();
      expectTypeOf<ConstructorParameters<typeof ShippedAt>>().toEqualTypeOf<
        [value?: Date | null]
      >();
      expectTypeOf<ShippedAt['value']>().toEqualTypeOf<Date | null>();
      expectTypeOf<ShippedAt['validate']>().toEqualTypeOf<() => ValidationResult<Date | null>>();
      expectTypeOf<ShippedAt['toString']>().toEqualTypeOf<() => string>();
    });

    it('a required date takes only a Date and holds a Date', () => {
      expectTypeOf<ConstructorParameters<typeof PlacedAt>>().toEqualTypeOf<[value: Date]>();
      expectTypeOf<PlacedAt['value']>().toEqualTypeOf<Date>();
      expectTypeOf<PlacedAt['validate']>().toEqualTypeOf<() => ValidationResult<Date>>();
    });

    it('a shipment that may not have happened yet cannot be used as a plain Date', () => {
      // @ts-expect-error an optional date may be null
      const shippedAt: Date = new ShippedAt(new Date(0)).value;
      expect(shippedAt).toEqual(new Date(0));
    });

    it('a required date does not accept missing values', () => {
      // @ts-expect-error a required date needs a value
      expect(() => new PlacedAt()).toThrow(RequiredValueException);
      // @ts-expect-error a required date does not accept null
      expect(() => new PlacedAt(null)).toThrow(RequiredValueException);
      // @ts-expect-error raw request text must be typed as unknown before converting it
      expect(new PlacedAt('2018-03-23').toString()).toBe('2018-03-23T00:00:00.000Z');
    });
  });

  describe('reading dates from requests', () => {
    it.each(zonedInputs)('%s is stored as the UTC instant', (_, input, iso) => {
      const placedAt = new PlacedAt(input as Date);
      expect(placedAt.value).toBeInstanceOf(Date);
      expect(placedAt.value.toISOString()).toBe(iso);
    });

    it.each(zonelessInputs)(
      'rejects %s without zone (%s) because the instant is ambiguous',
      (_, input) => {
        const create = () => new PlacedAt(input as unknown as Date);
        expect(create).toThrow(TypePrimitiveException);
        expect(create).toThrow(dateError(`"${input}"`));
      },
    );

    it.each(invalidInputs)('rejects %s', (_, input, received) => {
      const create = () => new ShippedAt(input as Date);
      expect(create).toThrow(TypePrimitiveException);
      expect(create).toThrow(dateError(received));
    });

    it.each(emptyInputs)('an order not shipped yet (%s) holds null', (_, input) => {
      const shippedAt = new ShippedAt(input as Date);
      expect(shippedAt.value).toBeNull();
      expect(shippedAt.isNull).toBe(true);
    });

    it('an order not shipped yet can be created with no value', () => {
      expect(new ShippedAt().value).toBeNull();
    });

    it.each(emptyInputs)('a placement date that is missing (%s) is refused', (_, input) => {
      const received = typeof input === 'string' ? `"${input}"` : 'null';
      const create = () => new PlacedAt(input as Date);
      expect(create).toThrow(RequiredValueException);
      expect(create).toThrow(`Validation Error: PlacedAt is required, but received ${received}.`);
    });
  });

  describe('immutability', () => {
    it('holds a copy, so the caller changing its own Date later does not move the shipment', () => {
      const requested = new Date('2018-03-23T00:00:00.000Z');
      const shippedAt = new ShippedAt(requested);
      requested.setUTCFullYear(2020);
      expect(shippedAt.value).not.toBe(requested);
      expect(shippedAt.toString()).toBe('2018-03-23T00:00:00.000Z');
    });

    it('a handler cannot move the shipment by calling a setter on its value', () => {
      const shippedAt = new ShippedAt(new Date('2018-03-23T00:00:00.000Z'));
      expect(() => shippedAt.value?.setUTCFullYear(2020)).toThrow(
        'Cannot call setUTCFullYear: the date is immutable',
      );
      expect(shippedAt.toString()).toBe('2018-03-23T00:00:00.000Z');
    });
  });

  describe('text and JSON', () => {
    it('toString() gives the ISO 8601 instant for logs and messages', () => {
      const placedAt = new PlacedAt(new Date('2024-01-31T09:00:00.000Z'));
      expect(placedAt.toString()).toBe('2024-01-31T09:00:00.000Z');
      expect(`Order placed at ${placedAt}`).toBe('Order placed at 2024-01-31T09:00:00.000Z');
      expect(String(placedAt)).toBe('2024-01-31T09:00:00.000Z');
    });

    it('an order not shipped yet prints an empty text', () => {
      expect(new ShippedAt(null).toString()).toBe('');
      expect(`Shipped: [${new ShippedAt()}]`).toBe('Shipped: []');
    });

    it('serializes as the ISO instant in an API response', () => {
      const response = {
        placedAt: new PlacedAt(new Date('2024-01-31T09:00:00.000Z')),
        shippedAt: new ShippedAt(null),
      };
      expect(JSON.stringify(response)).toBe(
        '{"placedAt":"2024-01-31T09:00:00.000Z","shippedAt":null}',
      );
    });
  });

  describe('equals', () => {
    it('the same instant written with different zones is the same placement date', () => {
      expect(
        new PlacedAt('2024-01-31T10:00:00+01:00' as unknown as Date).equals(
          new PlacedAt(new Date('2024-01-31T09:00:00.000Z')),
        ),
      ).toBe(true);
    });

    it('two different instants are different', () => {
      expect(
        new PlacedAt(new Date('2024-01-31T09:00:00.000Z')).equals(
          new PlacedAt(new Date('2024-01-31T09:00:00.001Z')),
        ),
      ).toBe(false);
    });

    it('a shipment date is not a placement date even for the same instant', () => {
      const instant = new Date('2024-01-31T09:00:00.000Z');
      expect(new ShippedAt(instant).equals(new PlacedAt(instant))).toBe(false);
    });

    it('two orders not shipped yet have equal shipment dates', () => {
      expect(new ShippedAt(null).equals(new ShippedAt())).toBe(true);
    });
  });

  describe('validations', () => {
    it('a birth date in the past is valid', () => {
      expect(new BirthDate('1990-05-17' as unknown as Date).validate()).toEqual({
        ok: true,
        value: new Date('1990-05-17T00:00:00.000Z'),
        errors: [],
      });
    });

    it('a birth date in the future is reported, not thrown, by validate', () => {
      expect(new BirthDate(new Date('2030-01-01T00:00:00Z')).validate()).toEqual({
        ok: false,
        value: new Date('2030-01-01T00:00:00Z'),
        errors: [{ custom: 'isNotInTheFuture', message: 'A birth date cannot be in the future' }],
      });
    });

    it('assertValid turns a birth date in the future into a ValidationException', () => {
      const birthDate = new BirthDate(new Date('2030-01-01T00:00:00Z'));
      expect(() => birthDate.assertValid()).toThrow(ValidationException);
      expect(() => birthDate.assertValid()).toThrow(
        'Validation failed, BirthDate: A birth date cannot be in the future',
      );
    });

    it('an optional shipment date with no value is valid without running validations', () => {
      const isWeekday = vi.fn(() => false);

      @Validations([{ custom: 'isWeekday', fn: isWeekday }])
      class WeekdayShipment extends DateType {}

      expect(new WeekdayShipment(null).validate()).toEqual({ ok: true, value: null, errors: [] });
      expect(isWeekday).not.toHaveBeenCalled();
    });
  });
});

describe('CreatedAt', () => {
  it('is a required date named after the record field', () => {
    expectTypeOf<ConstructorParameters<typeof CreatedAt>>().toEqualTypeOf<[value: Date]>();
    expectTypeOf<CreatedAt['value']>().toEqualTypeOf<Date>();
    expect(() => new CreatedAt(null as unknown as Date)).toThrow(
      'Validation Error: CreatedAt is required, but received null.',
    );
  });

  it('now() stamps a new record with the current instant', () => {
    vi.useFakeTimers({ now: new Date('2024-05-01T10:00:00.000Z') });
    const createdAt = CreatedAt.now();
    expect(createdAt).toBeInstanceOf(CreatedAt);
    expect(createdAt.toString()).toBe('2024-05-01T10:00:00.000Z');
  });

  it('is rebuilt from the stored ISO text when the record is loaded', () => {
    const stored = '2024-05-01T10:00:00.000Z';
    expect(new CreatedAt(stored as unknown as Date).equals(new CreatedAt(new Date(stored)))).toBe(
      true,
    );
  });
});

describe('UpdatedAt', () => {
  it('is a required date named after the record field', () => {
    expectTypeOf<ConstructorParameters<typeof UpdatedAt>>().toEqualTypeOf<[value: Date]>();
    expectTypeOf<UpdatedAt['value']>().toEqualTypeOf<Date>();
    expect(() => new UpdatedAt(null as unknown as Date)).toThrow(
      'Validation Error: UpdatedAt is required, but received null.',
    );
  });

  it('UpdatedAt.now() replaces the previous timestamp, leaving the old one untouched', () => {
    const loaded = new UpdatedAt(new Date('2020-01-01T00:00:00.000Z'));
    vi.useFakeTimers({ now: new Date('2024-05-01T10:00:00.000Z') });

    const touched = UpdatedAt.now();

    expect(touched).toBeInstanceOf(UpdatedAt);
    expect(touched.toString()).toBe('2024-05-01T10:00:00.000Z');
    expect(loaded.toString()).toBe('2020-01-01T00:00:00.000Z');
    expect(touched.equals(loaded)).toBe(false);
    expect(() => touched.value.setUTCFullYear(2000)).toThrow(TypeError);
  });

  it('has no setNow: a record is touched by replacing its UpdatedAt', () => {
    expect('setNow' in new UpdatedAt(new Date())).toBe(false);
  });
});
