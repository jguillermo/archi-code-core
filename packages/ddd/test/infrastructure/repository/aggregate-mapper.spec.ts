import { describe, expect, expectTypeOf, it } from 'vitest';
import { AggregateMapper } from '../../../src/infrastructure/repository/aggregate-mapper';
import { AggregateRoot } from '../../../src/domain/aggregate/aggregate-root';
import { BooleanType } from '../../../src/domain/type/boolean-type';
import { CreatedAt } from '../../../src/domain/type/date-type';
import { EnumType } from '../../../src/domain/type/enum-type';
import { IdType } from '../../../src/domain/type/id-type';
import { NumberType } from '../../../src/domain/type/number-type';
import { Required } from '../../../src/domain/type/required/required';
import { StringType } from '../../../src/domain/type/string-type';
import type { PrimitiveTypes } from '../../../src/domain/primitive/primitive-types';
import { InternalErrorException } from '../../../src/exceptions/infrastructure/internal-error.exception';

class OrderId extends IdType {}
class LineId extends IdType {}
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
      new OrderStatus(primitives.status as Status),
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

describe('AggregateMapper: the only bridge between an aggregate and its stored primitives', () => {
  describe('typing', () => {
    it('is built from the aggregate class and typed by it', () => {
      expectTypeOf(AggregateMapper.of(Order)).toEqualTypeOf<AggregateMapper<Order>>();
      expectTypeOf(AggregateMapper.of(Order).toPrimitives).returns.toEqualTypeOf<
        PrimitiveTypes<Order>
      >();
      expectTypeOf(AggregateMapper.of(Order).fromPrimitives).returns.toEqualTypeOf<Order>();
    });

    it('stores only plain data: every value object becomes its value', () => {
      expectTypeOf<PrimitiveTypes<Order>>().toEqualTypeOf<{
        id: string;
        customer: string;
        status: string;
        shipped: boolean;
        placedAt: Date;
        lines: { id: string; sku: string; units: number }[];
        coupon: { code: string; percent: number } | null;
      }>();
    });

    it('does not accept an aggregate class without fromPrimitives', () => {
      class Note extends AggregateRoot {
        toPrimitives(): PrimitiveTypes<Note> {
          return { id: this.id.value };
        }
      }
      // @ts-expect-error a mapper needs static fromPrimitives to rebuild the aggregate
      expect(() => AggregateMapper.of(Note).fromPrimitives({ id: orderId })).toThrow(TypeError);
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
      // @ts-expect-error toPrimitives must return PrimitiveTypes<Ticket>, subject included
      const mapper = AggregateMapper.of(Ticket);
      // @ts-expect-error the same mismatch makes the ticket unusable with that mapper
      const save = () => mapper.toPrimitives(ticket);
      expect(save).toThrow('Ticket.subject is not in its primitives');
    });
  });

  describe('saving and loading an order', () => {
    it('turns a shipped order with lines and a coupon into plain primitives', () => {
      expect(AggregateMapper.of(Order).toPrimitives(shippedOrderWithCoupon())).toEqual({
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
      const mapper = AggregateMapper.of(Order);
      const stored = mapper.toPrimitives(shippedOrderWithCoupon());
      const loaded = mapper.fromPrimitives(stored);
      expect(loaded).toBeInstanceOf(Order);
      expect(loaded.equals(shippedOrderWithCoupon())).toBe(true);
      expect(mapper.toPrimitives(loaded)).toEqual(stored);
    });

    it('keeps an order without coupon as null', () => {
      const mapper = AggregateMapper.of(Order);
      const stored = mapper.toPrimitives(Order.place(orderId, 'Ana'));
      expect(stored.coupon).toBeNull();
      expect(mapper.fromPrimitives(stored).coupon).toBeNull();
    });

    it('rebuilds from a database row whose dates came back as ISO text', () => {
      const mapper = AggregateMapper.of(Order);
      const row = JSON.parse(JSON.stringify(mapper.toPrimitives(shippedOrderWithCoupon())));
      expect(mapper.fromPrimitives(row).placedAt.toString()).toBe('2026-03-01T09:30:00.000Z');
    });

    it('records no events when it rebuilds an order', () => {
      const mapper = AggregateMapper.of(Order);
      const loaded = mapper.fromPrimitives(mapper.toPrimitives(shippedOrderWithCoupon()));
      expect(loaded.pullDomainEvents()).toEqual([]);
    });
  });

  describe('aggregates that break the rule: all state is value objects', () => {
    class Draft extends AggregateRoot {
      private constructor(
        id: IdType,
        private _submitted: boolean,
      ) {
        super(id);
      }

      static start(): Draft {
        return new Draft(new IdType(orderId), false);
      }

      static fromPrimitives(primitives: PrimitiveTypes<Draft>): Draft {
        return new Draft(new IdType(primitives.id), false);
      }

      toPrimitives(): PrimitiveTypes<Draft> {
        return { id: this.id.value };
      }
    }

    class Invoice extends AggregateRoot {
      private constructor(
        id: IdType,
        private _dueOn: Date,
      ) {
        super(id);
      }

      static issue(): Invoice {
        return new Invoice(new IdType(orderId), new Date('2026-04-01'));
      }

      static fromPrimitives(primitives: PrimitiveTypes<Invoice>): Invoice {
        return new Invoice(new IdType(primitives.id), new Date());
      }

      toPrimitives(): PrimitiveTypes<Invoice> {
        return { id: this.id.value };
      }
    }

    class Customer extends AggregateRoot {
      private constructor(
        id: IdType,
        private _name: CustomerName,
        private _internalNote: CustomerName,
      ) {
        super(id);
      }

      static register(): Customer {
        return new Customer(new IdType(orderId), new CustomerName('Ana'), new CustomerName('VIP'));
      }

      static fromPrimitives(primitives: PrimitiveTypes<Customer>): Customer {
        return new Customer(
          new IdType(primitives.id),
          new CustomerName(primitives.name),
          new CustomerName('lost'),
        );
      }

      get name(): CustomerName {
        return this._name;
      }

      toPrimitives(): PrimitiveTypes<Customer> {
        return { id: this.id.value, name: this.name.value };
      }
    }

    class Basket extends AggregateRoot {
      private constructor(
        id: IdType,
        private _items: { sku: Sku; units: number }[],
      ) {
        super(id);
      }

      static fill(): Basket {
        return new Basket(new IdType(orderId), [{ sku: new Sku('TORCH-01'), units: 2 }]);
      }

      static fromPrimitives(primitives: PrimitiveTypes<Basket>): Basket {
        return new Basket(new IdType(primitives.id), []);
      }

      toPrimitives(): PrimitiveTypes<Basket> {
        return { id: this.id.value };
      }
    }

    class Label extends AggregateRoot {
      constructor(
        id: IdType,
        readonly text: CustomerName,
      ) {
        super(id);
      }

      static fromPrimitives(primitives: PrimitiveTypes<Label>): Label {
        return new Label(new IdType(primitives.id), new CustomerName(primitives.text));
      }

      toPrimitives(): PrimitiveTypes<Label> {
        return { id: this.id.value, text: this.text as unknown as string };
      }
    }

    class Parcel extends AggregateRoot {
      private _carrier!: CustomerName;

      static fromPrimitives(primitives: PrimitiveTypes<Parcel>): Parcel {
        return new Parcel(new IdType(primitives.id));
      }

      toPrimitives(): PrimitiveTypes<Parcel> {
        return { id: this.id.value };
      }

      init(): this {
        Object.assign(this, { _carrier: undefined });
        return this;
      }
    }

    it.each([
      [
        'a draft that keeps its submitted flag as a raw boolean',
        () => AggregateMapper.of(Draft).toPrimitives(Draft.start()),
        'Draft._submitted is a boolean, not a value object',
      ],
      [
        'an invoice that keeps its due date as a raw Date',
        () => AggregateMapper.of(Invoice).toPrimitives(Invoice.issue()),
        'Invoice._dueOn is a Date, not a value object',
      ],
      [
        'a customer with a private note no getter exposes, which would be lost on save',
        () => AggregateMapper.of(Customer).toPrimitives(Customer.register()),
        'Customer._internalNote is not in its primitives',
      ],
      [
        'a basket whose item child entity keeps raw units',
        () => AggregateMapper.of(Basket).toPrimitives(Basket.fill()),
        'Basket._items[0].units is a number, not a value object',
      ],
      [
        'a label whose toPrimitives returns the value object itself',
        () =>
          AggregateMapper.of(Label).toPrimitives(
            new Label(new IdType(orderId), new CustomerName('Fragile')),
          ),
        'Label.toPrimitives() returns a value object at primitives.text; return its value',
      ],
      [
        'a parcel whose carrier was never set',
        () => AggregateMapper.of(Parcel).toPrimitives(new Parcel(new IdType(orderId)).init()),
        'Parcel._carrier is undefined, not a value object',
      ],
    ])('refuses to store %s', (_, save, message) => {
      expect(save).toThrow(InternalErrorException);
      expect(save).toThrow(`Failed, internal error: ${message}`);
    });
  });
});
