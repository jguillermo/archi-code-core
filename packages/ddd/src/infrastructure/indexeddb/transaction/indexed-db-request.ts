import { IndexedDbFailure } from './indexed-db-failure';

export class IndexedDbRequest {
  static result<R>(create: () => IDBRequest<R>, context: string): Promise<R> {
    return IndexedDbRequest.settle<R>((resolve, reject) => {
      const request = create();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    }, context);
  }

  static walk<C extends IDBCursor>(
    create: () => IDBRequest<C | null>,
    context: string,
    visit: (cursor: C) => boolean,
  ): Promise<void> {
    return IndexedDbRequest.settle<undefined>((resolve, reject) => {
      const request = create();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const cursor = request.result;
        try {
          if (cursor === null || !visit(cursor)) {
            resolve(undefined);
          }
        } catch (error) {
          reject(error);
        }
      };
    }, context);
  }

  private static settle<R>(
    start: (resolve: (value: R) => void, reject: (error: unknown) => void) => void,
    context: string,
  ): Promise<R> {
    const promise = new Promise<R>((resolve, reject) => {
      const fail = (error: unknown): void => reject(IndexedDbFailure.from(error, context));
      try {
        start(resolve, fail);
      } catch (error) {
        fail(error);
      }
    });
    promise.catch(() => undefined);
    return promise;
  }
}
