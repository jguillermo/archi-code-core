import { describe, expectTypeOf, it } from 'vitest';
import { PrimitiveType } from '../../src/primitive/primitive-type';
import { ArrayType } from '../../src/type/array-type';
import { BooleanType } from '../../src/type/boolean-type';
import { CreatedAt, DateType, UpdatedAt } from '../../src/type/date-type';
import { EnumType } from '../../src/type/enum-type';
import { IdType } from '../../src/type/id-type';
import { JsonType } from '../../src/type/json-type';
import { NumberType } from '../../src/type/number-type';
import { Required } from '../../src/type/required/required';
import { StringType } from '../../src/type/string-type';
import { UuidType } from '../../src/type/uuid-type';
import { Entity } from '../../src/entity/entity';

enum OrderStatus {
  Pending = 'pending',
  Paid = 'paid',
}

enum Priority {
  Low = 1,
  High = 2,
}

class CustomerName extends Required(StringType) {}
class Nickname extends StringType {}
class Quantity extends Required(NumberType) {}
class Discount extends NumberType {}
class Gift extends Required(BooleanType) {}
class DeliveredAt extends DateType {}
class PaidAt extends Required(DateType) {}
class TrackingCode extends UuidType {}
class OrderId extends IdType {}

class Status extends EnumType<OrderStatus> {
  protected getEnum(): typeof OrderStatus {
    return OrderStatus;
  }
}
class RequiredStatus extends Required(Status) {}

class PriorityLevel extends EnumType<Priority> {
  protected getEnum(): typeof Priority {
    return Priority;
  }
}
class RequiredPriority extends Required(PriorityLevel) {}

interface ShippingAddress {
  city: string;
  zip: string;
}
class Address extends JsonType<ShippingAddress> {}
class RequiredAddress extends Required(Address) {}

class Tags extends ArrayType<CustomerName> {
  protected createItem(value: unknown): CustomerName {
    return new CustomerName(value as string);
  }
}
class RequiredTags extends Required(Tags) {}

class OrderLine extends Entity {
  constructor(
    id: IdType,
    readonly quantity: Quantity,
    readonly discount: Discount,
  ) {
    super(id);
  }
}

describe('PrimitiveType', () => {
  it('a required value object is the plain value a repository stores', () => {
    expectTypeOf<PrimitiveType<CustomerName>>().toEqualTypeOf<string>();
    expectTypeOf<PrimitiveType<Quantity>>().toEqualTypeOf<number>();
    expectTypeOf<PrimitiveType<Gift>>().toEqualTypeOf<boolean>();
    expectTypeOf<PrimitiveType<PaidAt>>().toEqualTypeOf<Date>();
    expectTypeOf<PrimitiveType<OrderId>>().toEqualTypeOf<string>();
  });

  it('an optional value object may be stored as null', () => {
    expectTypeOf<PrimitiveType<Nickname>>().toEqualTypeOf<string | null>();
    expectTypeOf<PrimitiveType<Discount>>().toEqualTypeOf<number | null>();
    expectTypeOf<PrimitiveType<DeliveredAt>>().toEqualTypeOf<Date | null>();
    expectTypeOf<PrimitiveType<TrackingCode>>().toEqualTypeOf<string | null>();
    expectTypeOf<PrimitiveType<BooleanType>>().toEqualTypeOf<boolean | null>();
  });

  it('the creation and update dates are always present', () => {
    expectTypeOf<PrimitiveType<CreatedAt>>().toEqualTypeOf<Date>();
    expectTypeOf<PrimitiveType<UpdatedAt>>().toEqualTypeOf<Date>();
  });

  it('an enum is stored as the plain text or number of its column', () => {
    expectTypeOf<PrimitiveType<RequiredStatus>>().toEqualTypeOf<string>();
    expectTypeOf<PrimitiveType<Status>>().toEqualTypeOf<string | null>();
    expectTypeOf<PrimitiveType<RequiredPriority>>().toEqualTypeOf<number>();
    expectTypeOf<PrimitiveType<PriorityLevel>>().toEqualTypeOf<number | null>();
  });

  it('a JSON value object is stored as its document', () => {
    expectTypeOf<PrimitiveType<RequiredAddress>>().toEqualTypeOf<ShippingAddress>();
    expectTypeOf<PrimitiveType<Address>>().toEqualTypeOf<ShippingAddress | null>();
  });

  it('an array value object is stored as the list of its item values', () => {
    expectTypeOf<PrimitiveType<RequiredTags>>().toEqualTypeOf<string[]>();
    expectTypeOf<PrimitiveType<Tags>>().toEqualTypeOf<string[] | null>();
  });

  it('a plain list of value objects becomes a list of values, item by item', () => {
    expectTypeOf<PrimitiveType<CustomerName[]>>().toEqualTypeOf<string[]>();
    expectTypeOf<PrimitiveType<Nickname[]>>().toEqualTypeOf<(string | null)[]>();
    expectTypeOf<PrimitiveType<RequiredStatus[]>>().toEqualTypeOf<string[]>();
    expectTypeOf<PrimitiveType<OrderId[][]>>().toEqualTypeOf<string[][]>();
  });

  it('a child entity becomes the object of its primitives, also in a list', () => {
    interface OrderLinePrimitives {
      id: string;
      quantity: number;
      discount: number | null;
    }

    expectTypeOf<PrimitiveType<OrderLine>>().toEqualTypeOf<OrderLinePrimitives>();
    expectTypeOf<PrimitiveType<OrderLine[]>>().toEqualTypeOf<OrderLinePrimitives[]>();
  });

  it('plain scalars such as the aggregate version pass through as they are', () => {
    expectTypeOf<PrimitiveType<number>>().toEqualTypeOf<number>();
    expectTypeOf<PrimitiveType<string>>().toEqualTypeOf<string>();
    expectTypeOf<PrimitiveType<boolean>>().toEqualTypeOf<boolean>();
    expectTypeOf<PrimitiveType<Date>>().toEqualTypeOf<Date>();
    expectTypeOf<PrimitiveType<null>>().toEqualTypeOf<null>();
  });

  it('anything else cannot be stored and becomes never', () => {
    expectTypeOf<PrimitiveType<Map<string, number>>>().toEqualTypeOf<never>();
    expectTypeOf<PrimitiveType<{ city: string }>>().toEqualTypeOf<never>();
    expectTypeOf<PrimitiveType<() => void>>().toEqualTypeOf<never>();
  });
});
