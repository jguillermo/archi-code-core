import { IndexedDbFailure } from './indexed-db-failure';

export class IndexedDbTransaction {
  static run<T>(
    database: IDBDatabase,
    storeNames: readonly string[],
    mode: IDBTransactionMode,
    work: (transaction: IDBTransaction) => Promise<T> | T,
  ): Promise<T> {
    const stores = storeNames.map((name) => `"${name}"`).join(', ');
    return new Promise<T>((resolve, reject) => {
      let transaction: IDBTransaction;
      try {
        transaction = database.transaction([...storeNames], mode);
      } catch (error) {
        reject(IndexedDbFailure.from(error, `cannot open a transaction on ${stores}`));
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
        if (failure === null && IndexedDbFailure.nameOf(error) !== 'AbortError') {
          failure = { error: IndexedDbFailure.from(error, `a request on ${stores} failed`) };
        }
      };
      transaction.onabort = () => {
        reject(
          failure === null
            ? IndexedDbFailure.from(transaction.error, `the transaction on ${stores} was aborted`)
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
}
