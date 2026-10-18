import { describe, expect, expectTypeOf, it } from 'vitest';
import type {
  DataTypes,
  Methods,
  MethodsAndProperties,
  MutablePropertiesData,
  PrimitiveType,
  PrimitiveTypes,
  Properties,
  PropertiesData,
} from '../../../src/domain/primitive/primitive-types';
import { AggregateRoot } from '../../../src/domain/aggregate/aggregate-root';
import { ArrayType } from '../../../src/domain/type/array-type';
import { CreatedAt, DateType, UpdatedAt } from '../../../src/domain/type/date-type';
import { EnumType } from '../../../src/domain/type/enum-type';
import { IdType } from '../../../src/domain/type/id-type';
import { NumberType } from '../../../src/domain/type/number-type';
import { Required } from '../../../src/domain/type/required/required';
import { StringType } from '../../../src/domain/type/string-type';
import { BooleanType } from '../../../src/domain/type/boolean-type';
import { JsonType } from '../../../src/domain/type/json-type';
import { UuidType } from '../../../src/domain/type/uuid-type';

enum OrderStatusValue {
  Pending = 'pending',
  Paid = 'paid',
}

class OrderId extends IdType {}
class LineId extends IdType {}
class CustomerName extends Required(StringType) {}
class Total extends NumberType {}
class Quantity extends Required(NumberType) {}
class Tag extends Required(StringType) {}

class OrderStatus extends Required(
  class extends EnumType<OrderStatusValue> {
    protected getEnum(): typeof OrderStatusValue {
      return OrderStatusValue;
    }
  },
) {}

class Tags extends Required(
  class extends ArrayType<Tag> {
    protected createItem(value: unknown): Tag {
      return new Tag(value as string);
    }
  },
) {}

class OrderLine {
  constructor(
    readonly id: LineId,
    readonly quantity: Quantity,
  ) {}
}

class Order extends AggregateRoot<OrderId> {
  constructor(
    id: OrderId,
    private readonly _customerName: CustomerName,
    private _total: Total,
    readonly tags: Tags,
    readonly lines: OrderLine[],
    readonly status: OrderStatus,
    readonly createdAt: CreatedAt,
  ) {
    super(id);
  }

  get customerName(): CustomerName {
    return this._customerName;
  }

  get total(): Total {
    return this._total;
  }

  applyTotal(total: number): void {
    this._total = new Total(total);
  }

  toPrimitives(): PrimitiveTypes<Order> {
    return {
      id: this.id.value,
      customerName: this.customerName.value,
      total: this.total.value,
      tags: this.tags.value,
      lines: this.lines.map((line) => ({ id: line.id.value, quantity: line.quantity.value })),
      status: this.status.value,
      createdAt: this.createdAt.value,
    };
  }

  static fromPrimitives(data: PrimitiveTypes<Order>): Order {
    return new Order(
      new OrderId(data.id),
      new CustomerName(data.customerName),
      new Total(data.total),
      new Tags(data.tags),
      data.lines.map((line) => new OrderLine(new LineId(line.id), new Quantity(line.quantity))),
      new OrderStatus(data.status as OrderStatusValue),
      new CreatedAt(data.createdAt),
    );
  }
}

interface OrderPrimitives {
  id: string;
  customerName: string;
  total: number | null;
  tags: string[];
  lines: { id: string; quantity: number }[];
  status: string;
  createdAt: Date;
}

const storedOrder: OrderPrimitives = {
  id: '42e05ee0-ace6-4565-b86a-ffdb0590341e',
  customerName: 'Ana',
  total: 120.5,
  tags: ['gift', 'express'],
  lines: [{ id: '0b4fd2c4-5a8f-4a7c-9f6f-8a6a4b3c2d1e', quantity: 2 }],
  status: 'paid',
  createdAt: new Date('2026-01-10T08:00:00.000Z'),
};

class InvoiceTotal extends Required(NumberType) {}

describe('PrimitiveTypes', () => {
  it('describes the row a repository stores for an aggregate, with its id', () => {
    expectTypeOf<PrimitiveTypes<Order>>().toEqualTypeOf<OrderPrimitives>();
  });

  it('lets an aggregate go to its primitives and back, as a repository does', () => {
    const order = Order.fromPrimitives(storedOrder);

    const primitives = order.toPrimitives();

    expect(primitives).toEqual(storedOrder);
    expect(primitives.createdAt.toISOString()).toBe('2026-01-10T08:00:00.000Z');
  });

  it('leaves out the version every aggregate inherits: the repository stores it apart', () => {
    class Invoice extends AggregateRoot {
      constructor(
        id: IdType,
        readonly total: InvoiceTotal,
      ) {
        super(id);
      }
    }

    expectTypeOf<Invoice['version']>().toEqualTypeOf<number>();
    expectTypeOf<PrimitiveTypes<Invoice>>().toEqualTypeOf<{ id: string; total: number }>();
  });

  it('keeps a version member of a child entity, which is plain state of the aggregate', () => {
    class Revision {
      constructor(readonly version: InvoiceTotal) {}
    }

    expectTypeOf<PrimitiveTypes<Revision>>().toEqualTypeOf<{ version: number }>();
  });

  it('a getter that exposes a raw boolean makes its key never, so toPrimitives cannot be written', () => {
    class Shipment extends AggregateRoot {
      constructor(
        id: IdType,
        private _delivered: boolean,
      ) {
        super(id);
      }

      get delivered(): boolean {
        return this._delivered;
      }

      toPrimitives(): PrimitiveTypes<Shipment> {
        // @ts-expect-error a raw boolean is not a value object: its primitive is never
        return { id: this.id.value, delivered: this.delivered };
      }
    }

    expectTypeOf<PrimitiveTypes<Shipment>>().toEqualTypeOf<{ id: string; delivered: never }>();
    expect(typeof Shipment.prototype.toPrimitives).toBe('function');
  });

  it('removes the leading underscore of private-looking public fields', () => {
    class Customer extends AggregateRoot {
      constructor(
        id: IdType,
        readonly _name: CustomerName,
      ) {
        super(id);
      }
    }

    expectTypeOf<PrimitiveTypes<Customer>>().toEqualTypeOf<{ id: string; name: string }>();
  });

  it('ignores private fields, methods and the domain events of the aggregate', () => {
    type Keys = keyof PrimitiveTypes<Order>;

    expectTypeOf<'_total' extends Keys ? true : false>().toEqualTypeOf<false>();
    expectTypeOf<'applyTotal' extends Keys ? true : false>().toEqualTypeOf<false>();
    expectTypeOf<'pullDomainEvents' extends Keys ? true : false>().toEqualTypeOf<false>();
    expectTypeOf<'domainEvents' extends Keys ? true : false>().toEqualTypeOf<false>();
  });

  it('DataTypes is the partial data of a PATCH request', () => {
    const patch: DataTypes<Order> = { customerName: 'Luis', total: null };

    expectTypeOf<DataTypes<Order>>().toEqualTypeOf<Partial<OrderPrimitives>>();
    expect(patch).toStrictEqual({ customerName: 'Luis', total: null });
  });

  describe('property helpers', () => {
    class Product {
      constructor(
        readonly sku: string,
        public price?: number,
      ) {}

      discount(): number {
        return 0;
      }
    }

    it('Methods lists the method names', () => {
      class Cart {
        constructor(readonly id: string) {}

        total(): number {
          return 0;
        }

        clear(): void {}
      }

      expectTypeOf<Methods<Cart>>().toEqualTypeOf<'total' | 'clear'>();
    });

    it('Methods ignores optional data members such as a discount not set yet', () => {
      class Checkout {
        discount?: number;

        pay(): void {}
      }

      expectTypeOf<Methods<Checkout>>().toEqualTypeOf<'pay'>();
      expectTypeOf<Properties<Checkout>>().toEqualTypeOf<{ discount?: number }>();
    });

    it('Properties keeps only the data members', () => {
      expectTypeOf<Properties<Product>>().toEqualTypeOf<{
        readonly sku: string;
        price?: number;
      }>();
    });

    it('PropertiesData makes every data member present', () => {
      expectTypeOf<PropertiesData<Product>>().toEqualTypeOf<{
        readonly sku: string;
        price: number;
      }>();
    });

    it('MutablePropertiesData also removes readonly, as a form model needs', () => {
      expectTypeOf<MutablePropertiesData<Product>>().toEqualTypeOf<{
        sku: string;
        price: number;
      }>();
    });

    it('MethodsAndProperties keeps every public member', () => {
      expectTypeOf<MethodsAndProperties<Product>>().toEqualTypeOf<{
        readonly sku: string;
        price?: number;
        discount: () => number;
      }>();
    });
  });
});

describe('PrimitiveType: the primitive of one member', () => {
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

  class OrderLine {
    constructor(
      readonly id: IdType,
      readonly quantity: Quantity,
      readonly discount: Discount,
    ) {}
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

    it('a child entity, a plain class with no base, becomes the object of its primitives', () => {
      interface OrderLinePrimitives {
        id: string;
        quantity: number;
        discount: number | null;
      }

      expectTypeOf<PrimitiveType<OrderLine>>().toEqualTypeOf<OrderLinePrimitives>();
      expectTypeOf<PrimitiveType<OrderLine[]>>().toEqualTypeOf<OrderLinePrimitives[]>();
      expectTypeOf<PrimitiveType<OrderLine | null>>().toEqualTypeOf<OrderLinePrimitives | null>();
    });

    it('a nested plain object becomes the object of its primitives, its raw fields never', () => {
      expectTypeOf<PrimitiveType<{ city: string; zip: CustomerName }>>().toEqualTypeOf<{
        city: never;
        zip: string;
      }>();
    });

    it('raw scalars such as a stock counter kept as a number cannot be stored: they become never', () => {
      expectTypeOf<PrimitiveType<number>>().toEqualTypeOf<never>();
      expectTypeOf<PrimitiveType<string>>().toEqualTypeOf<never>();
      expectTypeOf<PrimitiveType<boolean>>().toEqualTypeOf<never>();
      expectTypeOf<PrimitiveType<Date>>().toEqualTypeOf<never>();
    });

    it('an absent optional child, null, is stored as null', () => {
      expectTypeOf<PrimitiveType<null>>().toEqualTypeOf<null>();
    });

    it('values that are not value objects nor child entities become never', () => {
      expectTypeOf<PrimitiveType<undefined>>().toEqualTypeOf<never>();
      expectTypeOf<PrimitiveType<symbol>>().toEqualTypeOf<never>();
      expectTypeOf<PrimitiveType<bigint>>().toEqualTypeOf<never>();
    });
  });
});
