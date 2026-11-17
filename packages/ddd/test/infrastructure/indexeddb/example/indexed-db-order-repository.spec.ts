import { afterEach, beforeEach, describe, expect, expectTypeOf, it } from 'vitest';
import { ConcurrencyException } from '../../../../src/application/index';
import { anotherPage, freshIndexedDb, openDatabase } from '../../../support/indexed-db-environment';
import { IndexedDbOrderRepository } from './indexed-db-order-repository';
import {
  CustomerId,
  Order,
  OrderAlreadyShipped,
  OrderId,
  OrderPlacedDomainEvent,
  OrderStatus,
  Sku,
} from './order';
import { OrderRepository } from './order-repository';
import { SalesDatabase } from './sales-database';

const anaOrderId = '9b2f6c1e-4d3a-4f8b-a1c2-3e4d5f6a7b8c';
const luisOrderId = '3c4d5e6f-7a8b-4c9d-8e0f-1a2b3c4d5e6f';

function readStoredRow(id: string): Promise<unknown> {
  return openDatabase(indexedDB, 'sales').then(
    (database) =>
      new Promise((resolve, reject) => {
        const request = database.transaction('orders').objectStore('orders').get(id);
        request.onsuccess = () => {
          database.close();
          resolve(request.result);
        };
        request.onerror = () => reject(request.error);
      }),
  );
}

function skusOf(order: Order | null): string[] {
  return (order?.lines ?? []).map((line) => line.value);
}

describe('IndexedDbOrderRepository: the orders of a shop stored in the IndexedDB of a real browser', () => {
  const databases: SalesDatabase[] = [];
  let repository: IndexedDbOrderRepository;

  function openSales(factory: IDBFactory = anotherPage()): IndexedDbOrderRepository {
    const database = new SalesDatabase({ factory });
    databases.push(database);
    return new IndexedDbOrderRepository(database);
  }

  async function loaded(id = anaOrderId, from = repository): Promise<Order> {
    return (await from.findById(new OrderId(id))) as Order;
  }

  beforeEach(async () => {
    repository = openSales(await freshIndexedDb());
    const placed = Order.place(new OrderId(anaOrderId), new CustomerId('cus-ana'));
    placed.addLine(new Sku('TORCH-01'));
    await repository.save(placed);
  });

  afterEach(() => {
    for (const database of databases.splice(0)) {
      database.close();
    }
  });

  it('extends the repository of orders the domain declares and only receives its database', () => {
    expect(repository).toBeInstanceOf(OrderRepository);
    expectTypeOf<ConstructorParameters<typeof IndexedDbOrderRepository>>().toEqualTypeOf<
      [SalesDatabase]
    >();
  });

  describe('placing an order', () => {
    it('loads the order back with every value it was placed with', async () => {
      const order = await loaded();

      expect(order).toBeInstanceOf(Order);
      expect(order.toPrimitives()).toStrictEqual({
        id: anaOrderId,
        customerId: 'cus-ana',
        lines: ['TORCH-01'],
        status: OrderStatus.PLACED,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
      expect(Number.isNaN(order.createdAt.value.getTime())).toBe(false);
    });

    it('writes one row of primitives with dates as ISO text and row version 1 in the browser', async () => {
      expect(await readStoredRow(anaOrderId)).toStrictEqual({
        id: anaOrderId,
        customerId: 'cus-ana',
        lines: ['TORCH-01'],
        status: 'placed',
        createdAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T.+Z$/),
        updatedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T.+Z$/),
        rowVersion: 1,
      });
    });

    it('keeps the event it recorded for the use case to publish: the repository does not take it', async () => {
      const order = Order.place(new OrderId(luisOrderId), new CustomerId('cus-luis'));
      await repository.save(order);

      const events = order.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(OrderPlacedDomainEvent);
      expect(events[0]).toMatchObject({ orderId: luisOrderId, customerId: 'cus-luis' });
    });

    it('rejects a new order with an id already stored and keeps the stored one', async () => {
      const duplicate = Order.place(new OrderId(anaOrderId), new CustomerId('cus-luis'));

      await expect(repository.save(duplicate)).rejects.toThrow(
        `Order with ID ${anaOrderId} was changed by someone else: expected version 0.`,
      );
      await expect(repository.save(duplicate)).rejects.toThrow(ConcurrencyException);
      expect((await loaded()).customerId.value).toBe('cus-ana');
    });
  });

  describe('changing an order', () => {
    it('stores a shipped order with its new state and the next row version', async () => {
      const order = await loaded();
      order.ship();
      await repository.save(order);

      const reloaded = await loaded();
      expect(reloaded.status.value).toBe(OrderStatus.SHIPPED);
      expect(skusOf(reloaded)).toStrictEqual(['TORCH-01']);
      expect(await readStoredRow(anaOrderId)).toMatchObject({ rowVersion: 2 });
    });

    it('follows the version of an order saved twice in a row', async () => {
      const order = await loaded();
      order.addLine(new Sku('HELMET-02'));
      await repository.save(order);
      order.addLine(new Sku('GLOVES-03'));
      await repository.save(order);

      expect(skusOf(await loaded())).toStrictEqual(['TORCH-01', 'HELMET-02', 'GLOVES-03']);
      expect(await readStoredRow(anaOrderId)).toMatchObject({ rowVersion: 3 });
    });

    it('rejects the second of two users editing the same order instead of overwriting the first', async () => {
      const byAna = await loaded();
      const byLuis = await loaded();
      byAna.ship();
      await repository.save(byAna);
      byLuis.addLine(new Sku('HELMET-02'));

      const conflict = repository.save(byLuis);

      await expect(conflict).rejects.toThrow(ConcurrencyException);
      await expect(repository.save(byLuis)).rejects.toThrow(
        `Order with ID ${anaOrderId} was changed by someone else: expected version 1.`,
      );
      const stored = await loaded();
      expect(stored.status.value).toBe(OrderStatus.SHIPPED);
      expect(skusOf(stored)).toStrictEqual(['TORCH-01']);
    });

    it('keeps the conflict of the table as the cause of the conflict of the order', async () => {
      const byAna = await loaded();
      const byLuis = await loaded();
      await repository.save(byAna);

      const error = await repository.save(byLuis).catch((caught: unknown) => caught);

      expect((error as ConcurrencyException).cause).toBeInstanceOf(ConcurrencyException);
      expect(((error as ConcurrencyException).cause as Error).message).toBe(
        `orders with ID ${anaOrderId} was changed by someone else: expected version 1.`,
      );
    });

    it('after a conflict, reloading the order shows the business rule that now applies', async () => {
      const byAna = await loaded();
      const byLuis = await loaded();
      byAna.ship();
      await repository.save(byAna);
      byLuis.addLine(new Sku('HELMET-02'));
      await expect(repository.save(byLuis)).rejects.toThrow(ConcurrencyException);

      const reloaded = await loaded();
      expect(() => reloaded.addLine(new Sku('HELMET-02'))).toThrow(OrderAlreadyShipped);
      await expect(repository.save(reloaded)).resolves.toBeUndefined();
    });
  });

  describe('two tabs of the shop open on the same browser', () => {
    it('one tab reads the order the other one placed', async () => {
      const otherTab = openSales();

      expect(skusOf(await loaded(anaOrderId, otherTab))).toStrictEqual(['TORCH-01']);
    });

    it('a tab saving an order the other tab already changed is rejected', async () => {
      const otherTab = openSales();
      const inThisTab = await loaded();
      const inOtherTab = await loaded(anaOrderId, otherTab);
      inOtherTab.ship();
      await otherTab.save(inOtherTab);
      inThisTab.addLine(new Sku('HELMET-02'));

      await expect(repository.save(inThisTab)).rejects.toThrow(ConcurrencyException);
      expect((await loaded()).status.value).toBe(OrderStatus.SHIPPED);
    });

    it('the orders stay in the browser after the database is closed and opened again', async () => {
      for (const database of databases.splice(0)) {
        database.close();
      }

      expect(skusOf(await loaded(anaOrderId, openSales()))).toStrictEqual(['TORCH-01']);
    });
  });

  describe('isolation between the browser and the aggregates', () => {
    it('changing a loaded order without saving it leaves the stored order as it was', async () => {
      const order = await loaded();
      order.addLine(new Sku('HELMET-02'));

      expect(skusOf(await loaded())).toStrictEqual(['TORCH-01']);
    });

    it('every load returns a new aggregate equal to the previous one', async () => {
      const first = await loaded();
      const second = await loaded();

      expect(first).not.toBe(second);
      expect(first.equals(second)).toBe(true);
    });
  });

  describe('finding an order by id', () => {
    it('returns null for an order that was never placed', async () => {
      expect(await repository.findById(new OrderId(luisOrderId))).toBeNull();
    });

    it('finds the order when support staff type its id in capitals', async () => {
      expect((await loaded(anaOrderId.toUpperCase())).id.value).toBe(anaOrderId);
    });
  });

  describe('removing an order', () => {
    it('removes the loaded order from the browser', async () => {
      await repository.remove(await loaded());

      expect(await repository.findById(new OrderId(anaOrderId))).toBeNull();
      expect(await readStoredRow(anaOrderId)).toBeUndefined();
    });

    it('lets a new order reuse the id of a removed one', async () => {
      await repository.remove(await loaded());
      await repository.save(Order.place(new OrderId(anaOrderId), new CustomerId('cus-luis')));

      expect((await loaded()).customerId.value).toBe('cus-luis');
    });

    it('does nothing for a new order that was never saved', async () => {
      await repository.remove(Order.place(new OrderId(luisOrderId), new CustomerId('cus-luis')));

      expect(await loaded()).not.toBeNull();
    });

    it('refuses to remove an order someone changed after it was loaded, and keeps it', async () => {
      const byAna = await loaded();
      const byLuis = await loaded();
      byAna.ship();
      await repository.save(byAna);

      await expect(repository.remove(byLuis)).rejects.toThrow(
        `Order with ID ${anaOrderId} was changed by someone else: expected version 1.`,
      );
      expect((await loaded()).status.value).toBe(OrderStatus.SHIPPED);
    });

    it('removing an order another user already removed does nothing: the table never fails for a missing id', async () => {
      const byAna = await loaded();
      const byLuis = await loaded();
      await repository.remove(byAna);

      await expect(repository.remove(byLuis)).resolves.toBeUndefined();
    });
  });
});
