import { describe, expect, it } from 'vitest';
import { freshIndexedDb, openDatabase, pause } from '../../../support/indexed-db-environment';
import { IndexedDbRequest } from '../../../../src/infrastructure/indexeddb/transaction/indexed-db-request';
import { IndexedDbTransaction } from '../../../../src/infrastructure/indexeddb/transaction/indexed-db-transaction';

async function openShop(): Promise<IDBDatabase> {
  const database = await openDatabase(await freshIndexedDb(), 'shop', 1, (upgrading) => {
    upgrading.createObjectStore('orders', { keyPath: 'id' });
    upgrading.createObjectStore('outbox', { keyPath: 'id' });
  });
  database.onversionchange = () => database.close();
  return database;
}

const add = (transaction: IDBTransaction, store: string, row: object): Promise<IDBValidKey> =>
  IndexedDbRequest.result(() => transaction.objectStore(store).add(row), `adding to ${store}`);

const count = (database: IDBDatabase, store: string): Promise<number> =>
  IndexedDbTransaction.run(database, [store], 'readonly', (transaction) =>
    IndexedDbRequest.result(() => transaction.objectStore(store).count(), 'counting'),
  );

describe('IndexedDbTransaction: one IndexedDB transaction as one promise', () => {
  it('resolves with what the work returns once the transaction has committed', async () => {
    const database = await openShop();

    const keys = await IndexedDbTransaction.run(
      database,
      ['orders', 'outbox'],
      'readwrite',
      async (transaction) => [
        await add(transaction, 'orders', { id: 'ord-1' }),
        await add(transaction, 'outbox', { id: 'evt-1' }),
      ],
    );

    expect(keys).toStrictEqual(['ord-1', 'evt-1']);
    expect(await count(database, 'outbox')).toBe(1);
  });

  it('accepts work that returns a plain value', async () => {
    const database = await openShop();

    expect(await IndexedDbTransaction.run(database, ['orders'], 'readonly', () => 7)).toBe(7);
  });

  it('rolls every store back and rejects with the error the work throws', async () => {
    const database = await openShop();
    const refused = new Error('stock is gone');

    await expect(
      IndexedDbTransaction.run(database, ['orders', 'outbox'], 'readwrite', async (transaction) => {
        await add(transaction, 'orders', { id: 'ord-1' });
        void add(transaction, 'outbox', { id: 'evt-1' });
        throw refused;
      }),
    ).rejects.toBe(refused);
    expect(await count(database, 'orders')).toBe(0);
    expect(await count(database, 'outbox')).toBe(0);
  });

  it('rolls back when the work throws before any request', async () => {
    const database = await openShop();
    const refused = new Error('not allowed');

    await expect(
      IndexedDbTransaction.run(database, ['orders'], 'readwrite', () => {
        throw refused;
      }),
    ).rejects.toBe(refused);
  });

  it('rolls back and tells why when a request nobody awaited fails', async () => {
    const database = await openShop();

    await expect(
      IndexedDbTransaction.run(database, ['orders'], 'readwrite', async (transaction) => {
        await add(transaction, 'orders', { id: 'ord-1' });
        void add(transaction, 'orders', { id: 'ord-2' });
        void add(transaction, 'orders', { id: 'ord-1' });
        return 'done';
      }),
    ).rejects.toMatchObject({ reason: 'duplicate_key' });
    expect(await count(database, 'orders')).toBe(0);
  });

  it('rejects when the transaction is aborted from outside the work', async () => {
    const database = await openShop();

    await expect(
      IndexedDbTransaction.run(database, ['orders'], 'readwrite', (transaction) => {
        transaction.abort();
        return 'done';
      }),
    ).rejects.toMatchObject({
      reason: 'request_failed',
      message: 'IndexedDB request_failed: the transaction on "orders" was aborted',
    });
  });

  it('rejects with the error of work that fails after its transaction already finished', async () => {
    const database = await openShop();
    const late = new Error('the payment gateway timed out');

    await expect(
      IndexedDbTransaction.run(database, ['orders'], 'readwrite', async () => {
        await pause(20);
        throw late;
      }),
    ).rejects.toBe(late);
  });

  it('rejects when the transaction cannot be opened', async () => {
    const database = await openShop();

    await expect(
      IndexedDbTransaction.run(database, ['invoices'], 'readonly', () => 1),
    ).rejects.toMatchObject({
      reason: 'schema_mismatch',
      message: expect.stringContaining('cannot open a transaction on "invoices"'),
    });
  });
});
