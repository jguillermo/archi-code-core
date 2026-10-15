import { Criteria, SearchOptions, SearchResult } from '@archi-code/criteria';
import { CRITERIA_CONTRACT_CASES } from './contract-cases';
import { ContractDocument, createContractDocuments } from './contract-documents';

export interface CriteriaContractAdapter {
  setup(documents: ContractDocument[]): Promise<void> | void;
  search(
    criteria: Criteria<ContractDocument>,
    options: SearchOptions,
  ): Promise<SearchResult<ContractDocument>> | SearchResult<ContractDocument>;
}

export interface CriteriaContractFailure {
  readonly name: string;
  readonly expectedIds: readonly string[];
  readonly actualIds: readonly string[];
  readonly expectedTotal?: number;
  readonly actualTotal?: number;
  readonly error?: string;
}

function sameIds(expected: readonly string[], actual: readonly string[]): boolean {
  return expected.length === actual.length && expected.every((id, index) => id === actual[index]);
}

export async function runCriteriaContract(
  adapter: CriteriaContractAdapter,
): Promise<CriteriaContractFailure[]> {
  await adapter.setup(createContractDocuments());
  const failures: CriteriaContractFailure[] = [];
  for (const contractCase of CRITERIA_CONTRACT_CASES) {
    const { name, criteria, expectedTotal } = contractCase;
    const ordered = criteria.order.length > 0;
    const expectedIds = ordered ? contractCase.expectedIds : [...contractCase.expectedIds].sort();
    try {
      const result = await adapter.search(criteria, { withTotal: expectedTotal !== undefined });
      const ids = result.items.map((item) => item.id);
      const actualIds = ordered ? ids : [...ids].sort();
      if (!sameIds(expectedIds, actualIds) || result.total !== expectedTotal) {
        failures.push({ name, expectedIds, actualIds, expectedTotal, actualTotal: result.total });
      }
    } catch (error) {
      failures.push({
        name,
        expectedIds,
        actualIds: [],
        expectedTotal,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return failures;
}
