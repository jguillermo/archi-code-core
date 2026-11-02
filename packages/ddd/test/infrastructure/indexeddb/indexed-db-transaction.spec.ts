import { describe, expect, it } from 'vitest';
import { freshIndexedDb } from '../../support/indexed-db-environment';
import { IndexedDbTransaction } from '../../../src/infrastructure/indexeddb/indexed-db-transaction';
import { IndexedDbException } from '../../../src/infrastructure/exceptions/indexed-db.exception';

async function openShop(): Promise<IDBDatabase> {
  const factory = await freshIndexedDb();
  return new Promise((resolve, reject) => {
    const request = factory.open('shop', 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('orders', { keyPath: 'id' });
      request.result.createObjectStore('outbox', { keyPath: 'id' });
    };
    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => database.close();
      resolve(database);
    };
    request.onerror = () => reject(request.error);
  });
}

const put = (transaction: IDBTransaction, store: string, row: object): Promise<IDBValidKey> =>
  IndexedDbTransaction.request(transaction.objectStore(store).put(row), `saving into ${store}`);

const count = async (database: IDBDatabase, store: string): Promise<number> =>
  IndexedDbTransaction.run(database, [store], 'readonly', 'default', (transaction) =>
    IndexedDbTransaction.request(transaction.objectStore(store).count(), 'counting'),
  );

describe('IndexedDbTransaction: one IndexedDB transaction as one promise', () => {
  it('resolves with what the work returns once the transaction has committed', async () => {
    const database = await openShop();

    const keys = await IndexedDbTransaction.run(
      database,
      ['orders', 'outbox'],
      'readwrite',
      'relaxed',
      async (transaction) => [
        await put(transaction, 'orders', { id: 'ord-1' }),
        await put(transaction, 'outbox', { id: 'evt-1' }),
      ],
    );

    expect(keys).toStrictEqual(['ord-1', 'evt-1']);
    expect(await count(database, 'outbox')).toBe(1);
  });

  it('accepts work that returns a plain value', async () => {
    const database = await openShop();

    expect(
      await IndexedDbTransaction.run(database, ['orders'], 'readonly', 'default', () => 7),
    ).toBe(7);
  });

  it('rolls every store back and rejects with the error the work throws', async () => {
    const database = await openShop();
    const refused = new Error('stock is gone');

    await expect(
      IndexedDbTransaction.run(
        database,
        ['orders', 'outbox'],
        'readwrite',
        'default',
        async (transaction) => {
          await put(transaction, 'orders', { id: 'ord-1' });
          throw refused;
        },
      ),
    ).rejects.toBe(refused);
    expect(await count(database, 'orders')).toBe(0);
  });

  it('rolls back when the work throws before any request', async () => {
    const database = await openShop();
    const refused = new Error('not allowed');

    await expect(
      IndexedDbTransaction.run(database, ['orders'], 'readwrite', 'default', () => {
        throw refused;
      }),
    ).rejects.toBe(refused);
  });

  it('rejects with the first failed request even when the work catches it', async () => {
    const database = await openShop();
    await IndexedDbTransaction.run(database, ['orders'], 'readwrite', 'default', (transaction) =>
      put(transaction, 'orders', { id: 'ord-1' }),
    );

    const error = await IndexedDbTransaction.run(
      database,
      ['orders'],
      'readwrite',
      'default',
      async (transaction) => {
        await IndexedDbTransaction.request(
          transaction.objectStore('orders').add({ id: 'ord-1' }),
          'adding',
        ).catch(() => undefined);
        return 'ignored';
      },
    ).catch((reason: unknown) => reason);

    expect(error).toMatchObject({ reason: 'duplicate_key' });
  });

  it('rejects when the work fails after the transaction already committed', async () => {
    const database = await openShop();
    const late = new Error('too late');

    await expect(
      IndexedDbTransaction.run(database, ['orders'], 'readonly', 'default', async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        throw late;
      }),
    ).rejects.toBe(late);
  });

  it('rejects when the transaction cannot be opened, such as on a closed connection', async () => {
    const database = await openShop();
    database.close();

    await expect(
      IndexedDbTransaction.run(database, ['orders'], 'readonly', 'default', () => undefined),
    ).rejects.toMatchObject({
      reason: 'request_failed',
      message: expect.stringContaining('cannot open a transaction on "orders"'),
    });
  });

  it('turns a cursor walk into a promise and rejects with what the visitor throws', async () => {
    const database = await openShop();
    await IndexedDbTransaction.run(
      database,
      ['orders'],
      'readwrite',
      'default',
      async (transaction) => {
        await put(transaction, 'orders', { id: 'ord-1' });
        await put(transaction, 'orders', { id: 'ord-2' });
      },
    );
    const broken = new Error('visitor broke');

    const seen: IDBValidKey[] = [];
    await IndexedDbTransaction.run(database, ['orders'], 'readonly', 'default', (transaction) =>
      IndexedDbTransaction.walk(
        transaction.objectStore('orders').openKeyCursor(),
        'walking',
        (cursor) => {
          seen.push(cursor.key);
          cursor.continue();
          return true;
        },
      ),
    );
    const failure = await IndexedDbTransaction.run(
      database,
      ['orders'],
      'readonly',
      'default',
      (transaction) =>
        IndexedDbTransaction.walk(transaction.objectStore('orders').openCursor(), 'walking', () => {
          throw broken;
        }),
    ).catch((reason: unknown) => reason);

    expect(seen).toStrictEqual(['ord-1', 'ord-2']);
    expect(failure).toMatchObject({ reason: 'request_failed', cause: broken });
  });

  it('rejects a walk whose request fails', async () => {
    const database = await openShop();

    const failure = await IndexedDbTransaction.run(
      database,
      ['orders'],
      'readwrite',
      'default',
      async (transaction) => {
        const request = transaction.objectStore('orders').openCursor();
        const walking = IndexedDbTransaction.walk(request, 'walking', () => false);
        transaction.abort();
        return walking;
      },
    ).catch((reason: unknown) => reason);

    expect(failure).toBeInstanceOf(IndexedDbException);
  });

  it.each([
    [new DOMException('taken', 'ConstraintError'), 'duplicate_key'],
    [new DOMException('bad key', 'DataError'), 'invalid_key'],
    [new DOMException('no store', 'NotFoundError'), 'schema_mismatch'],
    [new DOMException('quota', 'QuotaExceededError'), 'request_failed'],
    ['a plain text', 'request_failed'],
    [null, 'request_failed'],
    [{ name: 42, message: false }, 'request_failed'],
  ])('maps %s to the reason %s', (error, reason) => {
    const failure = IndexedDbTransaction.failure(error, 'saving orders');

    expect(failure.reason).toBe(reason);
    expect(failure.message).toContain('saving orders');
  });

  it('keeps an IndexedDbException as it is', () => {
    const exception = new IndexedDbException('blocked', 'open elsewhere');

    expect(IndexedDbTransaction.failure(exception, 'opening')).toBe(exception);
  });
});
