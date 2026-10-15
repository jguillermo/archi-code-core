import { describe, expect, it } from '@jest/globals';
import { Criteria } from '@archi-code/criteria';
import { CRITERIA_CONTRACT_CASES } from './contract-cases';
import { ContractDocument, createContractDocuments } from './contract-documents';

describe('CRITERIA_CONTRACT_CASES', () => {
  it('has unique names and only ids of the contract documents', () => {
    const ids = new Set(createContractDocuments().map((document) => document.id));
    const names = CRITERIA_CONTRACT_CASES.map((contractCase) => contractCase.name);
    expect(new Set(names).size).toBe(names.length);
    for (const contractCase of CRITERIA_CONTRACT_CASES) {
      expect(contractCase.expectedIds.every((id) => ids.has(id))).toBe(true);
    }
  });

  it.each(
    CRITERIA_CONTRACT_CASES.map((contractCase) => ({ name: contractCase.name, contractCase })),
  )('survives the URL round trip: $name', ({ contractCase }) => {
    const restored = Criteria.fromUrl<ContractDocument>(contractCase.criteria.toUrl());
    expect(restored.filter).toEqual(contractCase.criteria.filter);
    expect(restored.order).toEqual(contractCase.criteria.order);
    expect(restored.pagination).toEqual(contractCase.criteria.pagination);
  });

  it('returns new documents on every call', () => {
    const first = createContractDocuments();
    expect(createContractDocuments()).toEqual(first);
    expect(createContractDocuments()[0]).not.toBe(first[0]);
  });
});
