import { afterEach, describe, expect, it, vi } from 'vitest';
import { IndexedDbSchema } from '../../../../src/infrastructure/indexeddb/indexed-db-schema';
import {
  anotherPage,
  freshIndexedDb,
  openDatabase,
  pause,
} from '../../../support/indexed-db-environment';
import {
  anotherShop,
  closeShops,
  countingFactory,
  CustomerSchema,
  openShop,
  order,
  OrderSchema,
} from '../../../support/indexed-db-shop';

describe('IndexedDbConnection: the one connection of a database', () => {
  afterEach(() => {
    closeShops();
    vi.unstubAllGlobals();
  });

  describe('opening', () => {
    it('opens the database once, on the first call, for every table and every concurrent call', async () => {
      const factory = countingFactory();
      const shop = await openShop({ factory });
      const orders = shop.table(new OrderSchema());
      const customers = shop.table(new CustomerSchema());

      expect(factory.opens).toStrictEqual([]);
      await Promise.all([orders.persist(order(1)), customers.count(), orders.count()]);
      await orders.get('ord-1');

      expect(factory.opens).toStrictEqual([undefined]);
    });

    it('creates the store of a table declared after the database was opened, keeping the data', async () => {
      const factory = countingFactory();
      const shop = await openShop({ factory });
      const orders = shop.table(new OrderSchema());
      await orders.persist(order(1));

      const customers = shop.table(new CustomerSchema());
      await customers.persist({ id: 'cus-1', email: 'ana@shop.test' });

      expect(factory.opens).toStrictEqual([undefined, undefined, 2]);
      expect(await orders.exists('ord-1')).toBe(true);
      expect(await customers.exists('cus-1')).toBe(true);
    });

    it('lets a call in flight finish before the upgrade another table needs', async () => {
      const shop = await openShop();
      const orders = shop.table(new OrderSchema());
      await orders.persist(order(1));
      const customers = shop.table(new CustomerSchema());

      const [found, count] = await Promise.all([orders.get('ord-1'), customers.count()]);

      expect(found?.id).toBe('ord-1');
      expect(count).toBe(0);
    });

    it('opens without an upgrade a database another page already prepared', async () => {
      await (await openShop()).table(new OrderSchema()).persist(order(1));
      const factory = countingFactory();

      const orders = anotherShop({ factory }).table(new OrderSchema());

      expect(await orders.exists('ord-1')).toBe(true);
      expect(factory.opens).toStrictEqual([undefined]);
    });

    it('opens again by itself after another page upgraded the database', async () => {
      const orders = (await openShop()).table(new OrderSchema());
      await orders.persist(order(1));

      await anotherShop()
        .table(new CustomerSchema())
        .persist({ id: 'cus-1', email: 'a@shop.test' });

      expect(await orders.exists('ord-1')).toBe(true);
    });
  });

  describe('closing', () => {
    it('closes after the idle timeout and opens again on the next call', async () => {
      const factory = countingFactory();
      const orders = (await openShop({ factory, idleTimeout: 20 })).table(new OrderSchema());
      await orders.persist(order(1));

      await pause(80);

      expect(await orders.exists('ord-1')).toBe(true);
      expect(factory.opens).toStrictEqual([undefined, undefined]);
    });

    it('stays open while it is used and when there is no idle timeout', async () => {
      const factory = countingFactory();
      const orders = (await openShop({ factory, idleTimeout: null })).table(new OrderSchema());
      await orders.persist(order(1));

      await pause(40);
      await orders.get('ord-1');

      expect(factory.opens).toStrictEqual([undefined]);
    });

    it('completes a call whose database was closed while it was still opening', async () => {
      const factory = countingFactory();
      const shop = await openShop({ factory });
      const orders = shop.table(new OrderSchema());

      const counting = orders.count();
      shop.close();

      expect(await counting).toBe(0);
      expect(factory.opens).toStrictEqual([undefined, undefined]);
    });

    it('completes a call made right before the database is closed', async () => {
      const shop = await openShop();
      const orders = shop.table(new OrderSchema());
      await orders.persist(order(1));

      const counting = orders.count();
      shop.close();

      expect(await counting).toBe(1);
    });
  });

  describe('a database that cannot be opened', () => {
    it('rejects every call and tries again on the next one', async () => {
      const shop = await openShop({ factory: undefined });
      const orders = shop.table(new OrderSchema());
      vi.stubGlobal('indexedDB', undefined);

      const first = orders.count();
      const second = orders.count();
      shop.close();
      await expect(first).rejects.toMatchObject({ reason: 'unavailable' });
      await expect(second).rejects.toMatchObject({ reason: 'unavailable' });
      await expect(orders.count()).rejects.toMatchObject({ reason: 'unavailable' });
      vi.unstubAllGlobals();

      expect(await orders.count()).toBe(0);
    });

    it('refuses to upgrade while another page keeps the database open, and works once it closes', async () => {
      const factory = await freshIndexedDb();
      const stubborn = await openDatabase(factory, 'shop');
      const orders = anotherShop({ openTimeout: 30 }).table(new OrderSchema());

      await expect(orders.count()).rejects.toMatchObject({
        reason: 'blocked',
        message: expect.stringContaining('did not close within 30 ms'),
      });
      stubborn.close();
      await pause(30);

      expect(await orders.count()).toBe(0);
    });

    it('waits for another page that closes in time', async () => {
      const factory = await freshIndexedDb();
      const slow = await openDatabase(factory, 'shop');
      const orders = anotherShop().table(new OrderSchema());

      const counting = orders.count();
      await pause(30);
      slow.close();

      expect(await counting).toBe(0);
    });

    it('opens again when another page raised the version in between', async () => {
      const first = await openShop();
      await first.table(new OrderSchema()).persist(order(1));
      await first.table(new IndexedDbSchema<{ id: string }>({ name: 'outbox' })).count();
      const real = anotherPage();
      let stale = true;
      const factory = countingFactory({
        ...real,
        open: (name: string, version?: number) => {
          if (version === undefined || !stale) {
            return real.open(name, version);
          }
          stale = false;
          return real.open(name, 1);
        },
      } as IDBFactory);

      const customers = anotherShop({ factory }).table(new CustomerSchema());

      expect(await customers.count()).toBe(0);
      expect(factory.opens).toStrictEqual([undefined, 3, undefined, 3]);
    });

    it('gives up when the database never gets the tables it declares', async () => {
      await (await openShop()).table(new OrderSchema()).persist(order(1));
      const real = anotherPage();
      const factory = { ...real, open: (name: string) => real.open(name) } as IDBFactory;

      const customers = anotherShop({ factory }).table(new CustomerSchema());

      await expect(customers.count()).rejects.toMatchObject({
        reason: 'blocked',
        message: 'IndexedDB blocked: database "shop" kept changing while it was being opened',
      });
    });

    it('refuses code older than the data and leaves the database as it was', async () => {
      const newer = anotherShop({ version: 2 });
      await freshIndexedDb();
      await newer.table(new OrderSchema()).persist(order(1));

      const older = anotherShop().table(new OrderSchema());

      await expect(older.count()).rejects.toMatchObject({
        reason: 'schema_mismatch',
        message:
          'IndexedDB schema_mismatch: database "shop" holds data at version 2, newer than version 1 of this code',
      });
      expect(await newer.table(new OrderSchema()).count()).toBe(1);
    });

    it('refuses a store of another shape and rolls the upgrade back', async () => {
      const factory = await freshIndexedDb();
      const legacy = await openDatabase(factory, 'shop', 1, (upgrading) => {
        upgrading.createObjectStore('orders', { keyPath: 'code' });
      });
      legacy.close();

      await expect(anotherShop().table(new OrderSchema()).count()).rejects.toMatchObject({
        reason: 'schema_mismatch',
        message: expect.stringContaining('store "orders" exists with another key'),
      });
      const after = await openDatabase(factory, 'shop');
      expect([after.version, Array.from(after.objectStoreNames)]).toStrictEqual([1, ['orders']]);
      after.close();
    });

    it('rejects a table that was never declared through the database', async () => {
      const shop = await openShop();
      const outbox = shop.table(new IndexedDbSchema<{ id: string }>({ name: 'outbox' }));

      await outbox.persist({ id: 'evt-1' });

      expect(await outbox.count()).toBe(1);
    });
  });
});
