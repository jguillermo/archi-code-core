import { describe, expect, expectTypeOf, it } from 'vitest';
import type {
  AggregateFinder,
  AggregateRemover,
  AggregateSaver,
} from '../../../src/application/index';
import {
  AggregateRoot,
  CreatedAt,
  EnumType,
  IdType,
  Required,
  StringType,
} from '../../../src/domain/index';
import { DomainException } from '../../../src/exceptions/index';
import type { PrimitiveTypes } from '../../../src/domain/index';
import { FixedClock } from '../../../src/infrastructure/clock/fixed-clock';
import { InMemoryRepository } from '../../../src/infrastructure/repository/in-memory-repository';
import type { AggregateMapper } from '../../../src/infrastructure/repository/in-memory-repository';

class OrderId extends IdType {}
class CustomerName extends Required(StringType) {}
class Sku extends Required(StringType) {}

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

class OrderShippedException extends DomainException {
  constructor(orderId: string) {
    super(`Order ${orderId} is already shipped`, ['ORD001']);
  }
}

class Order extends AggregateRoot<OrderId> {
  private constructor(
    id: OrderId,
    readonly customer: CustomerName,
    private _lines: Sku[],
    private _status: OrderStatus,
    readonly createdAt: CreatedAt,
  ) {
    super(id);
  }

  static place(id: string, customer: string, clock: FixedClock): Order {
    return new Order(
      new OrderId(id),
      new CustomerName(customer),
      [],
      new OrderStatus(Status.PLACED),
      CreatedAt.now(clock),
    );
  }

  static fromPrimitives(primitives: PrimitiveTypes<Order>): Order {
    return new Order(
      new OrderId(primitives.id),
      new CustomerName(primitives.customer),
      primitives.lines.map((sku) => new Sku(sku)),
      new OrderStatus(primitives.status as Status),
      new CreatedAt(primitives.createdAt),
    );
  }

  get lines(): Sku[] {
    return [...this._lines];
  }

  get status(): OrderStatus {
    return this._status;
  }

  addLine(sku: string): void {
    if (this._status.value === Status.SHIPPED) {
      throw new OrderShippedException(this.id.value);
    }
    this._lines = [...this._lines, new Sku(sku)];
  }

  ship(): void {
    this._status = new OrderStatus(Status.SHIPPED);
  }

  toPrimitives(): PrimitiveTypes<Order> {
    return {
      id: this.id.value,
      customer: this.customer.value,
      lines: this._lines.map((line) => line.value),
      status: this._status.value,
      createdAt: this.createdAt.value,
    };
  }
}

const orderMapper: AggregateMapper<Order, PrimitiveTypes<Order>> = {
  toPrimitives: (order) => order.toPrimitives(),
  fromPrimitives: (primitives) => Order.fromPrimitives(primitives),
};

const orderId = '9b2f6c1e-4d3a-4f8b-a1c2-3e4d5f6a7b8c';
const otherOrderId = '3c4d5e6f-7a8b-4c9d-8e0f-1a2b3c4d5e6f';
const clock = new FixedClock('2026-03-01T09:30:00Z');

function orders() {
  return new InMemoryRepository(orderMapper);
}

async function storedOrder(repository = orders()) {
  const order = Order.place(orderId, 'Ana', clock);
  order.addLine('TORCH-01');
  await repository.save(order);
  return repository;
}

describe('InMemoryRepository: the repository of a use case test or a prototype', () => {
  it('can be injected wherever a use case asks for a finder, a saver or a remover of orders', () => {
    expectTypeOf(orders()).toMatchTypeOf<AggregateFinder<Order>>();
    expectTypeOf(orders()).toMatchTypeOf<AggregateSaver<Order>>();
    expectTypeOf(orders()).toMatchTypeOf<AggregateRemover<Order>>();
  });

  describe('saving a new order', () => {
    it('stores every primitive the mapper writes and loads the order back', async () => {
      const repository = await storedOrder();
      const loaded = await repository.findById(new OrderId(orderId));
      expect(loaded).toBeInstanceOf(Order);
      expect(loaded?.toPrimitives()).toEqual({
        id: orderId,
        customer: 'Ana',
        lines: ['TORCH-01'],
        status: 'placed',
        createdAt: new Date('2026-03-01T09:30:00Z'),
      });
    });
  });

  describe('saving an existing order', () => {
    it('a shipped order is stored with its new state', async () => {
      const repository = await storedOrder();
      const loaded = (await repository.findById(new OrderId(orderId))) as Order;
      loaded.ship();
      await repository.save(loaded);
      const reloaded = (await repository.findById(new OrderId(orderId))) as Order;
      expect(reloaded.status.value).toBe('shipped');
      expect(reloaded.lines.map((line) => line.value)).toEqual(['TORCH-01']);
    });

    it('when two users edit the same order, the last save wins: there is no version check', async () => {
      const repository = await storedOrder();
      const byAna = (await repository.findById(new OrderId(orderId))) as Order;
      const byLuis = (await repository.findById(new OrderId(orderId))) as Order;
      byAna.ship();
      await repository.save(byAna);
      byLuis.addLine('HELMET-02');
      await repository.save(byLuis);
      const stored = (await repository.findById(new OrderId(orderId))) as Order;
      expect(stored.status.value).toBe('placed');
      expect(stored.lines.map((line) => line.value)).toEqual(['TORCH-01', 'HELMET-02']);
    });

    it('a new order with an id already stored replaces the previous one', async () => {
      const repository = await storedOrder();
      await repository.save(Order.place(orderId, 'Luis', clock));
      const stored = (await repository.findById(new OrderId(orderId))) as Order;
      expect(stored.customer.value).toBe('Luis');
      expect(await repository.findAll()).toHaveLength(1);
    });
  });

  describe('isolation between the store and the aggregates', () => {
    it('changing a loaded order without saving it does not change the store', async () => {
      const repository = await storedOrder();
      const loaded = (await repository.findById(new OrderId(orderId))) as Order;
      loaded.addLine('HELMET-02');
      const reloaded = (await repository.findById(new OrderId(orderId))) as Order;
      expect(reloaded.lines.map((line) => line.value)).toEqual(['TORCH-01']);
    });

    it('changing the primitives the mapper produced after the save does not change the store', async () => {
      let written: PrimitiveTypes<Order> | undefined;
      const repository = new InMemoryRepository<Order, PrimitiveTypes<Order>>({
        toPrimitives: (order) => {
          written = order.toPrimitives();
          return written;
        },
        fromPrimitives: (primitives) => Order.fromPrimitives(primitives),
      });
      await repository.save(Order.place(orderId, 'Ana', clock));
      (written as PrimitiveTypes<Order>).customer = 'Mallory';
      (written as PrimitiveTypes<Order>).lines.push('STOLEN-99');
      const loaded = (await repository.findById(new OrderId(orderId))) as Order;
      expect(loaded.customer.value).toBe('Ana');
      expect(loaded.lines).toEqual([]);
    });

    it('every load returns a new aggregate', async () => {
      const repository = await storedOrder();
      const first = await repository.findById(new OrderId(orderId));
      const second = await repository.findById(new OrderId(orderId));
      expect(first).not.toBe(second);
      expect(first?.equals(second)).toBe(true);
    });
  });

  describe('finding orders', () => {
    it('returns null for an order that was never saved', async () => {
      const repository = await storedOrder();
      expect(await repository.findById(new OrderId(otherOrderId))).toBeNull();
    });

    it('finds the order when support staff type its id in capitals', async () => {
      const repository = await storedOrder();
      const loaded = await repository.findById(new OrderId(orderId.toUpperCase()));
      expect(loaded?.id.value).toBe(orderId);
    });

    it('lists every stored order', async () => {
      const repository = await storedOrder();
      await repository.save(Order.place(otherOrderId, 'Luis', clock));
      const all = await repository.findAll();
      expect(all.map((order) => order.customer.value).sort()).toEqual(['Ana', 'Luis']);
      expect(all.every((order) => order instanceof Order)).toBe(true);
    });

    it('lists nothing in an empty store', async () => {
      expect(await orders().findAll()).toEqual([]);
    });
  });

  describe('deleting an order', () => {
    it('removes it from the store', async () => {
      const repository = await storedOrder();
      await repository.delete(new OrderId(orderId));
      expect(await repository.findById(new OrderId(orderId))).toBeNull();
      expect(await repository.findAll()).toEqual([]);
    });

    it('lets a new order reuse the id', async () => {
      const repository = await storedOrder();
      await repository.delete(new OrderId(orderId));
      await repository.save(Order.place(orderId, 'Luis', clock));
      expect((await repository.findById(new OrderId(orderId)))?.customer.value).toBe('Luis');
    });

    it('does nothing for an order that is not there', async () => {
      const repository = await storedOrder();
      await expect(repository.delete(new OrderId(otherOrderId))).resolves.toBeUndefined();
      expect(await repository.findAll()).toHaveLength(1);
    });
  });
});
