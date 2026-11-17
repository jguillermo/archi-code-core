import { afterEach, beforeEach, describe, expect, expectTypeOf, it } from 'vitest';
import type { IndexedDbStored } from '../../../src/infrastructure/indexeddb/indexed-db-schema';
import type { IndexedDbTable } from '../../../src/infrastructure/indexeddb/indexed-db-table';
import type { IndexedDbPage } from '../../../src/infrastructure/indexeddb/query/indexed-db-query';
import { closeShops, openShop, OrderSchema, SIX_ORDERS } from '../../support/indexed-db-shop';
import type { OrderRow, OrderStored } from '../../support/indexed-db-shop';

async function batchesOf(
  batches: AsyncGenerator<IndexedDbStored<OrderStored>[]>,
): Promise<string[][]> {
  const read: string[][] = [];
  for await (const batch of batches) {
    read.push(batch.map((row) => row.id));
  }
  return read;
}

describe('IndexedDbTable: the table a repository works with', () => {
  let orders: IndexedDbTable<OrderRow, OrderStored>;

  beforeEach(async () => {
    orders = (await openShop()).table(new OrderSchema());
  });

  afterEach(closeShops);

  it('has the name of its schema', () => {
    expect(orders.name).toBe('orders');
  });

  it('lists the id and the single-field indexes a criteria can be planned on', () => {
    expect(orders.indexes).toStrictEqual([
      { name: null, keyPath: 'id' },
      { name: 'byCustomer', keyPath: 'customerId' },
    ]);
  });

  it('reads nothing from a table nobody wrote to', async () => {
    expect(await orders.find()).toStrictEqual({ items: [], total: 0, next: null });
    expect(await batchesOf(orders.iterate())).toStrictEqual([]);
  });

  describe('iterating a table by batches', () => {
    beforeEach(() => orders.persistMany(SIX_ORDERS));

    it('reads every row once, in batches of the size asked', async () => {
      expect(await batchesOf(orders.iterate({}, { batchSize: 4 }))).toStrictEqual([
        ['ord-1', 'ord-2', 'ord-3', 'ord-4'],
        ['ord-5', 'ord-6'],
      ]);
    });

    it('reads everything in one batch when the table is smaller than the batch', async () => {
      expect(await batchesOf(orders.iterate())).toHaveLength(1);
    });

    it('follows an index backwards, skipping the offset only once', async () => {
      const batches = orders.iterate(
        { index: 'byCustomer', direction: 'prev', offset: 1 },
        { batchSize: 2 },
      );

      expect(await batchesOf(batches)).toStrictEqual([
        ['ord-5', 'ord-2'],
        ['ord-6', 'ord-3'],
        ['ord-1'],
      ]);
    });

    it('reads only the rows a filter accepts', async () => {
      const batches = orders.iterate({ filter: (row) => row.total >= 30 }, { batchSize: 3 });

      expect(await batchesOf(batches)).toStrictEqual([['ord-3', 'ord-4', 'ord-5'], ['ord-6']]);
    });

    it('continues from the token of a page', async () => {
      const { next } = await orders.find({ limit: 4 });

      expect(await batchesOf(orders.iterate({ after: next }))).toStrictEqual([['ord-5', 'ord-6']]);
    });

    it('sees the rows another batch changed in the meantime and holds no transaction between batches', async () => {
      const seen: string[] = [];

      for await (const batch of orders.iterate({}, { batchSize: 2 })) {
        seen.push(...batch.map((row) => row.id));
        await orders.remove('ord-6');
      }

      expect(seen).toStrictEqual(['ord-1', 'ord-2', 'ord-3', 'ord-4', 'ord-5']);
    });

    it('can be abandoned half way', async () => {
      for await (const batch of orders.iterate({}, { batchSize: 1 })) {
        expect(batch).toHaveLength(1);
        break;
      }

      expect(await orders.count()).toBe(6);
    });

    it.each([[0], [-1], [2.5]])('refuses batches of %j rows', async (batchSize) => {
      await expect(batchesOf(orders.iterate({}, { batchSize }))).rejects.toMatchObject({
        reason: 'invalid_query',
      });
    });

    it('refuses an order computed in memory', async () => {
      const sorted = { compare: () => 0 } as never;

      await expect(batchesOf(orders.iterate(sorted))).rejects.toMatchObject({
        reason: 'invalid_query',
      });
    });
  });

  it('rejects instead of throwing when a query cannot work', async () => {
    await expect(orders.find({ offset: -1 })).rejects.toMatchObject({ reason: 'invalid_query' });
    await expect(orders.count({ limit: -1 })).rejects.toMatchObject({ reason: 'invalid_query' });
  });

  it('types the rows that go in and the rows that come out', () => {
    expectTypeOf(orders.persist).parameter(0).toMatchTypeOf<OrderRow>();
    expectTypeOf(orders.persist).returns.toEqualTypeOf<Promise<void>>();
    expectTypeOf(orders.get).returns.toEqualTypeOf<Promise<IndexedDbStored<OrderStored> | null>>();
    expectTypeOf(orders.find).returns.toEqualTypeOf<
      Promise<IndexedDbPage<IndexedDbStored<OrderStored>>>
    >();
  });
});
