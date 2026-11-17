import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { IndexedDbSchema } from '@archi-code/ddd/infrastructure';
import { toIndexedDbQuery } from '../../../src/indexeddb/index';
import { runCriteriaContract } from '../../contract/run-criteria-contract';
import type { ContractDocument } from '../../contract/contract-documents';
import { ContractDb, ContractWithIndexesSchema, ContractWithoutIndexesSchema } from './contract-db';
import { emptyIndexedDb } from './empty-indexed-db';

describe('toIndexedDbQuery passes the criteria contract on the IndexedDB table of @archi-code/ddd', () => {
  let database: ContractDb;

  beforeEach(async () => {
    await emptyIndexedDb();
    database = new ContractDb();
  });

  afterEach(() => database.close());

  it.each<[string, () => IndexedDbSchema<ContractDocument>]>([
    ['without indexes', () => new ContractWithoutIndexesSchema()],
    ['with an index per field', () => new ContractWithIndexesSchema()],
  ])('on a table %s', async (_layout, schema) => {
    const table = database.table(schema());

    const failures = await runCriteriaContract({
      setup: (documents) => table.persistMany(documents),
      search: async (criteria, options) => {
        const { items, total } = await table.find(toIndexedDbQuery(criteria, table.indexes));
        return options.withTotal === true ? { items, total } : { items };
      },
    });

    expect(failures).toStrictEqual([]);
  });
});
