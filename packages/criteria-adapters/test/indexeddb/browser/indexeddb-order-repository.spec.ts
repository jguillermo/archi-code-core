import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ConcurrencyException } from '@archi-code/ddd/application';
import { CreatedAt, Criteria, UpdatedAt } from '@archi-code/ddd/domain';
import { emptyIndexedDb } from './empty-indexed-db';
import { IndexedDbOrderRepository } from './indexeddb-order-repository';
import {
  CustomerId,
  Order,
  OrderAlreadyShipped,
  OrderId,
  OrderStatus,
  OrderStatusType,
  Sku,
} from './order';
import { OrderRepository } from './order-repository';
import { ShopDb } from './shop.db';

const ANA = new CustomerId('cus-ana');
const LUIS = new CustomerId('cus-luis');

const ORDER_IDS = {
  torch: '1a2b3c4d-0000-4000-8000-000000000001',
  helmet: '1a2b3c4d-0000-4000-8000-000000000002',
  gloves: '1a2b3c4d-0000-4000-8000-000000000003',
  apron: '1a2b3c4d-0000-4000-8000-000000000004',
  boots: '1a2b3c4d-0000-4000-8000-000000000005',
} as const;

function day(isoDate: string): Date {
  return new Date(`${isoDate}T09:00:00.000Z`);
}

function storedOrder(
  id: string,
  customer: CustomerId,
  sku: string,
  status: OrderStatus,
  placedOn: string,
): Order {
  return new Order(
    new OrderId(id),
    customer,
    [new Sku(sku)],
    new OrderStatusType(status),
    new CreatedAt(day(placedOn)),
    new UpdatedAt(day(placedOn)),
  );
}

function skus(orders: readonly Order[]): string[] {
  return orders.map((order) => order.lines[0].value);
}

describe('IndexedDbOrderRepository: searching orders with a criteria on the IndexedDB of a real browser', () => {
  let database: ShopDb;
  let orders: OrderRepository;

  beforeEach(async () => {
    await emptyIndexedDb();
    database = new ShopDb();
    orders = new IndexedDbOrderRepository(database);
    for (const order of [
      storedOrder(ORDER_IDS.torch, ANA, 'TORCH-01', OrderStatus.PLACED, '2026-01-10'),
      storedOrder(ORDER_IDS.helmet, LUIS, 'HELMET-02', OrderStatus.SHIPPED, '2026-02-03'),
      storedOrder(ORDER_IDS.gloves, ANA, 'GLOVES-03', OrderStatus.SHIPPED, '2026-03-21'),
      storedOrder(ORDER_IDS.apron, LUIS, 'APRON-04', OrderStatus.PLACED, '2026-04-15'),
      storedOrder(ORDER_IDS.boots, ANA, 'BOOTS-05', OrderStatus.PLACED, '2026-05-30'),
    ]) {
      await orders.save(order);
    }
  });

  afterEach(() => database.close());

  it('is the repository of orders the domain declares, with its search', () => {
    expect(orders).toBeInstanceOf(OrderRepository);
  });

  it('returns orders rebuilt from the stored rows, with every value they were saved with', async () => {
    const { items } = await orders.search(
      Criteria.create<Order>({ orderBy: { createdAt: 'asc' } }),
    );

    expect(items).toHaveLength(5);
    expect(items.every((order) => order instanceof Order)).toBe(true);
    expect(items[0].toPrimitives()).toEqual({
      id: ORDER_IDS.torch,
      customerId: 'cus-ana',
      lines: ['TORCH-01'],
      status: OrderStatus.PLACED,
      createdAt: day('2026-01-10'),
      updatedAt: day('2026-01-10'),
    });
  });

  it('finds the orders of one customer, newest first', async () => {
    const { items } = await orders.search(
      Criteria.create<Order>({ where: { customerId: ANA }, orderBy: { createdAt: 'desc' } }),
    );

    expect(skus(items)).toStrictEqual(['BOOTS-05', 'GLOVES-03', 'TORCH-01']);
  });

  it('finds the orders still to ship, on a field without an index', async () => {
    const { items } = await orders.search(
      Criteria.create<Order>({
        where: { status: new OrderStatusType(OrderStatus.PLACED) },
        orderBy: { createdAt: 'asc' },
      }),
    );

    expect(skus(items)).toStrictEqual(['TORCH-01', 'APRON-04', 'BOOTS-05']);
  });

  it('finds the orders placed in a period through the date index', async () => {
    const { items } = await orders.search(
      Criteria.create<Order>({
        where: {
          createdAt: {
            gte: new CreatedAt(day('2026-02-01')),
            lt: new CreatedAt(day('2026-04-01')),
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
    );

    expect(skus(items)).toStrictEqual(['HELMET-02', 'GLOVES-03']);
  });

  it('combines conditions: the shipped orders of a customer', async () => {
    const { items } = await orders.search(
      Criteria.create<Order>({
        where: { customerId: ANA, status: new OrderStatusType(OrderStatus.SHIPPED) },
      }),
    );

    expect(skus(items)).toStrictEqual(['GLOVES-03']);
  });

  it('pages the results and counts every match when withTotal is asked', async () => {
    const criteria = Criteria.create<Order>({ orderBy: { createdAt: 'asc' }, limit: 2, offset: 2 });

    const withTotal = await orders.search(criteria, { withTotal: true });
    const withoutTotal = await orders.search(criteria);

    expect(skus(withTotal.items)).toStrictEqual(['GLOVES-03', 'APRON-04']);
    expect(withTotal.total).toBe(5);
    expect(withoutTotal).not.toHaveProperty('total');
  });

  it('finds nothing when no order matches', async () => {
    const result = await orders.search(
      Criteria.create<Order>({ where: { customerId: new CustomerId('cus-nobody') } }),
      { withTotal: true },
    );

    expect(result).toStrictEqual({ items: [], total: 0 });
  });

  it('a criteria read from a URL searches the same orders', async () => {
    const criteria = Criteria.create<Order>({
      where: { customerId: LUIS },
      orderBy: { createdAt: 'desc' },
    });

    const { items } = await orders.search(Criteria.fromUrl<Order>(criteria.toUrl()));

    expect(skus(items)).toStrictEqual(['APRON-04', 'HELMET-02']);
  });

  describe('an order found by a search can be changed', () => {
    it('is saved with the version it was read with', async () => {
      const [pending] = (
        await orders.search(
          Criteria.create<Order>({ where: { customerId: LUIS }, orderBy: { createdAt: 'desc' } }),
        )
      ).items;
      pending.ship();

      await orders.save(pending);

      const reloaded = await orders.findById(new OrderId(ORDER_IDS.apron));
      expect(reloaded?.status.value).toBe(OrderStatus.SHIPPED);
      expect(() => reloaded?.ship()).toThrow(OrderAlreadyShipped);
    });

    it('is refused when someone changed it after the search', async () => {
      const criteria = Criteria.create<Order>({ where: { customerId: ANA }, limit: 1 });
      const [byAna] = (await orders.search(criteria)).items;
      const [byLuis] = (await orders.search(criteria)).items;
      byAna.addLine(new Sku('MASK-06'));
      await orders.save(byAna);
      byLuis.addLine(new Sku('VISOR-07'));

      await expect(orders.save(byLuis)).rejects.toThrow(ConcurrencyException);
      const stored = await orders.findById(byAna.id);
      expect(stored?.lines.map((line) => line.value)).toContain('MASK-06');
      expect(stored?.lines.map((line) => line.value)).not.toContain('VISOR-07');
    });
  });
});
