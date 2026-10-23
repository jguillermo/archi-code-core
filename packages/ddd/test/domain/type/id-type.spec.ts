import { describe, expect, expectTypeOf, it } from 'vitest';
import { IdType } from '../../../src/domain/type/id-type';
import { UuidType } from '../../../src/domain/type/uuid-type';
import { TypePrimitiveException } from '../../../src/domain/exceptions/type-primitive.exception';
import { RequiredValueException } from '../../../src/domain/exceptions/required-value.exception';

class OrderId extends IdType<'OrderId'> {}

class CustomerId extends IdType<'CustomerId'> {}

const STORED = 'df9ef000-21fc-4e06-b8f7-103c3a133d10';

describe('IdType', () => {
  it('generate() gives a new order its id in one call, typed as OrderId', () => {
    const id = OrderId.generate();
    expectTypeOf(id).toEqualTypeOf<OrderId>();
    expectTypeOf(id.value).toEqualTypeOf<string>();
    expect(id).toBeInstanceOf(OrderId);
    expect(id.equals(OrderId.generate())).toBe(false);
  });

  it('is a required uuid: an order always has an id', () => {
    expectTypeOf<ConstructorParameters<typeof OrderId>>().toEqualTypeOf<[value: string]>();
    expectTypeOf<OrderId['value']>().toEqualTypeOf<string>();
    expect(new OrderId(STORED).value).toBe(STORED);
    expect(new OrderId(STORED)).toBeInstanceOf(UuidType);
  });

  it('refuses a missing order id', () => {
    expect(() => new OrderId(null as unknown as string)).toThrow(RequiredValueException);
    expect(() => new OrderId(undefined as unknown as string)).toThrow(
      'Validation Error: OrderId is required, but received null.',
    );
  });

  it('refuses an order id that is not a uuid', () => {
    expect(() => new OrderId('order-1')).toThrow(TypePrimitiveException);
    expect(() => new OrderId('order-1')).toThrow(
      'Validation Error: Expected a valid UUID, but received "order-1".',
    );
  });

  it.each([
    ['nil placeholder', '00000000-0000-0000-0000-000000000000'],
    ['max placeholder', 'ffffffff-ffff-ffff-ffff-ffffffffffff'],
    ['max placeholder in capitals', 'FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF'],
  ])('refuses the %s that a careless seed script might use, which UuidType accepts', (_, id) => {
    expect(new UuidType(id).value).toBe(id.toLowerCase());
    expect(() => new OrderId(id)).toThrow(TypePrimitiveException);
    expect(() => new OrderId(id)).toThrow(
      `Validation Error: Expected a valid Id, but received "${id}".`,
    );
  });

  it.each([
    ['a random id for a new order', IdType.random()],
    ['a version 1 id migrated from a legacy system', '6ba7b810-9dad-11d1-80b4-00c04fd430c8'],
    ['an id derived from the external order number', IdType.fromValue('SHOP-2024-0001')],
  ])('accepts %s', (_, id) => {
    expect(new OrderId(id).value).toBe(id);
  });

  it('an id typed in capitals by support staff matches the stored lowercase id', () => {
    const typed = new OrderId('DF9EF000-21FC-4E06-B8F7-103C3A133D10');
    expect(typed.value).toBe(STORED);
    expect(typed.equals(new OrderId(STORED))).toBe(true);
  });

  it('a customer id is refused where an order id is expected, at compile time', () => {
    const cancelOrder = (orderId: OrderId): string => `cancelled ${orderId}`;
    expectTypeOf<CustomerId>().not.toExtend<OrderId>();
    expectTypeOf<OrderId>().not.toExtend<CustomerId>();
    expectTypeOf<OrderId>().toExtend<IdType>();
    // @ts-expect-error a CustomerId is not an OrderId
    expect(cancelOrder(new CustomerId(STORED))).toBe(`cancelled ${STORED}`);
  });

  it('an order id and a customer id are never equal, even with the same uuid', () => {
    expect(new OrderId(STORED).equals(new CustomerId(STORED))).toBe(false);
  });

  it('prints as the plain lowercase id', () => {
    const orderId = new OrderId('DF9EF000-21FC-4E06-B8F7-103C3A133D10');
    expect(`Order ${orderId} not paid`).toBe(`Order ${STORED} not paid`);
  });
});
