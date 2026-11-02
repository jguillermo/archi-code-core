import { describe, expect, it } from 'vitest';
import { Criteria } from '@archi-code/ddd/domain';
import { runCriteriaContract } from '../contract/run-criteria-contract';
import {
  ContractAge,
  ContractId,
  ContractRecord,
  ContractStatus,
  ContractStatusOption,
  createContractRecords,
} from '../contract/contract-documents';
import { searchMemory } from '../../src/memory/search-memory';

const idsOf = (records: readonly ContractRecord[]): string[] =>
  records.map((record) => record.id.value);

describe('searchMemory', () => {
  it('passes the criteria contract on aggregates', async () => {
    let records: ContractRecord[] = [];
    const failures = await runCriteriaContract({
      setup: (documents) => {
        records = documents.map((document) => ContractRecord.fromPrimitives(document));
      },
      search: (criteria, options) => {
        const result = searchMemory(records, criteria, options);
        return { ...result, items: result.items.map((record) => record.toPrimitives()) };
      },
    });
    expect(failures).toEqual([]);
  });

  it('returns every aggregate in its original order without criteria', () => {
    const records = createContractRecords();
    expect(searchMemory(records, Criteria.create<ContractRecord>())).toEqual({ items: records });
  });

  it('filters, sorts, paginates and counts by the values of the value objects', () => {
    const criteria = Criteria.create<ContractRecord>({
      where: {
        status: new ContractStatus(ContractStatusOption.ACTIVE),
        age: { gte: new ContractAge(18) },
      },
      orderBy: { age: 'asc' },
      limit: 2,
      offset: 1,
    });
    const result = searchMemory(createContractRecords(), criteria, { withTotal: true });
    expect(idsOf(result.items)).toEqual(['d08', 'd05']);
    expect(result.total).toBe(3);
  });

  it('does not change the input list', () => {
    const records = createContractRecords();
    const input = [...records];
    searchMemory(input, Criteria.create<ContractRecord>({ orderBy: { age: 'desc' } }));
    expect(input).toEqual(records);
  });

  it('returns the same aggregate objects', () => {
    const records = createContractRecords();
    const criteria = Criteria.create<ContractRecord>({ where: { id: new ContractId('d02') } });
    expect(searchMemory(records, criteria).items[0]).toBe(records[1]);
  });
});
