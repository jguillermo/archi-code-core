import { IndexedDbDatabase } from '../../src/infrastructure/indexeddb/indexed-db-database';
import type { IndexedDbDatabaseOptions } from '../../src/infrastructure/indexeddb/indexed-db-database';
import { IndexedDbSchema } from '../../src/infrastructure/indexeddb/indexed-db-schema';
import { anotherPage, freshIndexedDb } from './indexed-db-environment';

export interface OrderRow {
  readonly id: string;
  readonly customerId: string;
  readonly total: number;
  readonly status?: string;
  readonly tags?: string[];
}

export interface OrderStored extends OrderRow {
  readonly status: string;
  readonly tags: string[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CustomerRow {
  readonly id: string;
  readonly email: string;
}

export const shopClock = { now: '2026-11-17T10:00:00.000Z' };

export class OrderSchema extends IndexedDbSchema<OrderRow, OrderStored> {
  constructor() {
    super({
      name: 'orders',
      indexes: {
        byCustomer: 'customerId',
        byCustomerAndTotal: ['customerId', 'total'],
        byTag: { keyPath: 'tags', multiEntry: true },
      },
      defaults: { status: 'pending', tags: () => [] },
      audit: {
        createdAt: { onInsert: () => shopClock.now },
        updatedAt: { onInsert: () => shopClock.now, onUpdate: () => shopClock.now },
      },
    });
  }
}

export class CustomerSchema extends IndexedDbSchema<CustomerRow> {
  constructor() {
    super({ name: 'customers', indexes: { byEmail: { keyPath: 'email', unique: true } } });
  }
}

export class ShopDb extends IndexedDbDatabase {
  constructor(options: Partial<IndexedDbDatabaseOptions> = {}) {
    super({ name: 'shop', ...options });
  }
}

export interface CountingFactory extends IDBFactory {
  opens: (number | undefined)[];
}

export function countingFactory(real: IDBFactory = anotherPage()): CountingFactory {
  const opens: (number | undefined)[] = [];
  return {
    opens,
    open: (name: string, version?: number) => {
      opens.push(version);
      return real.open(name, version);
    },
    deleteDatabase: real.deleteDatabase.bind(real),
    cmp: real.cmp.bind(real),
    databases: real.databases.bind(real),
  };
}

const shops: IndexedDbDatabase[] = [];

export function anotherShop(options: Partial<IndexedDbDatabaseOptions> = {}): ShopDb {
  const shop = new ShopDb({ factory: anotherPage(), ...options });
  shops.push(shop);
  return shop;
}

export async function openShop(options: Partial<IndexedDbDatabaseOptions> = {}): Promise<ShopDb> {
  await freshIndexedDb();
  return anotherShop(options);
}

export function closeShops(): void {
  for (const shop of shops.splice(0)) {
    shop.close();
  }
}

export function order(number: number, row: Partial<OrderRow> = {}): OrderRow {
  return { id: `ord-${number}`, customerId: 'cus-a', total: number * 10, ...row };
}

export const SIX_ORDERS: readonly OrderRow[] = [
  order(1),
  order(2, { customerId: 'cus-b' }),
  order(3),
  order(4, { customerId: 'cus-c' }),
  order(5, { customerId: 'cus-b' }),
  order(6),
];
