import { describe, expect, expectTypeOf, it } from 'vitest';
import type {
  DataTypes,
  Methods,
  MethodsAndProperties,
  MutablePropertiesData,
  PrimitiveTypes,
  Properties,
  PropertiesData,
} from '../../src/primitive/primitive-types';
import { AggregateRoot } from '../../src/aggregate/aggregate-root';
import { Entity } from '../../src/entity/entity';
import { ArrayType } from '../../src/type/array-type';
import { CreatedAt } from '../../src/type/date-type';
import { EnumType } from '../../src/type/enum-type';
import { IdType } from '../../src/type/id-type';
import { NumberType } from '../../src/type/number-type';
import { Required } from '../../src/type/required/required';
import { StringType } from '../../src/type/string-type';

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

class OrderLine extends Entity<LineId> {
  constructor(
    id: LineId,
    readonly quantity: Quantity,
  ) {
    super(id);
  }
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
    version?: number,
  ) {
    super(id, version);
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
      version: this.version,
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
      data.version,
    );
  }
}

interface OrderPrimitives {
  id: string;
  version: number;
  customerName: string;
  total: number | null;
  tags: string[];
  lines: { id: string; quantity: number }[];
  status: string;
  createdAt: Date;
}

const storedOrder: OrderPrimitives = {
  id: '42e05ee0-ace6-4565-b86a-ffdb0590341e',
  version: 3,
  customerName: 'Ana',
  total: 120.5,
  tags: ['gift', 'express'],
  lines: [{ id: '0b4fd2c4-5a8f-4a7c-9f6f-8a6a4b3c2d1e', quantity: 2 }],
  status: 'paid',
  createdAt: new Date('2026-01-10T08:00:00.000Z'),
};

describe('PrimitiveTypes', () => {
  it('describes the row a repository stores for an aggregate, with its id and version', () => {
    expectTypeOf<PrimitiveTypes<Order>>().toEqualTypeOf<OrderPrimitives>();
  });

  it('lets an aggregate go to its primitives and back, as a repository does', () => {
    const order = Order.fromPrimitives(storedOrder);

    const primitives = order.toPrimitives();

    expect(primitives).toEqual(storedOrder);
    expect(primitives.createdAt.toISOString()).toBe('2026-01-10T08:00:00.000Z');
  });

  it('a new aggregate starts at version 0', () => {
    const order = Order.fromPrimitives(storedOrder);
    const created = new Order(
      order.id,
      order.customerName,
      order.total,
      order.tags,
      order.lines,
      order.status,
      order.createdAt,
    );

    expect(created.toPrimitives().version).toBe(0);
  });

  it('removes the leading underscore of private-looking public fields', () => {
    class Customer extends Entity {
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
