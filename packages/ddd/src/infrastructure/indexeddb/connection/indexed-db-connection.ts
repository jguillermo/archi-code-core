import { IndexedDbException } from '../../exceptions/indexed-db.exception';
import type { IndexedDbSchema } from '../indexed-db-schema';
import { IndexedDbFailure } from '../transaction/indexed-db-failure';
import { IndexedDbTransaction } from '../transaction/indexed-db-transaction';
import { IndexedDbUpgrade } from './indexed-db-upgrade';
import type { IndexedDbUpgradeTarget } from './indexed-db-upgrade';
import type { IndexedDbMigrationStep } from './indexed-db-upgrade-plan';

export interface IndexedDbConnectionOptions {
  readonly name: string;
  readonly version: number;
  readonly migrations: readonly IndexedDbMigrationStep[];
  readonly idleTimeout: number | null;
  readonly openTimeout: number;
  readonly factory: IDBFactory | undefined;
  readonly declared: () => readonly IndexedDbSchema<any, any>[];
}

export class IndexedDbConnection {
  private static readonly attempts = 5;

  private opening: Promise<IDBDatabase> | null = null;
  private database: IDBDatabase | null = null;
  private ready: ReadonlySet<string> = new Set();
  private active = 0;
  private idle: ReturnType<typeof setTimeout> | undefined;

  constructor(private readonly options: IndexedDbConnectionOptions) {}

  async run<T>(
    table: string,
    mode: IDBTransactionMode,
    work: (store: IDBObjectStore) => Promise<T>,
  ): Promise<T> {
    for (;;) {
      const database = await this.open();
      if (this.database !== database) {
        continue;
      }
      if (!this.ready.has(table)) {
        this.release(database);
        continue;
      }
      this.active += 1;
      clearTimeout(this.idle);
      try {
        return await IndexedDbTransaction.run(database, [table], mode, (transaction) =>
          work(transaction.objectStore(table)),
        );
      } finally {
        this.active -= 1;
        this.watch();
      }
    }
  }

  compare(first: IDBValidKey, second: IDBValidKey): number {
    return this.factory().cmp(first, second);
  }

  close(): void {
    const database = this.database;
    this.forget();
    database?.close();
  }

  private open(): Promise<IDBDatabase> {
    if (this.opening === null) {
      const schemas = this.options.declared();
      const opening: Promise<IDBDatabase> = this.connect(schemas).then(
        (database) => {
          if (this.opening !== opening) {
            database.close();
            return database;
          }
          this.database = database;
          this.ready = new Set(schemas.map((schema) => schema.name));
          const release = (): void => this.release(database);
          database.onversionchange = release;
          database.onclose = release;
          return database;
        },
        (error: unknown) => {
          if (this.opening === opening) {
            this.opening = null;
          }
          throw error;
        },
      );
      this.opening = opening;
    }
    return this.opening;
  }

  private async connect(schemas: readonly IndexedDbSchema<any, any>[]): Promise<IDBDatabase> {
    const { name, version, migrations } = this.options;
    const target: IndexedDbUpgradeTarget = { name, version, migrations, schemas };
    let next: number | undefined;
    for (let attempt = 0; attempt < IndexedDbConnection.attempts; attempt += 1) {
      const database = await this.request(target, next).catch((error: unknown) => {
        if (IndexedDbFailure.nameOf((error as { cause?: unknown }).cause) !== 'VersionError') {
          throw error;
        }
        return null;
      });
      if (database === null) {
        next = undefined;
        continue;
      }
      const pending = await IndexedDbUpgrade.pending(database, target).catch((error: unknown) => {
        database.close();
        throw error;
      });
      if (!pending) {
        return database;
      }
      next = database.version + 1;
      database.close();
    }
    throw new IndexedDbException(
      'blocked',
      `database "${name}" kept changing while it was being opened`,
    );
  }

  private async request(
    target: IndexedDbUpgradeTarget,
    version: number | undefined,
  ): Promise<IDBDatabase> {
    const factory = this.factory();
    const { name, openTimeout } = this.options;
    return new Promise((resolve, reject) => {
      let failure: unknown = null;
      let expired = false;
      let waiting: ReturnType<typeof setTimeout> | undefined;
      const request = factory.open(name, version);
      request.onupgradeneeded = () => {
        const transaction = request.transaction as IDBTransaction;
        IndexedDbUpgrade.apply(request.result, transaction, target).catch((error: unknown) => {
          failure = error;
          try {
            transaction.abort();
          } catch {
            /* v8 ignore next -- @preserve: the failed request already aborted the upgrade */
          }
        });
      };
      request.onblocked = () => {
        waiting = setTimeout(() => {
          expired = true;
          reject(
            new IndexedDbException(
              'blocked',
              `database "${name}" is open elsewhere and did not close within ${openTimeout} ms, so its upgrade cannot run`,
            ),
          );
        }, openTimeout);
      };
      request.onsuccess = () => {
        clearTimeout(waiting);
        if (expired) {
          request.result.close();
          return;
        }
        resolve(request.result);
      };
      request.onerror = (event) => {
        clearTimeout(waiting);
        event.preventDefault();
        reject(IndexedDbFailure.from(failure ?? request.error, `cannot open database "${name}"`));
      };
    });
  }

  private factory(): IDBFactory {
    const factory = this.options.factory ?? (globalThis as { indexedDB?: IDBFactory }).indexedDB;
    if (!factory) {
      throw new IndexedDbException('unavailable', 'this environment has no indexedDB');
    }
    return factory;
  }

  private watch(): void {
    const { idleTimeout } = this.options;
    if (this.active === 0 && this.database !== null && idleTimeout !== null) {
      this.idle = setTimeout(() => this.close(), idleTimeout);
    }
  }

  private release(database: IDBDatabase): void {
    database.close();
    /* v8 ignore else -- @preserve: a connection that was already replaced gets no more events */
    if (this.database === database) {
      this.forget();
    }
  }

  private forget(): void {
    clearTimeout(this.idle);
    this.idle = undefined;
    this.opening = null;
    this.database = null;
    this.ready = new Set();
  }
}
