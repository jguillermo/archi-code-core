import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import { Validations } from '@archi-code/validation';
import type { ValidationResult } from '@archi-code/validation';
import { JsonType } from '../../../src/domain/type/json-type';
import type { JsonTypeValue } from '../../../src/domain/type/json-type';
import { AbstractType } from '../../../src/domain/type/abstract-type';
import { Required } from '../../../src/domain/type/required/required';
import { TypePrimitiveException } from '../../../src/exceptions/domain/type-primitive.exception';
import { RequiredValueException } from '../../../src/exceptions/domain/required-value.exception';
import { ValidationException } from '../../../src/exceptions/domain/validation.exception';

interface Address {
  street: string;
  city: string;
  zip?: string;
}

class BillingAddress extends JsonType<Address> {}
class PickupAddress extends JsonType<Address> {}
class ShippingAddress extends Required(JsonType<Address>) {}

const addressInputs: [string, unknown, Address][] = [
  [
    'an object from a JSON body',
    { street: 'Gran Vía 1', city: 'Huelva' },
    { street: 'Gran Vía 1', city: 'Huelva' },
  ],
  [
    'an object with every field',
    { street: 'Gran Vía 1', city: 'Huelva', zip: '21001' },
    { street: 'Gran Vía 1', city: 'Huelva', zip: '21001' },
  ],
  [
    'a JSON text stored in a database column',
    '{"street":"Gran Vía 1","city":"Huelva"}',
    { street: 'Gran Vía 1', city: 'Huelva' },
  ],
  [
    'a JSON text with surrounding spaces',
    ' {"street":"Gran Vía 1","city":"Huelva","zip":"21001"} ',
    { street: 'Gran Vía 1', city: 'Huelva', zip: '21001' },
  ],
];

const blankFormFields: [string, unknown][] = [
  ['a field sent as null', null],
  ['a field left out of the request', undefined],
  ['an empty database column', ''],
  ['a database column with only spaces', '   '],
];

const brokenClientInputs: [string, unknown, string][] = [
  ['an empty object', {}, '{}'],
  ['an empty JSON object text', '{}', '"{}"'],
  [
    'a list of addresses',
    [{ street: 'Gran Vía 1', city: 'Huelva' }],
    '[{"street":"Gran Vía 1","city":"Huelva"}]',
  ],
  ['a JSON list text', '[1]', '"[1]"'],
  ['a text that is not JSON', 'not json', '"not json"'],
  ['a JSON number text', '1', '"1"'],
  ['a number', 1, '1'],
  ['a boolean', true, 'true'],
  ['a Date', new Date('2020-01-01T00:00:00.000Z'), 'Date(2020-01-01T00:00:00.000Z)'],
];

function primitiveError(received: string): string {
  return `Validation Error: Expected a valid Json, but received ${received}.`;
}

function thrownBy(run: () => unknown): unknown {
  try {
    run();
  } catch (error) {
    return error;
  }
  return undefined;
}

function spanishAddresses() {
  const hasZip = vi.fn((value: unknown) => typeof (value as Address).zip === 'string');

  @Validations([{ custom: 'hasZip', fn: hasZip, message: 'Zip code is required' }])
  class InvoiceAddress extends BillingAddress {}

  @Validations([{ custom: 'hasZip', fn: hasZip, message: 'Zip code is required' }])
  class DeliveryAddress extends ShippingAddress {}

  return { InvoiceAddress, DeliveryAddress, hasZip };
}

function issuesOf(build: () => unknown): unknown {
  return (thrownBy(build) as ValidationException).errors;
}

describe('JsonType', () => {
  describe('an optional billing address', () => {
    it('is typed as its object | null, built from it, null or nothing', () => {
      expectTypeOf<BillingAddress>().toMatchTypeOf<AbstractType<Address>>();
      expectTypeOf<ConstructorParameters<typeof BillingAddress>>().toEqualTypeOf<
        [value?: Address | null]
      >();
      expectTypeOf<BillingAddress['value']>().toEqualTypeOf<Address | null>();
      expectTypeOf<BillingAddress['validate']>().toEqualTypeOf<
        () => ValidationResult<Address | null>
      >();
    });

    it('defaults to a plain JSON object when no shape is given', () => {
      expectTypeOf<JsonType['value']>().toEqualTypeOf<JsonTypeValue | null>();
    });

    it('cannot be used as a plain address without checking for null', () => {
      // @ts-expect-error an optional value may be null
      const address: Address = new BillingAddress({ street: 'Gran Vía 1', city: 'Huelva' }).value;
      expect(address).toEqual({ street: 'Gran Vía 1', city: 'Huelva' });
    });

    it.each(addressInputs)('reads %s', (_, input, expected) => {
      expect(new BillingAddress(input as Address).value).toEqual(expected);
      expect(new BillingAddress(input as Address).validate()).toEqual({
        ok: true,
        value: expected,
        errors: [],
      });
    });

    it.each(blankFormFields)('stores %s as null, meaning "same as shipping"', (_, input) => {
      expect(new BillingAddress(input as Address).value).toBeNull();
      expect(new BillingAddress(input as Address).validate()).toEqual({
        ok: true,
        value: null,
        errors: [],
      });
    });

    it('is null when no billing address is given', () => {
      expect(new BillingAddress().value).toBeNull();
    });

    it.each(brokenClientInputs)('rejects %s with TypePrimitiveException', (_, input, received) => {
      const create = () => new BillingAddress(input as Address);
      expect(create).toThrow(TypePrimitiveException);
      expect(create).toThrow(primitiveError(received));
    });
  });

  describe('an address cannot be changed behind the value object', () => {
    it('keeps a copy, so editing the request body later does not reach it', () => {
      const body = { street: 'Gran Vía 1', city: 'Huelva' };
      const address = new BillingAddress(body);
      body.city = 'Sevilla';
      expect(address.value).not.toBe(body);
      expect(address.value).toEqual({ street: 'Gran Vía 1', city: 'Huelva' });
      expect(Object.isFrozen(body)).toBe(false);
    });

    it('freezes nested data all the way down', () => {
      interface Customer {
        contact: { name: string; phones: string[] };
      }
      class CustomerSnapshot extends JsonType<Customer> {}
      const snapshot = new CustomerSnapshot({ contact: { name: 'Ana', phones: ['600000000'] } });
      const value = snapshot.value as Customer;

      expect(Object.isFrozen(value)).toBe(true);
      expect(Object.isFrozen(value.contact)).toBe(true);
      expect(Object.isFrozen(value.contact.phones)).toBe(true);
      expect(() => {
        value.contact.name = 'Eva';
      }).toThrow(TypeError);
      expect(() => value.contact.phones.push('611111111')).toThrow(TypeError);
      expect(snapshot.value).toEqual({ contact: { name: 'Ana', phones: ['600000000'] } });
    });

    it('so a valid address stays valid', () => {
      const { InvoiceAddress } = spanishAddresses();
      const address = new InvoiceAddress({ street: 'Gran Vía 1', city: 'Huelva', zip: '21001' });
      expect(address.validate().ok).toBe(true);
      expect(() => {
        delete (address.value as Address).zip;
      }).toThrow(TypeError);
      expect(address.validate().ok).toBe(true);
    });
  });

  describe('a required shipping address', () => {
    it('is typed as its object and built only from it', () => {
      expectTypeOf<ConstructorParameters<typeof ShippingAddress>>().toEqualTypeOf<
        [value: Address]
      >();
      expectTypeOf<ShippingAddress['value']>().toEqualTypeOf<Address>();
      expectTypeOf<ShippingAddress['validate']>().toEqualTypeOf<() => ValidationResult<Address>>();
    });

    it('does not compile without an address, but still throws if one sneaks in at runtime', () => {
      // @ts-expect-error a required object needs a value
      expect(() => new ShippingAddress()).toThrow(RequiredValueException);
      // @ts-expect-error a required object does not accept null
      expect(() => new ShippingAddress(null)).toThrow(RequiredValueException);
      // @ts-expect-error a required object does not accept undefined
      expect(() => new ShippingAddress(undefined)).toThrow(RequiredValueException);
      // @ts-expect-error a required object does not accept a string
      expect(new ShippingAddress('{"street":"Gran Vía 1","city":"Huelva"}').value).toEqual({
        street: 'Gran Vía 1',
        city: 'Huelva',
      });
    });

    it.each(addressInputs)('reads %s', (_, input, expected) => {
      expect(new ShippingAddress(input as Address).value).toEqual(expected);
    });

    it.each(blankFormFields)(
      'rejects %s with a RequiredValueException naming the type',
      (_, input) => {
        const received = typeof input === 'string' ? `"${input}"` : 'null';
        const create = () => new ShippingAddress(input as Address);
        expect(create).toThrow(RequiredValueException);
        expect(create).toThrow(
          `Validation Error: ShippingAddress is required, but received ${received}.`,
        );
      },
    );

    it('rejects an empty object with TypePrimitiveException', () => {
      expect(() => new ShippingAddress({} as Address)).toThrow(primitiveError('{}'));
    });
  });

  describe('addresses that need a zip code', () => {
    it('an optional invoice address needs the zip once given', () => {
      const { InvoiceAddress } = spanishAddresses();
      expect(
        new InvoiceAddress({ street: 'Gran Vía 1', city: 'Huelva', zip: '21001' }).validate().ok,
      ).toBe(true);
      expect(issuesOf(() => new InvoiceAddress({ street: 'Gran Vía 1', city: 'Huelva' }))).toEqual([
        { field: null, code: 'hasZip', message: 'InvoiceAddress: Zip code is required' },
      ]);
    });

    it.each(blankFormFields)(
      'a missing invoice address (%s) is valid without running the rule',
      (_, input) => {
        const { InvoiceAddress, hasZip } = spanishAddresses();
        expect(new InvoiceAddress(input as Address).validate()).toEqual({
          ok: true,
          value: null,
          errors: [],
        });
        expect(hasZip).not.toHaveBeenCalled();
      },
    );

    it('shipping to an address without zip throws ValidationException', () => {
      const { DeliveryAddress } = spanishAddresses();
      const complete = new DeliveryAddress({ street: 'Gran Vía 1', city: 'Huelva', zip: '21001' });
      expect(complete.value).toEqual({ street: 'Gran Vía 1', city: 'Huelva', zip: '21001' });

      const ship = () => new DeliveryAddress({ street: 'Gran Vía 1', city: 'Huelva' });
      expect(ship).toThrow(ValidationException);
      expect(thrownBy(ship)).toMatchObject({
        message: 'Validation failed, DeliveryAddress: Zip code is required',
        errors: [{ field: null, code: 'hasZip', message: 'DeliveryAddress: Zip code is required' }],
      });
    });

    it('does not make the plain JsonType required', () => {
      expect(new BillingAddress(null).validate()).toEqual({ ok: true, value: null, errors: [] });
    });
  });

  describe('comparing addresses', () => {
    it('two addresses with the same fields are equal, whatever the key order', () => {
      expect(
        new ShippingAddress({ street: 'Gran Vía 1', city: 'Huelva' }).equals(
          new ShippingAddress('{"city":"Huelva","street":"Gran Vía 1"}' as unknown as Address),
        ),
      ).toBe(true);
    });

    it('two addresses with a different field are not equal', () => {
      expect(
        new ShippingAddress({ street: 'Gran Vía 1', city: 'Huelva' }).equals(
          new ShippingAddress({ street: 'Gran Vía 1', city: 'Sevilla' }),
        ),
      ).toBe(false);
    });

    it('an address with an extra field is not equal to one without it', () => {
      expect(
        new ShippingAddress({ street: 'Gran Vía 1', city: 'Huelva', zip: '21001' }).equals(
          new ShippingAddress({ street: 'Gran Vía 1', city: 'Huelva' }),
        ),
      ).toBe(false);
    });

    it('two snapshots with the same nested data are equal', () => {
      class OrderSnapshot extends JsonType {}
      const snapshot = { lines: [{ sku: 'A-1', quantity: 2 }], notes: null };
      expect(new OrderSnapshot(snapshot).equals(new OrderSnapshot({ ...snapshot }))).toBe(true);
      expect(
        new OrderSnapshot(snapshot).equals(
          new OrderSnapshot({ lines: [{ sku: 'A-1', quantity: 3 }], notes: null }),
        ),
      ).toBe(false);
    });

    it('a billing and a pickup address with the same fields are not equal', () => {
      const address = { street: 'Gran Vía 1', city: 'Huelva' };
      expect(new BillingAddress(address).equals(new PickupAddress(address))).toBe(false);
    });

    it('two missing billing addresses are equal', () => {
      expect(new BillingAddress().equals(new BillingAddress(null))).toBe(true);
    });
  });

  describe('showing and serializing an address', () => {
    it.each([
      [
        'an address',
        new BillingAddress({ street: 'Gran Vía 1', city: 'Huelva' }),
        '{"street":"Gran Vía 1","city":"Huelva"}',
      ],
      ['a missing address', new BillingAddress(null), ''],
    ])('toString() of %s gives %o', (_, address, text) => {
      expect(address.toString()).toBe(text);
    });

    it('can be used in a template literal for a log line', () => {
      expect(`ship to ${new ShippingAddress({ street: 'Gran Vía 1', city: 'Huelva' })}`).toBe(
        'ship to {"street":"Gran Vía 1","city":"Huelva"}',
      );
    });
  });
});
