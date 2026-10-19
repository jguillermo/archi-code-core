import { describe, expect, expectTypeOf, it } from 'vitest';
import { AggregateRoot } from '../../src/domain/aggregate/aggregate-root';
import { BooleanType } from '../../src/domain/type/boolean-type';
import { CreatedAt } from '../../src/domain/type/date-type';
import { EnumType } from '../../src/domain/type/enum-type';
import { IdType } from '../../src/domain/type/id-type';
import { NumberType } from '../../src/domain/type/number-type';
import { Required } from '../../src/domain/type/required/required';
import { StringType } from '../../src/domain/type/string-type';
import { Composite } from '../../src/domain/type/composite/composite';
import type { PrimitiveTypes } from '../../src/domain/primitive/primitive-types';

class OrderId extends IdType<'OrderId'> {}
class LineId extends IdType<'LineId'> {}
class CustomerName extends Required(StringType) {}
class Sku extends Required(StringType) {}
class Units extends Required(NumberType) {}
class Shipped extends Required(BooleanType) {}
class CouponCode extends Required(StringType) {}
class Percent extends Required(NumberType) {}

enum Status {
  PLACED = 'placed',
  SHIPPED = 'shipped',
}

class StatusType extends EnumType<Status> {
  protected getEnum(): typeof Status {
    return Status;
  }
}

class OrderStatus extends Required(StatusType) {}

class OrderLine {
  constructor(
    readonly id: LineId,
    readonly sku: Sku,
    readonly units: Units,
  ) {}
}

class Coupon {
  constructor(
    readonly code: CouponCode,
    readonly percent: Percent,
  ) {}
}

class Order extends AggregateRoot<OrderId> {
  private constructor(
    id: OrderId,
    private _customer: CustomerName,
    private _status: OrderStatus,
    private _shipped: Shipped,
    readonly placedAt: CreatedAt,
    private _lines: OrderLine[],
    private _coupon: Coupon | null,
  ) {
    super(id);
  }

  static place(id: string, customer: string): Order {
    return new Order(
      new OrderId(id),
      new CustomerName(customer),
      new OrderStatus(Status.PLACED),
      new Shipped(false),
      new CreatedAt(new Date('2026-03-01T09:30:00Z')),
      [],
      null,
    );
  }

  static fromPrimitives(primitives: PrimitiveTypes<Order>): Order {
    return new Order(
      new OrderId(primitives.id),
      new CustomerName(primitives.customer),
      new OrderStatus(primitives.status),
      new Shipped(primitives.shipped),
      new CreatedAt(primitives.placedAt),
      primitives.lines.map(
        (line) => new OrderLine(new LineId(line.id), new Sku(line.sku), new Units(line.units)),
      ),
      primitives.coupon === null
        ? null
        : new Coupon(
            new CouponCode(primitives.coupon.code),
            new Percent(primitives.coupon.percent),
          ),
    );
  }

  get customer(): CustomerName {
    return this._customer;
  }

  get status(): OrderStatus {
    return this._status;
  }

  get shipped(): Shipped {
    return this._shipped;
  }

  get lines(): OrderLine[] {
    return [...this._lines];
  }

  get coupon(): Coupon | null {
    return this._coupon;
  }

  addLine(id: string, sku: string, units: number): void {
    this._lines = [...this._lines, new OrderLine(new LineId(id), new Sku(sku), new Units(units))];
  }

  applyCoupon(code: string, percent: number): void {
    this._coupon = new Coupon(new CouponCode(code), new Percent(percent));
  }

  ship(): void {
    this._status = new OrderStatus(Status.SHIPPED);
    this._shipped = new Shipped(true);
  }

  toPrimitives(): PrimitiveTypes<Order> {
    return {
      id: this.id.value,
      customer: this.customer.value,
      status: this.status.value,
      shipped: this.shipped.value,
      placedAt: this.placedAt.value,
      lines: this._lines.map((line) => ({
        id: line.id.value,
        sku: line.sku.value,
        units: line.units.value,
      })),
      coupon:
        this._coupon === null
          ? null
          : { code: this._coupon.code.value, percent: this._coupon.percent.value },
    };
  }
}

const orderId = '9b2f6c1e-4d3a-4f8b-a1c2-3e4d5f6a7b8c';
const lineId = '0f8c2b6e-3c1a-4c55-9a4e-0d6c1b2f7a10';

function shippedOrderWithCoupon(): Order {
  const order = Order.place(orderId, 'Ana');
  order.addLine(lineId, 'TORCH-01', 2);
  order.applyCoupon('SPRING10', 10);
  order.ship();
  return order;
}

describe('aggregates convert themselves: toPrimitives and fromPrimitives are their own', () => {
  describe('typing', () => {
    it('types toPrimitives and fromPrimitives by the aggregate', () => {
      expectTypeOf(Order.prototype.toPrimitives).returns.toEqualTypeOf<PrimitiveTypes<Order>>();
      expectTypeOf(Order.fromPrimitives).returns.toEqualTypeOf<Order>();
    });

    it('stores only plain data: every value object becomes its value', () => {
      expectTypeOf<PrimitiveTypes<Order>>().toEqualTypeOf<{
        id: string;
        customer: string;
        status: Status;
        shipped: boolean;
        placedAt: Date;
        lines: { id: string; sku: string; units: number }[];
        coupon: { code: string; percent: number } | null;
      }>();
    });

    it('does not accept an aggregate whose toPrimitives misses part of its primitives', () => {
      class Ticket extends AggregateRoot {
        constructor(
          id: IdType,
          readonly subject: CustomerName,
        ) {
          super(id);
        }

        static fromPrimitives(primitives: PrimitiveTypes<Ticket>): Ticket {
          return new Ticket(new IdType(primitives.id), new CustomerName(primitives.subject));
        }

        toPrimitives(): { id: string } {
          return { id: this.id.value };
        }
      }
      const ticket = new Ticket(new IdType(orderId), new CustomerName('Broken printer'));
      expectTypeOf(ticket.toPrimitives()).not.toEqualTypeOf<PrimitiveTypes<Ticket>>();
    });
  });

  describe('saving and loading an order', () => {
    it('turns a shipped order with lines and a coupon into plain primitives', () => {
      expect(shippedOrderWithCoupon().toPrimitives()).toEqual({
        id: orderId,
        customer: 'Ana',
        status: 'shipped',
        shipped: true,
        placedAt: new Date('2026-03-01T09:30:00Z'),
        lines: [{ id: lineId, sku: 'TORCH-01', units: 2 }],
        coupon: { code: 'SPRING10', percent: 10 },
      });
    });

    it('rebuilds the same order from what it stored: the round trip every aggregate needs', () => {
      const stored = shippedOrderWithCoupon().toPrimitives();
      const loaded = Order.fromPrimitives(stored);
      expect(loaded).toBeInstanceOf(Order);
      expect(loaded.equals(shippedOrderWithCoupon())).toBe(true);
      expect(loaded.toPrimitives()).toEqual(stored);
    });

    it('keeps an order without coupon as null', () => {
      const stored = Order.place(orderId, 'Ana').toPrimitives();
      expect(stored.coupon).toBeNull();
      expect(Order.fromPrimitives(stored).coupon).toBeNull();
    });

    it('rebuilds from a database row whose dates came back as ISO text', () => {
      const row = JSON.parse(JSON.stringify(shippedOrderWithCoupon().toPrimitives()));
      expect(Order.fromPrimitives(row).placedAt.toString()).toBe('2026-03-01T09:30:00.000Z');
    });

    it('gives the rebuilt order the version the repository stored next to the primitives', () => {
      const stored = shippedOrderWithCoupon().toPrimitives();
      expect(Order.fromPrimitives(stored).restoreVersion(3).version).toBe(3);
      expect(Order.fromPrimitives(stored).version).toBe(0);
    });

    it('never writes the version into the primitives: the repository stores it apart', () => {
      const order = shippedOrderWithCoupon();
      order.markPersisted();
      expect(order.toPrimitives()).not.toHaveProperty('version');
    });

    it('records no events when it rebuilds an order', () => {
      const loaded = Order.fromPrimitives(shippedOrderWithCoupon().toPrimitives());
      expect(loaded.pullDomainEvents()).toEqual([]);
    });
  });

  describe('aggregates that hold composite value objects', () => {
    class Cents extends Required(NumberType) {}
    class Currency extends Required(StringType) {}
    class Money extends Composite({ amount: Cents, currency: Currency }) {}
    class ProductId extends IdType<'ProductId'> {}
    class ProductName extends Required(StringType) {}

    class Product extends AggregateRoot<ProductId> {
      private constructor(
        id: ProductId,
        readonly name: ProductName,
        private _price: Money,
        readonly discount: Money | null,
      ) {
        super(id);
      }

      static list(id: string, name: string, price: Money): Product {
        return new Product(new ProductId(id), new ProductName(name), price, null);
      }

      static fromPrimitives(primitives: PrimitiveTypes<Product>): Product {
        return new Product(
          new ProductId(primitives.id),
          new ProductName(primitives.name),
          Money.fromPrimitives(primitives.price),
          primitives.discount === null ? null : Money.fromPrimitives(primitives.discount),
        );
      }

      get price(): Money {
        return this._price;
      }

      reprice(price: Money): void {
        this._price = price;
      }

      toPrimitives(): PrimitiveTypes<Product> {
        return {
          id: this.id.value,
          name: this.name.value,
          price: this.price.toPrimitives(),
          discount: this.discount?.toPrimitives() ?? null,
        };
      }
    }

    const productId = '5d6e7f80-9a1b-4c2d-8e3f-4a5b6c7d8e9f';
    const torch = () =>
      Product.list(
        productId,
        'Welding torch',
        Money.fromPrimitives({ amount: 1250, currency: 'EUR' }),
      );

    it('types the composite field as its primitives, and a missing one as null', () => {
      expectTypeOf<PrimitiveTypes<Product>>().toEqualTypeOf<{
        id: string;
        name: string;
        price: { amount: number; currency: string };
        discount: { amount: number; currency: string } | null;
      }>();
    });

    it('stores the composite as plain data and rebuilds it as the same value', () => {
      const stored = torch().toPrimitives();
      expect(stored).toEqual({
        id: productId,
        name: 'Welding torch',
        price: { amount: 1250, currency: 'EUR' },
        discount: null,
      });
      const loaded = Product.fromPrimitives(stored);
      expect(loaded.price).toBeInstanceOf(Money);
      expect(loaded.price.equals(torch().price)).toBe(true);
    });

    it('goes through a repository of products like any other value object', async () => {
      class InMemoryProductRepository {
        private readonly rows = new Map<string, PrimitiveTypes<Product>>();

        async findById(id: ProductId): Promise<Product | null> {
          const row = this.rows.get(id.value);
          return row === undefined ? null : Product.fromPrimitives(structuredClone(row));
        }

        async save(product: Product): Promise<void> {
          this.rows.set(product.id.value, structuredClone(product.toPrimitives()));
        }
      }
      const products = new InMemoryProductRepository();
      const product = torch();
      await products.save(product);
      product.reprice(Money.fromPrimitives({ amount: 990, currency: 'EUR' }));
      await products.save(product);
      const loaded = await products.findById(new ProductId(productId));
      expect(loaded?.price.toPrimitives()).toEqual({ amount: 990, currency: 'EUR' });
    });
  });
});
