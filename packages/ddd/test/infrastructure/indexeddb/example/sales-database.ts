import { IndexedDbDatabase } from '../../../../src/infrastructure/index';
import type { IndexedDbDatabaseOptions } from '../../../../src/infrastructure/index';

export class SalesDatabase extends IndexedDbDatabase {
  constructor(options: Omit<IndexedDbDatabaseOptions, 'name'> = {}) {
    super({ name: 'sales', ...options });
  }
}
