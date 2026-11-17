import { afterEach, describe, expect, it, vi } from 'vitest';
import { IndexedDbDatabase } from '../../../src/infrastructure/indexeddb/indexed-db-database';
import { IndexedDbSchema } from '../../../src/infrastructure/indexeddb/indexed-db-schema';
import {
  closeShops,
  CustomerSchema,
  openShop,
  order,
  OrderSchema,
  ShopDb,
} from '../../support/indexed-db-shop';

const invalidSchema = expect.objectContaining({ reason: 'invalid_schema' });

describe('IndexedDbDatabase: one database and the tables declared on it', () => {
  afterEach(() => {
    closeShops();
    vi.unstubAllGlobals();
  });

  it('keeps its name and the version of its data, 1 when none is given', () => {
    const shop = new ShopDb({ version: 3, migrations: { 3: { orders: (row) => row } } });

    expect([shop.name, shop.version]).toStrictEqual(['shop', 3]);
    expect(new ShopDb().version).toBe(1);
  });

  it('gives a repository the table of a schema, ready to use', async () => {
    const orders = (await openShop()).table(new OrderSchema());

    await orders.persist(order(1));

    expect(await orders.exists('ord-1')).toBe(true);
  });

  it('gives the same table to every repository that declares the same schema', async () => {
    const shop = await openShop();

    expect(shop.table(new OrderSchema())).toBe(shop.table(new OrderSchema()));
    expect(shop.table(new CustomerSchema())).not.toBe(shop.table(new OrderSchema()));
  });

  it('refuses a second schema for a table it already has', async () => {
    const shop = await openShop();
    shop.table(new OrderSchema());
    shop.table(new IndexedDbSchema({ name: 'outbox' }));

    expect(() => shop.table(new IndexedDbSchema({ name: 'orders' }))).toThrow(
      'IndexedDB schema_mismatch: database "shop" already has a table "orders" declared with another schema',
    );
    expect(() =>
      shop.table(new IndexedDbSchema({ name: 'outbox', indexes: { byEvent: 'eventName' } })),
    ).toThrow(expect.objectContaining({ reason: 'schema_mismatch' }));
  });

  it('keeps working after it is closed: the next call opens it again', async () => {
    const shop = await openShop();
    const orders = shop.table(new OrderSchema());
    await orders.persist(order(1));

    shop.close();
    shop.close();

    expect(await orders.exists('ord-1')).toBe(true);
  });

  it('can be declared where there is no IndexedDB and only fails when it is used', async () => {
    vi.stubGlobal('indexedDB', undefined);
    const orders = new ShopDb().table(new OrderSchema());

    await expect(orders.get('ord-1')).rejects.toMatchObject({
      reason: 'unavailable',
      message: 'IndexedDB unavailable: this environment has no indexedDB',
    });
  });

  it('uses the IndexedDB of the page when no factory is given', async () => {
    await openShop();
    const shop = new ShopDb();
    const orders = shop.table(new OrderSchema());

    await orders.persist(order(1));

    expect(await orders.count()).toBe(1);
    shop.close();
  });

  describe('a declaration that cannot work', () => {
    it.each([[''], [7]])('refuses the database name %j', (name) => {
      expect(() => new IndexedDbDatabase({ name: name as string })).toThrow(invalidSchema);
    });

    it.each([[0], [1.5], ['2']])('refuses the version %j', (version) => {
      expect(() => new ShopDb({ version: version as number })).toThrow(invalidSchema);
    });

    it.each([
      [{ idleTimeout: -1 }],
      [{ idleTimeout: Number.POSITIVE_INFINITY }],
      [{ idleTimeout: '30' }],
      [{ openTimeout: -1 }],
      [{ openTimeout: null }],
    ])('refuses the timeouts %j', (options) => {
      expect(() => new ShopDb(options as never)).toThrow(invalidSchema);
    });

    it('accepts no idle timeout at all', () => {
      expect(new ShopDb({ idleTimeout: null, openTimeout: 0 }).name).toBe('shop');
    });

    it.each([[1], [4], ['next']])('refuses a migration for version %j of a database at 3', (to) => {
      expect(
        () => new ShopDb({ version: 3, migrations: { [to]: { orders: (row: object) => row } } }),
      ).toThrow(invalidSchema);
    });

    it('refuses a migration that is not a function', () => {
      expect(
        () => new ShopDb({ version: 2, migrations: { 2: { orders: 'drop' as never } } }),
      ).toThrow('the migration of "orders" to version 2 is a function');
    });
  });
});
