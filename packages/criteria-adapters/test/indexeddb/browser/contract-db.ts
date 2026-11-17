import { IndexedDbDatabase, IndexedDbSchema } from '@archi-code/ddd/infrastructure';
import type { ContractDocument } from '../../contract/contract-documents';

export class ContractWithoutIndexesSchema extends IndexedDbSchema<ContractDocument> {
  constructor() {
    super({ name: 'records-without-indexes' });
  }
}

export class ContractWithIndexesSchema extends IndexedDbSchema<ContractDocument> {
  constructor() {
    super({
      name: 'records-with-indexes',
      indexes: {
        age: 'age',
        status: 'status',
        name: 'name',
        createdAt: 'createdAt',
        city: 'address.city',
        zip: 'address.zip',
        title: 'title',
        tags: { keyPath: 'tags', multiEntry: true },
      },
    });
  }
}

export class ContractDb extends IndexedDbDatabase {
  constructor() {
    super({ name: 'criteria-contract', idleTimeout: null });
  }
}
