import { IndexedDbException } from '../exceptions/indexed-db.exception';

export type IndexedDbDurability = 'default' | 'strict' | 'relaxed';

export class IndexedDbTransaction {
  static run<T>(
    database: IDBDatabase,
    storeNames: readonly string[],
    mode: IDBTransactionMode,
    durability: IndexedDbDurability,
    work: (transaction: IDBTransaction) => Promise<T> | T,
  ): Promise<T> {
    const stores = storeNames.map((name) => `"${name}"`).join(', ');
    return new Promise<T>((resolve, reject) => {
      let transaction: IDBTransaction;
      try {
        transaction =
          durability === 'default'
            ? database.transaction([...storeNames], mode)
            : database.transaction([...storeNames], mode, { durability });
      } catch (error) {
        reject(IndexedDbTransaction.failure(error, `cannot open a transaction on ${stores}`));
        return;
      }
      let failure: { error: unknown } | null = null;
      let outcome: { value: T } | null = null;
      let completed = false;
      const settle = (): void => {
        if (completed && outcome !== null) {
          resolve(outcome.value);
        }
      };
      transaction.oncomplete = () => {
        completed = true;
        settle();
      };
      transaction.onerror = (event) => {
        const error = (event.target as IDBRequest).error;
        if (failure === null && error?.name !== 'AbortError') {
          failure = { error: IndexedDbTransaction.failure(error, `a request on ${stores} failed`) };
        }
      };
      transaction.onabort = () => {
        reject(
          failure === null
            ? IndexedDbTransaction.failure(
                transaction.error,
                `the transaction on ${stores} was aborted`,
              )
            : failure.error,
        );
      };
      let pending: Promise<T>;
      try {
        pending = Promise.resolve(work(transaction));
      } catch (error) {
        pending = Promise.reject(error);
      }
      pending.then(
        (value) => {
          outcome = { value };
          settle();
        },
        (error: unknown) => {
          failure ??= { error };
          try {
            transaction.abort();
          } catch {
            reject(failure.error);
          }
        },
      );
    });
  }

  static request<R>(request: IDBRequest<R>, context: string): Promise<R> {
    const promise = new Promise<R>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(IndexedDbTransaction.failure(request.error, context));
    });
    promise.catch(() => undefined);
    return promise;
  }

  static walk<C extends IDBCursor>(
    request: IDBRequest<C | null>,
    context: string,
    visit: (cursor: C) => boolean,
  ): Promise<void> {
    const promise = new Promise<void>((resolve, reject) => {
      request.onerror = () => reject(IndexedDbTransaction.failure(request.error, context));
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor === null) {
          resolve();
          return;
        }
        try {
          if (!visit(cursor)) {
            resolve();
          }
        } catch (error) {
          reject(IndexedDbTransaction.failure(error, context));
        }
      };
    });
    promise.catch(() => undefined);
    return promise;
  }

  static failure(error: unknown, context: string): IndexedDbException {
    if (error instanceof IndexedDbException) {
      return error;
    }
    const { name, message } = IndexedDbTransaction.describe(error);
    const detail = message === '' ? context : `${context}: ${message}`;
    const options = error === null || error === undefined ? {} : { cause: error };
    if (name === 'ConstraintError') {
      return new IndexedDbException('duplicate_key', detail, options);
    }
    if (name === 'DataError') {
      return new IndexedDbException('invalid_key', detail, options);
    }
    if (name === 'NotFoundError') {
      return new IndexedDbException('schema_mismatch', detail, options);
    }
    return new IndexedDbException('request_failed', detail, options);
  }

  private static describe(error: unknown): { name: string; message: string } {
    if (typeof error !== 'object' || error === null) {
      return { name: '', message: '' };
    }
    const { name, message } = error as { name?: unknown; message?: unknown };
    return {
      name: typeof name === 'string' ? name : '',
      message: typeof message === 'string' ? message : '',
    };
  }
}
