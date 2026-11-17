import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { IndexedDbTable } from '../../../../src/infrastructure/indexeddb/indexed-db-table';
import { closeShops, openShop, OrderSchema, SIX_ORDERS } from '../../../support/indexed-db-shop';
import type { OrderRow, OrderStored } from '../../../support/indexed-db-shop';

const invalidQuery = { reason: 'invalid_query' };
const ids = (rows: readonly { id: string }[]): string[] => rows.map((row) => row.id);
const expensive = (row: OrderRow): boolean => row.total >= 30;

describe('IndexedDbReader: reading the rows of a table', () => {
  let orders: IndexedDbTable<OrderRow, OrderStored>;

  beforeEach(async () => {
    orders = (await openShop()).table(new OrderSchema());
    await orders.persistMany(SIX_ORDERS);
  });

  afterEach(closeShops);

  describe('by id', () => {
    it('gets the whole stored row, or null when there is none', async () => {
      expect(await orders.get('ord-2')).toStrictEqual({
        id: 'ord-2',
        customerId: 'cus-b',
        total: 20,
        status: 'pending',
        tags: [],
        createdAt: '2026-11-17T10:00:00.000Z',
        updatedAt: '2026-11-17T10:00:00.000Z',
        rowVersion: 1,
      });
      expect(await orders.get('ord-9')).toBeNull();
    });

    it('gets several rows in the order asked, leaving out the missing ones', async () => {
      expect(ids(await orders.getMany(['ord-5', 'ord-9', 'ord-1']))).toStrictEqual([
        'ord-5',
        'ord-1',
      ]);
    });

    it('tells whether a row exists', async () => {
      expect(await orders.exists('ord-6')).toBe(true);
      expect(await orders.exists('ord-9')).toBe(false);
    });

    it('refuses an id IndexedDB cannot use as a key', async () => {
      await expect(orders.get(undefined as never)).rejects.toMatchObject({ reason: 'invalid_key' });
    });
  });

  describe('counting', () => {
    it('counts the table, a range of an index and the rows a filter accepts', async () => {
      expect(await orders.count()).toBe(6);
      expect(await orders.count({ index: 'byCustomer', range: IDBKeyRange.only('cus-a') })).toBe(3);
      expect(await orders.count({ filter: expensive })).toBe(4);
      expect(
        await orders.count({
          index: 'byCustomer',
          range: IDBKeyRange.only('cus-a'),
          filter: expensive,
        }),
      ).toBe(2);
    });

    it('refuses an index the table does not have', async () => {
      await expect(orders.count({ index: 'byColour' })).rejects.toMatchObject({
        ...invalidQuery,
        message: 'IndexedDB invalid_query: table "orders" has no index "byColour"',
      });
    });
  });

  describe('finding in the order of the table', () => {
    it('returns every row with the total and no token when nothing is left', async () => {
      const page = await orders.find();

      expect(ids(page.items)).toStrictEqual(['ord-1', 'ord-2', 'ord-3', 'ord-4', 'ord-5', 'ord-6']);
      expect(page.total).toBe(6);
      expect(page.next).toBeNull();
    });

    it('skips the offset, stops at the limit and continues from the token', async () => {
      const first = await orders.find({ offset: 1, limit: 2 });
      const second = await orders.find({ limit: 3, after: first.next });

      expect(ids(first.items)).toStrictEqual(['ord-2', 'ord-3']);
      expect(ids(second.items)).toStrictEqual(['ord-4', 'ord-5', 'ord-6']);
      expect([first.total, second.total]).toStrictEqual([6, 6]);
      expect(second.next).toBeNull();
    });

    it('continues after the first row of the table', async () => {
      const first = await orders.find({ limit: 1 });

      expect(ids((await orders.find({ limit: 2, after: first.next })).items)).toStrictEqual([
        'ord-2',
        'ord-3',
      ]);
    });

    it('continues with what is left when the rows before the token were removed', async () => {
      const first = await orders.find({ limit: 2 });
      await orders.removeMany(['ord-1', 'ord-2']);

      expect(ids((await orders.find({ limit: 2, after: first.next })).items)).toStrictEqual([
        'ord-3',
        'ord-4',
      ]);
    });

    it('returns no row but the total when the limit is zero', async () => {
      expect(await orders.find({ limit: 0 })).toStrictEqual({ items: [], total: 6, next: null });
    });
  });

  describe('finding through an index', () => {
    it('reads in the order of the index, page after page', async () => {
      const first = await orders.find({ index: 'byCustomer', limit: 2 });
      const second = await orders.find({ index: 'byCustomer', limit: 2, after: first.next });
      const third = await orders.find({ index: 'byCustomer', limit: 2, after: second.next });

      expect(ids(first.items)).toStrictEqual(['ord-1', 'ord-3']);
      expect(ids(second.items)).toStrictEqual(['ord-6', 'ord-2']);
      expect(ids(third.items)).toStrictEqual(['ord-5', 'ord-4']);
      expect(third.next).toBeNull();
    });

    it('reads backwards', async () => {
      const first = await orders.find({ index: 'byCustomer', direction: 'prev', limit: 4 });
      const second = await orders.find({
        index: 'byCustomer',
        direction: 'prev',
        after: first.next,
      });

      expect(ids(first.items)).toStrictEqual(['ord-4', 'ord-5', 'ord-2', 'ord-6']);
      expect(ids(second.items)).toStrictEqual(['ord-3', 'ord-1']);
    });

    it('reads only the range and counts only it', async () => {
      const page = await orders.find({ index: 'byCustomer', range: IDBKeyRange.only('cus-b') });

      expect(ids(page.items)).toStrictEqual(['ord-2', 'ord-5']);
      expect(page.total).toBe(2);
    });

    it('pages an index of several fields', async () => {
      const first = await orders.find({ index: 'byCustomerAndTotal', limit: 4 });
      const second = await orders.find({ index: 'byCustomerAndTotal', after: first.next });

      expect(ids(second.items)).toStrictEqual(['ord-5', 'ord-4']);
    });

    it('refuses an index the table does not have and a token of another query', async () => {
      const { next } = await orders.find({ index: 'byCustomer', limit: 1 });

      await expect(orders.find({ index: 'byColour' })).rejects.toMatchObject(invalidQuery);
      await expect(orders.find({ after: next })).rejects.toMatchObject(invalidQuery);
    });
  });

  describe('finding with a filter', () => {
    it('counts every row the filter accepts and pages only them', async () => {
      const first = await orders.find({ filter: expensive, limit: 2 });
      const second = await orders.find({ filter: expensive, limit: 2, after: first.next });

      expect(ids(first.items)).toStrictEqual(['ord-3', 'ord-4']);
      expect(ids(second.items)).toStrictEqual(['ord-5', 'ord-6']);
      expect([first.total, second.total]).toStrictEqual([4, 4]);
      expect(second.next).toBeNull();
    });

    it('applies the offset to the rows the filter accepts', async () => {
      const page = await orders.find({ filter: expensive, offset: 1, limit: 1 });

      expect(ids(page.items)).toStrictEqual(['ord-4']);
      expect(page.next).not.toBeNull();
    });

    it('rejects with the error of a filter that throws', async () => {
      const broken = new Error('total is not a number');

      await expect(
        orders.find({
          filter: () => {
            throw broken;
          },
        }),
      ).rejects.toMatchObject({ reason: 'request_failed', cause: broken });
    });
  });

  describe('finding in an order computed in memory', () => {
    const byTotalDescending = (left: OrderRow, right: OrderRow): number => right.total - left.total;

    it('sorts the rows the filter accepts and returns the page asked', async () => {
      const page = await orders.find({
        filter: expensive,
        compare: byTotalDescending,
        offset: 1,
        limit: 2,
      });

      expect(ids(page.items)).toStrictEqual(['ord-5', 'ord-4']);
      expect(page.total).toBe(4);
      expect(page.next).toBeNull();
    });

    it('sorts the whole range when there is no filter nor limit', async () => {
      const page = await orders.find({
        index: 'byCustomer',
        range: IDBKeyRange.only('cus-a'),
        compare: byTotalDescending,
      });

      expect(ids(page.items)).toStrictEqual(['ord-6', 'ord-3', 'ord-1']);
    });
  });
});
