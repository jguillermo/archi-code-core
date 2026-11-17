import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ConcurrencyException } from '../../../../src/application/exceptions/concurrency.exception';
import { IndexedDbSchema } from '../../../../src/infrastructure/indexeddb/indexed-db-schema';
import type { IndexedDbTable } from '../../../../src/infrastructure/indexeddb/indexed-db-table';
import {
  closeShops,
  CustomerSchema,
  openShop,
  order,
  OrderSchema,
  shopClock,
} from '../../../support/indexed-db-shop';
import type { CustomerRow, OrderRow, OrderStored } from '../../../support/indexed-db-shop';

describe('IndexedDbWriter: writing the rows of a table', () => {
  let orders: IndexedDbTable<OrderRow, OrderStored>;
  let customers: IndexedDbTable<CustomerRow>;

  beforeEach(async () => {
    const shop = await openShop();
    orders = shop.table(new OrderSchema());
    customers = shop.table(new CustomerSchema());
    shopClock.now = '2026-11-17T10:00:00.000Z';
  });

  afterEach(closeShops);

  describe('persisting a row that is not stored yet', () => {
    it('creates it at rowVersion 1 with its defaults and audit values', async () => {
      await orders.persist(order(1));

      expect(await orders.get('ord-1')).toStrictEqual({
        id: 'ord-1',
        customerId: 'cus-a',
        total: 10,
        status: 'pending',
        tags: [],
        createdAt: '2026-11-17T10:00:00.000Z',
        updatedAt: '2026-11-17T10:00:00.000Z',
        rowVersion: 1,
      });
    });

    it('creates it at rowVersion 1 whatever rowVersion the row brings', async () => {
      await orders.persist({ ...order(1), rowVersion: 7 });

      expect((await orders.get('ord-1'))?.rowVersion).toBe(1);
    });
  });

  describe('persisting a row that is already stored', () => {
    beforeEach(async () => {
      await orders.persist(order(1));
      shopClock.now = '2026-11-18T08:30:00.000Z';
    });

    it('updates it and raises its rowVersion when the row brings the stored rowVersion', async () => {
      await orders.persist({ ...order(1, { total: 99, status: 'paid' }), rowVersion: 1 });

      expect(await orders.get('ord-1')).toMatchObject({
        total: 99,
        status: 'paid',
        createdAt: '2026-11-17T10:00:00.000Z',
        updatedAt: '2026-11-18T08:30:00.000Z',
        rowVersion: 2,
      });
    });

    it('refuses a row that brings another rowVersion and writes nothing', async () => {
      await orders.persist({ ...order(1, { total: 50 }), rowVersion: 1 });

      const stale = orders.persist({ ...order(1, { total: 99 }), rowVersion: 1 });

      await expect(stale).rejects.toBeInstanceOf(ConcurrencyException);
      await expect(stale).rejects.toThrow(
        'orders with ID ord-1 was changed by someone else: expected version 1.',
      );
      expect(await orders.get('ord-1')).toMatchObject({ total: 50, rowVersion: 2 });
    });

    it.each([[undefined], [null], [0], [1.5], ['1'], [Number.NaN]])(
      'refuses a row whose rowVersion is %j: for a new row the id is already taken',
      async (rowVersion) => {
        const taken = orders.persist({
          ...order(1, { total: 99 }),
          rowVersion: rowVersion as never,
        });

        await expect(taken).rejects.toBeInstanceOf(ConcurrencyException);
        await expect(taken).rejects.toThrow(
          'orders with ID ord-1 was changed by someone else: expected version 0.',
        );
        expect(await orders.get('ord-1')).toMatchObject({ total: 10, rowVersion: 1 });
      },
    );
  });

  describe('persisting a batch', () => {
    it('creates and updates every row without checking any rowVersion', async () => {
      await orders.persist(order(1));

      await orders.persistMany([
        { ...order(1, { total: 99 }), rowVersion: 41 },
        order(1, { total: 99 }),
        order(2),
        order(2, { total: 77 }),
      ]);

      expect(await orders.get('ord-1')).toMatchObject({ total: 99, rowVersion: 3 });
      expect(await orders.get('ord-2')).toMatchObject({ total: 77, rowVersion: 2 });
    });

    it('writes nothing when one row of the batch cannot be saved', async () => {
      await expect(
        orders.persistMany([order(1), { ...order(2), id: '' }, order(3)]),
      ).rejects.toMatchObject({ reason: 'invalid_key' });

      expect(await orders.count()).toBe(0);
    });

    it('accepts an empty batch', async () => {
      await orders.persistMany([]);

      expect(await orders.count()).toBe(0);
    });
  });

  describe('a row that cannot be saved', () => {
    it.each([[null], [{}], [{ id: 7 }], [{ id: '' }]])('refuses the row %j', async (row) => {
      await expect(orders.persist(row as never)).rejects.toMatchObject({
        reason: 'invalid_key',
        message: 'IndexedDB invalid_key: a row of table "orders" needs a non-empty text id',
      });
    });

    it('refuses a second row with a value a unique index already holds', async () => {
      await customers.persist({ id: 'cus-1', email: 'ana@shop.test' });

      await expect(
        customers.persist({ id: 'cus-2', email: 'ana@shop.test' }),
      ).rejects.toMatchObject({ reason: 'duplicate_key' });
      expect(await customers.exists('cus-2')).toBe(false);
    });

    it('lets the error of a default or audit function through and writes nothing', async () => {
      const broken = new Error('the clock is broken');
      const invoices = (await openShop()).table(
        new IndexedDbSchema<{ id: string; issuedAt?: string }>({
          name: 'invoices',
          defaults: {
            issuedAt: () => {
              throw broken;
            },
          },
        }),
      );

      await expect(invoices.persist({ id: 'inv-1' })).rejects.toBe(broken);
      expect(await invoices.count()).toBe(0);
    });
  });

  describe('removing', () => {
    beforeEach(() => orders.persistMany([order(1), order(2), order(3)]));

    it('removes one row by id, and nothing when the id is not stored', async () => {
      await orders.remove('ord-2');
      await orders.remove('ord-9');

      expect(await orders.getMany(['ord-1', 'ord-2', 'ord-3'])).toHaveLength(2);
    });

    it('removes several rows at once', async () => {
      await orders.removeMany(['ord-1', 'ord-3', 'ord-9']);

      expect((await orders.find()).items.map((row) => row.id)).toStrictEqual(['ord-2']);
    });

    it('removes none when one id of the batch is not a key', async () => {
      await expect(orders.removeMany(['ord-1', undefined as never])).rejects.toMatchObject({
        reason: 'invalid_key',
      });

      expect(await orders.count()).toBe(3);
    });

    it('removes a row when the rowVersion sent is the stored one', async () => {
      await orders.remove('ord-2', 1);

      expect(await orders.exists('ord-2')).toBe(false);
    });

    it('refuses to remove a row someone changed after it was read', async () => {
      await orders.persist({ ...order(2, { total: 99 }), rowVersion: 1 });

      await expect(orders.remove('ord-2', 1)).rejects.toBeInstanceOf(ConcurrencyException);
      expect(await orders.get('ord-2')).toMatchObject({ total: 99, rowVersion: 2 });
    });

    it.each([[undefined], [null], [0], [2.5]])(
      'removes without checking when the rowVersion sent is %j',
      async (rowVersion) => {
        await orders.remove('ord-2', rowVersion as never);

        expect(await orders.exists('ord-2')).toBe(false);
      },
    );

    it('removes nothing, whatever the rowVersion, when the id is not stored', async () => {
      await orders.remove('ord-9', 4);

      expect(await orders.count()).toBe(3);
    });

    it('empties the table', async () => {
      await orders.clear();

      expect(await orders.count()).toBe(0);
    });
  });
});
