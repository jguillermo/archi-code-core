import { IndexedDbDatabase } from '../../../../src/infrastructure/index';
import type { IndexedDbDatabaseOptions } from '../../../../src/infrastructure/index';
import { renameNewStatusAndDropCancelled, stampMissingUpdatedAt } from './order.migrations';

export const SALES_DATA_VERSION = 3;

export const SALES_MIGRATIONS: NonNullable<IndexedDbDatabaseOptions['migrations']> = {
  2: { orders: renameNewStatusAndDropCancelled },
  3: { orders: stampMissingUpdatedAt },
};

export class SalesDb extends IndexedDbDatabase {
  constructor(options: Omit<IndexedDbDatabaseOptions, 'name'> = {}) {
    super({
      name: 'sales',
      version: SALES_DATA_VERSION,
      migrations: SALES_MIGRATIONS,
      ...options,
    });
  }
}
