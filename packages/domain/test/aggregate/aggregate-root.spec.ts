import { describe, expect, expectTypeOf, it } from 'vitest';
import { AggregateRoot } from '../../src/aggregate/aggregate-root';
import { Entity } from '../../src/entity/entity';
import { EventBase } from '../../src/event/event-base';
import type { EventMetadata } from '../../src/event/event-base';
import { IdType } from '../../src/type/id-type';
import { NumberType } from '../../src/type/number-type';
import { Required } from '../../src/type/required/required';
import { StringType } from '../../src/type/string-type';
import { TypePrimitiveException } from '../../src/exceptions/domain/type-primitive.exception';
import { DomainException } from '../../src/exceptions/domain/domain.exception';
import type { PrimitiveTypes } from '../../src/primitive/primitive-types';

class OrderId extends IdType {}
class CustomerName extends Required(StringType) {}
class Sku extends Required(StringType) {}
class Quantity extends Required(NumberType) {}

class OrderLine extends Entity {
  constructor(
    id: IdType,
    readonly sku: Sku,
    readonly quantity: Quantity,
  ) {
    super(id);
  }
}

class OrderPlaced extends EventBase {
  constructor(
    orderId: string,
    readonly customer: string,
    metadata?: EventMetadata,
  ) {
    super(orderId, metadata);
  }

  eventName(): string {
    return 'order.placed';
  }
}

class OrderLineAdded extends EventBase {
  constructor(
    orderId: string,
    readonly sku: string,
    readonly quantity: number,
  ) {
    super(orderId);
  }

  eventName(): string {
    return 'order.line_added';
  }
}

type OrderEvent = OrderPlaced | OrderLineAdded;

class OrderAlreadyShippedException extends DomainException {
  constructor(orderId: string) {
    super(`Order ${orderId} is already shipped`, ['ORD001']);
  }
}

class Order extends AggregateRoot<OrderId, OrderEvent> {
  private constructor(
    id: OrderId,
    readonly customer: CustomerName,
    private _lines: OrderLine[],
    private _shipped: boolean,
    version: number,
  ) {
    super(id, version);
  }

  static place(id: string, customer: string): Order {
    const order = new Order(new OrderId(id), new CustomerName(customer), [], false, 0);
    order.record(new OrderPlaced(id, customer));
    return order;
  }

  static fromPrimitives(primitives: {
    id: string;
    customer: string;
    shipped: boolean;
    version: number;
  }): Order {
    return new Order(
      new OrderId(primitives.id),
      new CustomerName(primitives.customer),
      [],
      primitives.shipped,
      primitives.version,
    );
  }

  get lines(): OrderLine[] {
    return [...this._lines];
  }

  addLine(sku: string, quantity: number): void {
    if (this._shipped) {
      throw new OrderAlreadyShippedException(this.id.value);
    }
    const line = new OrderLine(new IdType(IdType.random()), new Sku(sku), new Quantity(quantity));
    this._lines = [...this._lines, line];
    this.record(new OrderLineAdded(this.id.value, sku, quantity));
  }
}

const orderId = '9b2f6c1e-4d3a-4f8b-a1c2-3e4d5f6a7b8c';

describe('AggregateRoot: an order that records what happened to it', () => {
  it('is an entity identified by its typed id', () => {
    const order = Order.place(orderId, 'Ana');
    expect(order).toBeInstanceOf(Entity);
    expectTypeOf(order.id).toEqualTypeOf<OrderId>();
    expect(order.id.value).toBe(orderId);
  });

  describe('domain events', () => {
    it('placing an order records OrderPlaced with the order id as aggregate id', () => {
      const events = Order.place(orderId, 'Ana').pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(OrderPlaced);
      expect(events[0]).toMatchObject({ aggregateId: orderId, customer: 'Ana' });
    });

    it('returns the events in the order they happened', () => {
      const order = Order.place(orderId, 'Ana');
      order.addLine('TORCH-01', 2);
      order.addLine('HELMET-02', 1);
      expect(order.pullDomainEvents().map((event) => event.eventName())).toEqual([
        'order.placed',
        'order.line_added',
        'order.line_added',
      ]);
    });

    it('pulling empties the list, so a retried publish does not send them twice', () => {
      const order = Order.place(orderId, 'Ana');
      order.pullDomainEvents();
      expect(order.pullDomainEvents()).toEqual([]);
    });

    it('a failed business rule records no event', () => {
      const order = Order.fromPrimitives({
        id: orderId,
        customer: 'Ana',
        shipped: true,
        version: 3,
      });
      expect(() => order.addLine('TORCH-01', 1)).toThrow(OrderAlreadyShippedException);
      expect(order.pullDomainEvents()).toEqual([]);
    });

    it('types the pulled events as the union the aggregate declares', () => {
      expectTypeOf(Order.place(orderId, 'Ana').pullDomainEvents()).toEqualTypeOf<OrderEvent[]>();
    });

    it('the returned list is a copy: changing it does not touch the aggregate', () => {
      const order = Order.place(orderId, 'Ana');
      order.addLine('TORCH-01', 1);
      const events = order.pullDomainEvents();
      events.length = 0;
      order.addLine('HELMET-02', 1);
      expect(order.pullDomainEvents()).toHaveLength(1);
    });

    it('record is only callable by the aggregate itself', () => {
      const order = Order.place(orderId, 'Ana');
      // @ts-expect-error record is protected: only the aggregate decides what happened
      order.record(new OrderPlaced(orderId, 'Luis'));
      expect(order.pullDomainEvents()).toHaveLength(2);
    });
  });

  describe('version for optimistic concurrency', () => {
    it('a new order starts at version 0', () => {
      expect(Order.place(orderId, 'Ana').version).toBe(0);
    });

    it('an order loaded from the database keeps the stored version', () => {
      const order = Order.fromPrimitives({
        id: orderId,
        customer: 'Ana',
        shipped: false,
        version: 7,
      });
      expect(order.version).toBe(7);
    });

    it.each([
      ['negative', -1, '-1'],
      ['fractional', 1.5, '1.5'],
      ['NaN', NaN, 'NaN'],
      ['beyond the safe integers', Number.MAX_SAFE_INTEGER + 1, '9007199254740992'],
    ])('rejects a %s version read from a corrupt row', (_, version, received) => {
      const load = () =>
        Order.fromPrimitives({ id: orderId, customer: 'Ana', shipped: false, version });
      expect(load).toThrow(TypePrimitiveException);
      expect(load).toThrow(
        `Validation Error: Expected a valid version (a non-negative integer), but received ${received}.`,
      );
    });

    it('is part of the primitives the repository persists', () => {
      expectTypeOf<PrimitiveTypes<Order>>().toEqualTypeOf<{
        id: string;
        version: number;
        customer: string;
        lines: { id: string; sku: string; quantity: number }[];
      }>();
    });
  });

  describe('identity', () => {
    it('the same order loaded twice is equal even if its state differs', () => {
      const placed = Order.place(orderId, 'Ana');
      const loaded = Order.fromPrimitives({
        id: orderId,
        customer: 'Ana',
        shipped: true,
        version: 4,
      });
      expect(placed.equals(loaded)).toBe(true);
    });

    it('two orders with different ids are different', () => {
      const other = Order.place('3c4d5e6f-7a8b-4c9d-8e0f-1a2b3c4d5e6f', 'Ana');
      expect(Order.place(orderId, 'Ana').equals(other)).toBe(false);
    });
  });
});
