import { describe, expect, expectTypeOf, it } from 'vitest';
import { InMemoryTransactionRunner } from '../../../src/infrastructure/transaction/in-memory-transaction-runner';
import type { TransactionParticipant } from '../../../src/infrastructure/transaction/transaction-participant';
import { InMemoryRepository } from '../../../src/infrastructure/repository/in-memory-repository';
import { AggregateMapper } from '../../../src/infrastructure/repository/aggregate-mapper';
import {
  AggregateRoot,
  BooleanType,
  EventBase,
  IdType,
  Required,
  StringType,
} from '../../../src/domain/index';
import type { AggregateFinder, AggregateSaver, PrimitiveTypes } from '../../../src/domain/index';
import { UseCase } from '../../../src/application/index';
import type { EventBus, TransactionRunner } from '../../../src/application/index';
import { AggregateNotFoundException, DomainException } from '../../../src/exceptions/index';

class OrderId extends IdType<'OrderId'> {}
class CustomerName extends Required(StringType) {}
class Shipped extends Required(BooleanType) {}

class OrderShipped extends EventBase {
  static readonly eventName = 'OrderShipped';
}

class OrderAlreadyShipped extends DomainException {
  constructor(orderId: string) {
    super(`Order ${orderId} is already shipped`, ['ORD001']);
  }
}

class Order extends AggregateRoot<OrderId, OrderShipped> {
  private constructor(
    id: OrderId,
    readonly customer: CustomerName,
    private _shipped: Shipped,
  ) {
    super(id);
  }

  static place(id: string, customer: string): Order {
    return new Order(new OrderId(id), new CustomerName(customer), new Shipped(false));
  }

  static fromPrimitives(primitives: PrimitiveTypes<Order>): Order {
    return new Order(
      new OrderId(primitives.id),
      new CustomerName(primitives.customer),
      new Shipped(primitives.shipped),
    );
  }

  get shipped(): Shipped {
    return this._shipped;
  }

  ship(): void {
    if (this._shipped.value) {
      throw new OrderAlreadyShipped(this.id.value);
    }
    this._shipped = new Shipped(true);
    this.record(new OrderShipped(this.id.value));
  }

  toPrimitives(): PrimitiveTypes<Order> {
    return { id: this.id.value, customer: this.customer.value, shipped: this.shipped.value };
  }
}

class ShipOrder extends UseCase<{ orderId: string; failAfterSaving?: boolean }, OrderId, void> {
  private failAfterSaving = false;

  constructor(
    private readonly orders: AggregateFinder<Order> & AggregateSaver<Order>,
    private readonly events: EventBus<OrderShipped>,
    private readonly transactions: TransactionRunner,
  ) {
    super();
  }

  protected toCommand(input: { orderId: string; failAfterSaving?: boolean }): OrderId {
    this.failAfterSaving = input.failAfterSaving === true;
    return new OrderId(input.orderId);
  }

  protected handle(orderId: OrderId): Promise<void> {
    return this.transactions.run(async () => {
      const order = await this.orders.findById(orderId);
      if (order === null) {
        throw new AggregateNotFoundException('Order', orderId.value);
      }
      order.ship();
      await this.orders.save(order);
      await this.events.publish(order.pullDomainEvents());
      if (this.failAfterSaving) {
        throw new Error('label printer offline');
      }
    });
  }
}

class TransactionalEventLog implements EventBus<OrderShipped>, TransactionParticipant {
  private entries: string[] = [];

  get stored(): readonly string[] {
    return [...this.entries];
  }

  async publish(events: readonly OrderShipped[]): Promise<void> {
    this.entries.push(...events.map((event) => event.eventName()));
  }

  snapshot(): () => void {
    const saved = [...this.entries];
    return () => {
      this.entries = saved;
    };
  }
}

const orderId = '9b2f6c1e-4d3a-4f8b-a1c2-3e4d5f6a7b8c';

async function shop() {
  const orders = new InMemoryRepository(AggregateMapper.of(Order));
  const outbox = new TransactionalEventLog();
  const transactions = new InMemoryTransactionRunner([orders, outbox]);
  await orders.save(Order.place(orderId, 'Ana'));
  return { orders, outbox, transactions, shipOrder: new ShipOrder(orders, outbox, transactions) };
}

async function storedOrder(orders: InMemoryRepository<Order>): Promise<Order> {
  return (await orders.findById(new OrderId(orderId))) as Order;
}

describe('InMemoryTransactionRunner: the transactions of a use case test', () => {
  it('is a TransactionRunner whose participants are the in-memory adapters', () => {
    expectTypeOf<InMemoryTransactionRunner>().toMatchTypeOf<TransactionRunner>();
    expectTypeOf<InMemoryRepository<Order>>().toMatchTypeOf<TransactionParticipant>();
  });

  describe('a use case that succeeds', () => {
    it('commits the order and its events together', async () => {
      const { orders, outbox, transactions, shipOrder } = await shop();
      await shipOrder.execute({ orderId });
      expect((await storedOrder(orders)).shipped.value).toBe(true);
      expect(outbox.stored).toEqual(['OrderShipped']);
      expect(transactions.committed).toBe(1);
      expect(transactions.rolledBack).toBe(0);
    });

    it('resolves to what the work returns', async () => {
      const transactions = new InMemoryTransactionRunner();
      expect(await transactions.run(async () => 'TRACK-001')).toBe('TRACK-001');
    });
  });

  describe('a use case that fails after saving', () => {
    it('rolls back the order and the events it had stored', async () => {
      const { orders, outbox, transactions, shipOrder } = await shop();
      await expect(shipOrder.execute({ orderId, failAfterSaving: true })).rejects.toThrow(
        'label printer offline',
      );
      const order = await storedOrder(orders);
      expect(order.shipped.value).toBe(false);
      expect(order.version).toBe(1);
      expect(outbox.stored).toEqual([]);
      expect(transactions.committed).toBe(0);
      expect(transactions.rolledBack).toBe(1);
    });

    it('lets the same command succeed once the cause is fixed', async () => {
      const { orders, shipOrder } = await shop();
      await expect(shipOrder.execute({ orderId, failAfterSaving: true })).rejects.toThrow();
      await shipOrder.execute({ orderId });
      expect((await storedOrder(orders)).version).toBe(2);
    });

    it('rolls back a business rule broken after another change of the same transaction', async () => {
      const { orders, outbox, transactions } = await shop();
      const extra = '3c4d5e6f-7a8b-4c9d-8e0f-1a2b3c4d5e6f';
      await expect(
        transactions.run(async () => {
          await orders.save(Order.place(extra, 'Luis'));
          const shipped = await storedOrder(orders);
          shipped.ship();
          await orders.save(shipped);
          shipped.ship();
        }),
      ).rejects.toThrow(OrderAlreadyShipped);
      expect(await orders.findById(new OrderId(extra))).toBeNull();
      expect((await storedOrder(orders)).shipped.value).toBe(false);
      expect(outbox.stored).toEqual([]);
    });
  });

  describe('nested runs', () => {
    it('tells whether the code runs inside a transaction, also inside a nested run', async () => {
      const transactions = new InMemoryTransactionRunner();
      expect(transactions.inTransaction()).toBe(false);
      const inside = await transactions.run(async () => [
        transactions.inTransaction(),
        await transactions.run(async () => transactions.inTransaction()),
      ]);
      expect(inside).toEqual([true, true]);
      expect(transactions.inTransaction()).toBe(false);
    });

    it('a run inside another joins it: one commit, and a failure rolls back both', async () => {
      const { orders, transactions } = await shop();
      await transactions.run(async () => {
        await transactions.run(async () => {
          const order = await storedOrder(orders);
          order.ship();
          await orders.save(order);
        });
      });
      expect(transactions.committed).toBe(1);

      const other = await shop();
      await expect(
        other.transactions.run(async () => {
          await other.transactions.run(async () => {
            const order = await storedOrder(other.orders);
            order.ship();
            await other.orders.save(order);
          });
          throw new Error('payment declined');
        }),
      ).rejects.toThrow('payment declined');
      expect((await storedOrder(other.orders)).shipped.value).toBe(false);
      expect(other.transactions.rolledBack).toBe(1);
    });

    it('runs two concurrent use cases one after the other, so a failure rolls back only its own', async () => {
      const { orders, outbox, transactions, shipOrder } = await shop();
      const extra = '3c4d5e6f-7a8b-4c9d-8e0f-1a2b3c4d5e6f';
      const steps: string[] = [];
      const [placed, shipped] = await Promise.allSettled([
        transactions.run(async () => {
          steps.push('place starts');
          await orders.save(Order.place(extra, 'Luis'));
          await Promise.resolve();
          steps.push('place ends');
        }),
        transactions.run(async () => {
          steps.push('ship starts');
          await shipOrder.execute({ orderId, failAfterSaving: true });
        }),
      ]);
      expect(placed.status).toBe('fulfilled');
      expect(shipped.status).toBe('rejected');
      expect(steps).toEqual(['place starts', 'place ends', 'ship starts']);
      expect((await orders.findById(new OrderId(extra)))?.customer.value).toBe('Luis');
      expect((await storedOrder(orders)).shipped.value).toBe(false);
      expect(outbox.stored).toEqual([]);
      expect([transactions.committed, transactions.rolledBack]).toEqual([1, 1]);
    });

    it('opens a new transaction after the previous one ended, even if it failed', async () => {
      const transactions = new InMemoryTransactionRunner();
      await expect(
        transactions.run(async () => {
          throw new Error('timeout');
        }),
      ).rejects.toThrow('timeout');
      await transactions.run(async () => undefined);
      expect([transactions.committed, transactions.rolledBack]).toEqual([1, 1]);
    });
  });

  it('restores the participants in reverse order of their snapshots', async () => {
    const restored: string[] = [];
    const participant = (name: string): TransactionParticipant => ({
      snapshot: () => () => restored.push(name),
    });
    const transactions = new InMemoryTransactionRunner([
      participant('orders'),
      participant('outbox'),
    ]);
    await expect(
      transactions.run(async () => {
        throw new Error('disk full');
      }),
    ).rejects.toThrow('disk full');
    expect(restored).toEqual(['outbox', 'orders']);
  });
});
