import { describe, expect, it } from '@jest/globals';
import { CRITERIA_CONTRACT_CASES } from '../../src/contract/contract-cases';
import { ContractDocument } from '../../src/contract/contract-documents';
import { runCriteriaContract } from '../../src/contract/run-criteria-contract';
import { Criteria } from '../../src/criteria';
import { SearchResult } from '../../src/search-result';

function expectedResult(criteria: Criteria<ContractDocument>): SearchResult<ContractDocument> {
  const contractCase = CRITERIA_CONTRACT_CASES.find((candidate) => candidate.criteria === criteria);
  const items = (contractCase?.expectedIds ?? []).map((id) => ({ id }) as ContractDocument);
  return contractCase?.expectedTotal === undefined
    ? { items }
    : { items, total: contractCase.expectedTotal };
}

describe('runCriteriaContract', () => {
  it('passes an adapter that returns the expected documents, in any order when unordered', async () => {
    let seeded: ContractDocument[] = [];
    const failures = await runCriteriaContract({
      setup: (documents) => {
        seeded = documents;
      },
      search: async (criteria) => {
        const result = expectedResult(criteria);
        return criteria.order.length > 0
          ? result
          : { ...result, items: [...result.items].reverse() };
      },
    });
    expect(failures).toEqual([]);
    expect(seeded).toHaveLength(9);
  });

  it('reports wrong ids, wrong order, wrong totals and errors', async () => {
    const failures = await runCriteriaContract({
      setup: async () => undefined,
      search: (criteria, options) => {
        const result = expectedResult(criteria);
        const name = CRITERIA_CONTRACT_CASES.find(
          (candidate) => candidate.criteria === criteria,
        )?.name;
        if (name === 'eq on a string') {
          return { items: result.items.slice(1) };
        }
        if (name === 'order by boolean puts false first') {
          return { items: [...result.items].reverse() };
        }
        if (name === 'limit and offset') {
          return { items: result.items, total: options.withTotal ? 1 : undefined };
        }
        if (name === 'lt') {
          throw new Error('boom');
        }
        if (name === 'lte') {
          throw 'plain failure';
        }
        return result;
      },
    });
    expect(failures).toEqual([
      {
        name: 'eq on a string',
        expectedIds: ['d01', 'd04', 'd05', 'd08'],
        actualIds: ['d04', 'd05', 'd08'],
        expectedTotal: undefined,
        actualTotal: undefined,
      },
      { name: 'lt', expectedIds: ['d06'], actualIds: [], expectedTotal: undefined, error: 'boom' },
      {
        name: 'lte',
        expectedIds: ['d02', 'd06'],
        actualIds: [],
        expectedTotal: undefined,
        error: 'plain failure',
      },
      {
        name: 'order by boolean puts false first',
        expectedIds: ['d02', 'd04', 'd07', 'd01', 'd03', 'd05', 'd06', 'd08', 'd09'],
        actualIds: ['d09', 'd08', 'd06', 'd05', 'd03', 'd01', 'd07', 'd04', 'd02'],
        expectedTotal: undefined,
        actualTotal: undefined,
      },
      {
        name: 'limit and offset',
        expectedIds: ['d04', 'd05', 'd06'],
        actualIds: ['d04', 'd05', 'd06'],
        expectedTotal: 9,
        actualTotal: 1,
      },
    ]);
  });
});
