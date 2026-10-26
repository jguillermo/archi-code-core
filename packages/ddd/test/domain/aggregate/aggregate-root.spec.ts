import { describe, expect, expectTypeOf, it } from 'vitest';
import { AggregateRoot } from '../../../src/domain/aggregate/aggregate-root';
import { EventBase } from '../../../src/domain/event/event-base';
import type { EventMetadata } from '../../../src/domain/event/event-base';
import { BooleanType } from '../../../src/domain/type/boolean-type';
import { IdType } from '../../../src/domain/type/id-type';
import { NumberType } from '../../../src/domain/type/number-type';
import { Required } from '../../../src/domain/type/required/required-type';
import { StringType } from '../../../src/domain/type/string-type';
import { DomainException } from '../../../src/domain/exceptions/domain.exception';
import type { PrimitiveTypes } from '../../../src/domain/primitive/primitive-types';

class OrderId extends IdType<'OrderId'> {}
class CustomerName extends Required(StringType) {}
class Sku extends Required(StringType) {}
class Quantity extends Required(NumberType) {}
class Shipped extends Required(BooleanType) {}

class OrderLine {
  constructor(
    readonly id: IdType,
    readonly sku: Sku,
    readonly quantity: Quantity,
  ) {}
}

class OrderPlaced extends EventBase {
  static readonly eventName = 'OrderPlaced';

  constructor(
    readonly orderId: string,
    readonly customer: string,
    metadata?: EventMetadata,
  ) {
    super(metadata);
  }
}

class OrderLineAdded extends EventBase {
  static readonly eventName = 'OrderLineAdded';

  constructor(
    readonly orderId: string,
    readonly sku: string,
    readonly quantity: number,
  ) {
    super();
  }
}

class OrderAlreadyShippedException extends DomainException {
  constructor(orderId: string) {
    super(`Order ${orderId} is already shipped`, ['ORD001']);
  }
}

class Order extends AggregateRoot<OrderId> {
  private constructor(
    id: OrderId,
    readonly customer: CustomerName,
    private _lines: OrderLine[],
    private _shipped: Shipped,
  ) {
    super(id);
  }

  static place(id: string, customer: string): Order {
    const order = new Order(new OrderId(id), new CustomerName(customer), [], new Shipped(false));
    order.record(new OrderPlaced(id, customer));
    return order;
  }

  static fromPrimitives(primitives: { id: string; customer: string; shipped: boolean }): Order {
    return new Order(
      new OrderId(primitives.id),
      new CustomerName(primitives.customer),
      [],
      new Shipped(primitives.shipped),
    );
  }

  get lines(): OrderLine[] {
    return [...this._lines];
  }

  addLine(sku: string, quantity: number): void {
    if (this._shipped.value) {
      throw new OrderAlreadyShippedException(this.id.value);
    }
    const line = new OrderLine(new IdType(IdType.random()), new Sku(sku), new Quantity(quantity));
    this._lines = [...this._lines, line];
    this.record(new OrderLineAdded(this.id.value, sku, quantity));
  }
}

const orderId = '9b2f6c1e-4d3a-4f8b-a1c2-3e4d5f6a7b8c';

describe('AggregateRoot: an order that records what happened to it', () => {
  it('is identified by its typed id', () => {
    const order = Order.place(orderId, 'Ana');
    expectTypeOf(order.id).toEqualTypeOf<OrderId>();
    expect(order.id.value).toBe(orderId);
  });

  describe('domain events', () => {
    it('placing an order records OrderPlaced with the order id as aggregate id', () => {
      const events = Order.place(orderId, 'Ana').pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(OrderPlaced);
      expect(events[0]).toMatchObject({ orderId, customer: 'Ana' });
    });

    it('hands back the same event it recorded, which guards its own fields as readonly', () => {
      const order = Order.place(orderId, 'Ana');
      order.pullDomainEvents();
      const placed = new OrderPlaced(orderId, 'Luis');
      // @ts-expect-error record is protected: only the aggregate decides what happened
      order.record(placed);
      expect(order.pullDomainEvents()[0]).toBe(placed);
    });

    it('returns the events in the order they happened', () => {
      const order = Order.place(orderId, 'Ana');
      order.addLine('TORCH-01', 2);
      order.addLine('HELMET-02', 1);
      expect(order.pullDomainEvents().map((event) => event.eventName)).toEqual([
        'OrderPlaced',
        'OrderLineAdded',
        'OrderLineAdded',
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
      });
      expect(() => order.addLine('TORCH-01', 1)).toThrow(OrderAlreadyShippedException);
      expect(order.pullDomainEvents()).toEqual([]);
    });

    it('types the pulled events as EventBase, the class every event extends', () => {
      expectTypeOf(Order.place(orderId, 'Ana').pullDomainEvents()).toEqualTypeOf<EventBase[]>();
    });

    it('the returned list is a copy: changing it does not touch the aggregate', () => {
      const order = Order.place(orderId, 'Ana');
      order.addLine('TORCH-01', 1);
      const events = order.pullDomainEvents();
      events.length = 0;
      order.addLine('HELMET-02', 1);
      expect(order.pullDomainEvents()).toHaveLength(1);
    });

    it('two loads of the same row compare equal in tests even if one has pending events', () => {
      const row = { id: orderId, customer: 'Ana', shipped: false };
      const untouched = Order.fromPrimitives(row);
      const changed = Order.fromPrimitives(row);
      changed.addLine('TORCH-01', 1);
      changed.pullDomainEvents();
      changed.addLine('HELMET-02', 1);
      expect(Object.keys(changed)).toEqual(Object.keys(untouched));
    });

    it('record is only callable by the aggregate itself', () => {
      const order = Order.place(orderId, 'Ana');
      // @ts-expect-error record is protected: only the aggregate decides what happened
      order.record(new OrderPlaced(orderId, 'Luis'));
      expect(order.pullDomainEvents()).toHaveLength(2);
    });
  });

  describe('persistence', () => {
    it('its primitives are what the repository stores: id and public state', () => {
      expectTypeOf<PrimitiveTypes<Order>>().toEqualTypeOf<{
        id: string;
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
      });
      expect(placed.equals(loaded)).toBe(true);
    });

    it('two orders with different ids are different', () => {
      const other = Order.place('3c4d5e6f-7a8b-4c9d-8e0f-1a2b3c4d5e6f', 'Ana');
      expect(Order.place(orderId, 'Ana').equals(other)).toBe(false);
    });

    it('an order loaded with its id typed in capitals by support staff is the same order', () => {
      const typed = Order.fromPrimitives({
        id: orderId.toUpperCase(),
        customer: 'Ana',
        shipped: false,
      });
      expect(Order.place(orderId, 'Ana').equals(typed)).toBe(true);
    });

    it('a return with the same id as an order is a different aggregate', () => {
      class ReturnRequest extends AggregateRoot<OrderId> {}
      const order = Order.place(orderId, 'Ana');
      expect(order.equals(new ReturnRequest(new OrderId(orderId)))).toBe(false);
    });

    it.each([
      ['null', null],
      ['undefined', undefined],
      ['its raw id', orderId],
      ['a plain object with the same id', { id: new OrderId(orderId) }],
    ])('is never equal to %s', (_, other) => {
      expect(Order.place(orderId, 'Ana').equals(other)).toBe(false);
    });

    it('accepts any value object as id, such as an employee number', () => {
      class EmployeeNumber extends Required(StringType) {}
      class Employee extends AggregateRoot<EmployeeNumber> {}
      const employee = new Employee(new EmployeeNumber('EMP-0042'));
      expectTypeOf(employee.id).toEqualTypeOf<EmployeeNumber>();
      expect(employee.id.value).toBe('EMP-0042');
      expect(employee.equals(new Employee(new EmployeeNumber('EMP-0042')))).toBe(true);
      expect(employee.equals(new Employee(new EmployeeNumber('EMP-0043')))).toBe(false);
    });
  });
});
