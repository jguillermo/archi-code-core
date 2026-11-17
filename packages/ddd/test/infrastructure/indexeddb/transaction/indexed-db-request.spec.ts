import { describe, expect, it } from 'vitest';
import { freshIndexedDb, openDatabase } from '../../../support/indexed-db-environment';
import { IndexedDbRequest } from '../../../../src/infrastructure/indexeddb/transaction/indexed-db-request';

async function ordersStore(mode: IDBTransactionMode = 'readwrite'): Promise<IDBObjectStore> {
  const database = await openDatabase(await freshIndexedDb(), 'shop', 1, (upgrading) => {
    const store = upgrading.createObjectStore('orders', { keyPath: 'id' });
    store.put({ id: 'ord-1', total: 10 });
    store.put({ id: 'ord-2', total: 20 });
    store.put({ id: 'ord-3', total: 30 });
  });
  database.onversionchange = () => database.close();
  return database.transaction('orders', mode).objectStore('orders');
}

describe('IndexedDbRequest: one IndexedDB request as one promise', () => {
  it('resolves with the result of the request', async () => {
    const store = await ordersStore();

    expect(await IndexedDbRequest.result(() => store.get('ord-2'), 'reading')).toStrictEqual({
      id: 'ord-2',
      total: 20,
    });
  });

  it('rejects when the browser refuses to create the request', async () => {
    const store = await ordersStore();

    await expect(
      IndexedDbRequest.result(() => store.get(undefined as never), 'reading an order'),
    ).rejects.toMatchObject({ reason: 'invalid_key' });
  });

  it('rejects when the request fails', async () => {
    const store = await ordersStore();

    await expect(
      IndexedDbRequest.result(() => store.add({ id: 'ord-1' }), 'adding an order'),
    ).rejects.toMatchObject({ reason: 'duplicate_key' });
  });

  it('walks every row of a cursor', async () => {
    const store = await ordersStore('readonly');
    const totals: number[] = [];

    await IndexedDbRequest.walk<IDBCursorWithValue>(
      () => store.openCursor(),
      'walking',
      (cursor) => {
        totals.push(cursor.value.total);
        cursor.continue();
        return true;
      },
    );

    expect(totals).toStrictEqual([10, 20, 30]);
  });

  it('stops walking as soon as the visit says so', async () => {
    const store = await ordersStore('readonly');
    const ids: string[] = [];

    await IndexedDbRequest.walk<IDBCursorWithValue>(
      () => store.openCursor(),
      'walking',
      (cursor) => {
        ids.push(cursor.value.id);
        return false;
      },
    );

    expect(ids).toStrictEqual(['ord-1']);
  });

  it('rejects with what the visit throws', async () => {
    const store = await ordersStore('readonly');

    await expect(
      IndexedDbRequest.walk(
        () => store.openCursor(),
        'walking the orders',
        () => {
          throw new Error('a broken filter');
        },
      ),
    ).rejects.toMatchObject({
      reason: 'request_failed',
      message: 'IndexedDB request_failed: walking the orders: a broken filter',
    });
  });

  it('rejects when the cursor request fails because its transaction is aborted', async () => {
    const store = await ordersStore('readonly');

    const walking = IndexedDbRequest.walk(
      () => store.openCursor(),
      'walking',
      () => true,
    );
    store.transaction.abort();

    await expect(walking).rejects.toMatchObject({ reason: 'request_failed' });
  });
});
