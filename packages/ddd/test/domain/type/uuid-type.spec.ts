import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import { Validations, isUUID } from '@archi-code/validation';
import type { ValidationResult } from '@archi-code/validation';
import { UuidType } from '../../../src/domain/type/uuid-type';
import { AbstractType } from '../../../src/domain/type/abstract-type';
import { Required } from '../../../src/domain/type/required/required';
import { TypePrimitiveException } from '../../../src/exceptions/domain/type-primitive.exception';
import { RequiredValueException } from '../../../src/exceptions/domain/required-value.exception';
import { ValidationException } from '../../../src/exceptions/domain/validation.exception';

class CorrelationId extends UuidType {}

class RequestId extends Required(UuidType) {}

@Validations([
  {
    custom: 'isVersion4',
    fn: (value) => isUUID(value, { version: 4 }),
    message: 'A payment token must be a random (version 4) UUID',
  },
])
class PaymentToken extends Required(UuidType) {}

const STORED = 'df9ef000-21fc-4e06-b8f7-103c3a133d10';

const acceptedInputs: [string, string, string][] = [
  ['a lowercase id from the database', STORED, STORED],
  ['an id pasted in capitals', 'DF9EF000-21FC-4E06-B8F7-103C3A133D10', STORED],
  ['an id with mixed case', 'Df9eF000-21fC-4e06-B8f7-103c3A133d10', STORED],
  [
    'a version 1 id from a legacy system',
    '6BA7B810-9DAD-11D1-80B4-00C04FD430C8',
    '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
  ],
  ['the nil UUID', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000'],
  ['the max UUID', 'FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF', 'ffffffff-ffff-ffff-ffff-ffffffffffff'],
];

const emptyInputs: [string, unknown][] = [
  ['null', null],
  ['undefined', undefined],
];

const invalidInputs: [string, unknown, string][] = [
  ['an empty header', '', '""'],
  ['a header with only spaces', '   ', '"   "'],
  ['a free text header', 'abc', '"abc"'],
  [
    'an id missing one digit',
    'df9ef000-21fc-4e06-b8f7-103c3a133d1',
    '"df9ef000-21fc-4e06-b8f7-103c3a133d1"',
  ],
  [
    'an unknown version',
    'df9ef000-21fc-9e06-b8f7-103c3a133d10',
    '"df9ef000-21fc-9e06-b8f7-103c3a133d10"',
  ],
  ['an id with surrounding spaces', ` ${STORED} `, `" ${STORED} "`],
  ['a numeric id', 123, '123'],
  ['a boolean', true, 'true'],
  ['an object', { id: STORED }, `{"id":"${STORED}"}`],
  ['an empty list', [], '[]'],
];

const uuidError = (received: string) =>
  `Validation Error: Expected a valid UUID, but received ${received}.`;

describe('UuidType', () => {
  describe('typing', () => {
    it('an optional uuid takes a string, null or nothing and holds string | null', () => {
      expectTypeOf<CorrelationId>().toMatchTypeOf<AbstractType<string>>();
      expectTypeOf<ConstructorParameters<typeof CorrelationId>>().toEqualTypeOf<
        [value?: string | null]
      >();
      expectTypeOf<CorrelationId['value']>().toEqualTypeOf<string | null>();
      expectTypeOf<CorrelationId['validate']>().toEqualTypeOf<
        () => ValidationResult<string | null>
      >();
    });

    it('a required uuid takes only a string and holds a string', () => {
      expectTypeOf<ConstructorParameters<typeof RequestId>>().toEqualTypeOf<[value: string]>();
      expectTypeOf<RequestId['value']>().toEqualTypeOf<string>();
    });

    it('a correlation id that may be absent cannot be used as a plain string', () => {
      // @ts-expect-error an optional uuid may be null
      const id: string = new CorrelationId(STORED).value;
      expect(id).toBe(STORED);
    });

    it('a required uuid does not accept missing values or numbers', () => {
      // @ts-expect-error a required uuid needs a value
      expect(() => new RequestId()).toThrow(RequiredValueException);
      // @ts-expect-error a required uuid does not accept null
      expect(() => new RequestId(null)).toThrow(RequiredValueException);
      // @ts-expect-error a required uuid does not accept a number
      expect(() => new RequestId(1)).toThrow(TypePrimitiveException);
    });
  });

  describe('reading ids from requests', () => {
    it.each(acceptedInputs)('%s is stored in lowercase', (_, input, stored) => {
      expect(new RequestId(input).value).toBe(stored);
    });

    it.each(invalidInputs)('rejects %s', (_, input, received) => {
      const create = () => new CorrelationId(input as string);
      expect(create).toThrow(TypePrimitiveException);
      expect(create).toThrow(uuidError(received));
    });

    it.each(emptyInputs)('a request without correlation id (%s) holds null', (_, input) => {
      expect(new CorrelationId(input as string).value).toBeNull();
    });

    it('a correlation id can be created with no value', () => {
      expect(new CorrelationId().isNull).toBe(true);
    });

    it.each(emptyInputs)('a missing request id (%s) is refused', (_, input) => {
      const create = () => new RequestId(input as string);
      expect(create).toThrow(RequiredValueException);
      expect(create).toThrow(`Validation Error: RequestId is required, but received null.`);
    });
  });

  describe('equals', () => {
    it('an id typed in capitals by support staff matches the stored lowercase id', () => {
      expect(
        new RequestId('DF9EF000-21FC-4E06-B8F7-103C3A133D10').equals(new RequestId(STORED)),
      ).toBe(true);
    });

    it('two different request ids are different', () => {
      expect(new RequestId(STORED).equals(new RequestId(UuidType.random()))).toBe(false);
    });

    it('a correlation id is not a request id even with the same text', () => {
      expect(new CorrelationId(STORED).equals(new RequestId(STORED))).toBe(false);
    });
  });

  describe('text and JSON', () => {
    it('prints the lowercase id in logs and headers', () => {
      const requestId = new RequestId('DF9EF000-21FC-4E06-B8F7-103C3A133D10');
      expect(requestId.toString()).toBe(STORED);
      expect(`x-request-id: ${requestId}`).toBe(`x-request-id: ${STORED}`);
    });

    it('a missing correlation id prints an empty text', () => {
      expect(new CorrelationId(null).toString()).toBe('');
    });
  });

  describe('generators', () => {
    it('random() gives a new version 4 id for every request', () => {
      const first = UuidType.random();
      expect(isUUID(first, { version: 4 })).toBe(true);
      expect(UuidType.random()).not.toBe(first);
      expect(new RequestId(first).value).toBe(first);
    });

    it('fromValue() derives the same version 5 id from the same natural key, for idempotent imports', () => {
      const fromEmail = UuidType.fromValue('ana@example.com');
      expect(isUUID(fromEmail, { version: 5 })).toBe(true);
      expect(UuidType.fromValue('ana@example.com')).toBe(fromEmail);
      expect(UuidType.fromValue('eva@example.com')).not.toBe(fromEmail);
    });

    it('fromValue() gives another id for the same key in another namespace', () => {
      expect(UuidType.fromValue('ana@example.com', STORED)).not.toBe(
        UuidType.fromValue('ana@example.com'),
      );
    });

    it('a subclass keeps the generators', () => {
      expect(isUUID(RequestId.random(), { version: 4 })).toBe(true);
    });

    it('generate() builds a new value object of the calling class with a random id', () => {
      const requestId = RequestId.generate();
      expectTypeOf(requestId).toEqualTypeOf<RequestId>();
      expect(requestId).toBeInstanceOf(RequestId);
      expect(isUUID(requestId.value as string, { version: 4 })).toBe(true);
      expect(RequestId.generate().equals(requestId)).toBe(false);
    });
  });

  describe('validations', () => {
    it('a random payment token is valid', () => {
      const token = UuidType.random();
      expect(new PaymentToken(token).validate()).toEqual({ ok: true, value: token, errors: [] });
    });

    it('a payment token derived from a name cannot be built: ValidationException', () => {
      const derived = () => new PaymentToken(UuidType.fromValue('order-1'));
      expect(derived).toThrow(ValidationException);
      expect(derived).toThrow(
        'Validation failed, PaymentToken: A payment token must be a random (version 4) UUID',
      );
    });

    it('an absent correlation id is valid without running its validations', () => {
      const isVersion4 = vi.fn(() => false);

      @Validations([{ custom: 'isVersion4', fn: isVersion4 }])
      class TraceId extends UuidType {}

      expect(new TraceId(null).validate()).toEqual({ ok: true, value: null, errors: [] });
      expect(isVersion4).not.toHaveBeenCalled();
    });
  });
});
