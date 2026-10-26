import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import type { AggregateFinder, AggregateRemover, AggregateSaver } from '../../src/domain/index';
import {
  AggregateRepository,
  AggregateRoot,
  CreatedAt,
  EnumType,
  IdType,
  Required,
  StringType,
} from '../../src/domain/index';
import { FixedClock } from '../../src/infrastructure/index';
import { ConcurrencyException } from '../../src/application/exceptions/concurrency.exception';
import { DomainException } from '../../src/domain/exceptions/domain.exception';
import type { PrimitiveTypes } from '../../src/domain/index';

class OrderId extends IdType<'OrderId'> {}
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
      new OrderStatus(primitives.status),
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

interface StoredOrder {
  readonly version: number;
  readonly primitives: PrimitiveTypes<Order>;
}

abstract class OrderRepository
  extends AggregateRepository<Order>
  implements AggregateFinder<Order>, AggregateSaver<Order>, AggregateRemover<Order>
{
  abstract findById(id: OrderId): Promise<Order | null>;
  abstract save(order: Order): Promise<void>;
  abstract remove(order: Order): Promise<void>;
}

class InMemoryOrderRepository extends OrderRepository {
  private readonly rows = new Map<string, StoredOrder>();
  private readonly versions = new WeakMap<Order, number>();

  async findById(id: OrderId): Promise<Order | null> {
    const row = this.rows.get(id.value);
    return row === undefined ? null : this.load(row);
  }

  async findAll(): Promise<Order[]> {
    return Array.from(this.rows.values(), (row) => this.load(row));
  }

  async save(order: Order): Promise<void> {
    const key = order.id.value;
    const version = this.checkedVersion(order);
    const primitives = structuredClone(order.toPrimitives());
    this.rows.set(key, { version: version + 1, primitives });
    this.versions.set(order, version + 1);
  }

  async remove(order: Order): Promise<void> {
    this.checkedVersion(order);
    this.rows.delete(order.id.value);
  }

  private checkedVersion(order: Order): number {
    const key = order.id.value;
    const version = this.versions.get(order) ?? 0;
    if ((this.rows.get(key)?.version ?? 0) !== version) {
      throw new ConcurrencyException('Order', key, version);
    }
    return version;
  }

  private load(row: StoredOrder): Order {
    const order = Order.fromPrimitives(structuredClone(row.primitives));
    this.versions.set(order, row.version);
    return order;
  }
}

const orderId = '9b2f6c1e-4d3a-4f8b-a1c2-3e4d5f6a7b8c';
const otherOrderId = '3c4d5e6f-7a8b-4c9d-8e0f-1a2b3c4d5e6f';
const clock = new FixedClock('2026-03-01T09:30:00Z');

function orders() {
  return new InMemoryOrderRepository();
}

async function storedOrder(repository = orders()) {
  const order = Order.place(orderId, 'Ana', clock);
  order.addLine('TORCH-01');
  await repository.save(order);
  return repository;
}

describe('InMemoryOrderRepository: a repository a project writes in its tests, one per aggregate', () => {
  it('needs nothing in its constructor: it knows its aggregate and converts through the aggregate itself', () => {
    expectTypeOf<ConstructorParameters<typeof InMemoryOrderRepository>>().toEqualTypeOf<[]>();
  });

  it('extends the repository of orders the domain declares, so every use case of orders receives it', () => {
    expectTypeOf(orders()).toMatchTypeOf<OrderRepository>();
    expect(orders()).toBeInstanceOf(OrderRepository);
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

    it('when two users edit the same order, the second save is rejected instead of overwriting the first', async () => {
      const repository = await storedOrder();
      const byAna = (await repository.findById(new OrderId(orderId))) as Order;
      const byLuis = (await repository.findById(new OrderId(orderId))) as Order;
      byAna.ship();
      await repository.save(byAna);
      byLuis.addLine('HELMET-02');

      const saveByLuis = repository.save(byLuis);
      await expect(saveByLuis).rejects.toThrow(ConcurrencyException);
      await expect(repository.save(byLuis)).rejects.toThrow(
        `Order with ID ${orderId} was changed by someone else: expected version 1.`,
      );
      const stored = (await repository.findById(new OrderId(orderId))) as Order;
      expect(stored.status.value).toBe('shipped');
      expect(stored.lines.map((line) => line.value)).toEqual(['TORCH-01']);
    });

    it('after a conflict, reloading the order and repeating the change succeeds', async () => {
      const repository = await storedOrder();
      const byAna = (await repository.findById(new OrderId(orderId))) as Order;
      const byLuis = (await repository.findById(new OrderId(orderId))) as Order;
      byAna.ship();
      await repository.save(byAna);
      byLuis.addLine('HELMET-02');
      await expect(repository.save(byLuis)).rejects.toThrow(ConcurrencyException);

      const reloaded = (await repository.findById(new OrderId(orderId))) as Order;
      expect(() => reloaded.addLine('HELMET-02')).toThrow(OrderShippedException);
      reloaded.ship();
      await expect(repository.save(reloaded)).resolves.toBeUndefined();
    });

    it('the same order can be saved twice in a row: the repository follows its version', async () => {
      const repository = orders();
      const order = Order.place(orderId, 'Ana', clock);
      await repository.save(order);
      order.addLine('TORCH-01');
      await repository.save(order);
      const loaded = (await repository.findById(new OrderId(orderId))) as Order;
      expect(loaded.lines.map((line) => line.value)).toEqual(['TORCH-01']);
      await expect(repository.save(loaded)).resolves.toBeUndefined();
    });

    it('a new order with an id already stored is rejected, it does not replace the stored one', async () => {
      const repository = await storedOrder();
      await expect(repository.save(Order.place(orderId, 'Luis', clock))).rejects.toThrow(
        `Order with ID ${orderId} was changed by someone else: expected version 0.`,
      );
      const stored = (await repository.findById(new OrderId(orderId))) as Order;
      expect(stored.customer.value).toBe('Ana');
      expect(await repository.findAll()).toHaveLength(1);
    });

    it('a rejected save leaves the aggregate as new, so it is rejected again', async () => {
      const repository = await storedOrder();
      const duplicate = Order.place(orderId, 'Luis', clock);
      await expect(repository.save(duplicate)).rejects.toThrow(ConcurrencyException);
      await expect(repository.save(duplicate)).rejects.toThrow('expected version 0.');
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
      const toPrimitives = Order.prototype.toPrimitives;
      const spy = vi.spyOn(Order.prototype, 'toPrimitives').mockImplementation(function (
        this: Order,
      ) {
        const primitives = toPrimitives.call(this);
        written = primitives;
        return primitives;
      });
      const repository = orders();
      await repository.save(Order.place(orderId, 'Ana', clock));
      spy.mockRestore();
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

    it('lists every order with the version it was stored with, so each one can be saved', async () => {
      const repository = await storedOrder();
      const second = Order.place(otherOrderId, 'Luis', clock);
      await repository.save(second);
      await repository.save(second);
      for (const order of await repository.findAll()) {
        await expect(repository.save(order)).resolves.toBeUndefined();
      }
    });

    it('lists nothing in an empty store', async () => {
      expect(await orders().findAll()).toEqual([]);
    });
  });

  describe('removing an order', () => {
    async function loaded(repository: InMemoryOrderRepository, id = orderId): Promise<Order> {
      return (await repository.findById(new OrderId(id))) as Order;
    }

    it('removes the loaded order from the store', async () => {
      const repository = await storedOrder();
      await repository.remove(await loaded(repository));
      expect(await repository.findById(new OrderId(orderId))).toBeNull();
      expect(await repository.findAll()).toEqual([]);
    });

    it('lets a new order reuse the id', async () => {
      const repository = await storedOrder();
      await repository.remove(await loaded(repository));
      await repository.save(Order.place(orderId, 'Luis', clock));
      expect((await repository.findById(new OrderId(orderId)))?.customer.value).toBe('Luis');
    });

    it('does nothing for a new order that was never saved', async () => {
      const repository = await storedOrder();
      await expect(
        repository.remove(Order.place(otherOrderId, 'Luis', clock)),
      ).resolves.toBeUndefined();
      expect(await repository.findAll()).toHaveLength(1);
    });

    it('refuses to remove an order someone changed after it was loaded, and keeps it', async () => {
      const repository = await storedOrder();
      const byAna = await loaded(repository);
      const byLuis = await loaded(repository);
      byAna.ship();
      await repository.save(byAna);

      await expect(repository.remove(byLuis)).rejects.toThrow(
        `Order with ID ${orderId} was changed by someone else: expected version 1.`,
      );
      expect((await loaded(repository)).status.value).toBe('shipped');
    });

    it('refuses to remove an order another user already removed', async () => {
      const repository = await storedOrder();
      const byAna = await loaded(repository);
      const byLuis = await loaded(repository);
      await repository.remove(byAna);
      await expect(repository.remove(byLuis)).rejects.toThrow(ConcurrencyException);
    });
  });
});
