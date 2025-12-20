import { beforeEach, describe, expect, test } from '@jest/globals';
import { JsonCompare } from '@code-core/test';
import { InMemoryAccountRepository } from './in-memory-account-repository';
import { AccountObjectMother } from '../../object-mother/account-object-mother';

describe('InMemoryAccountRepository', () => {
  let repo: InMemoryAccountRepository;

  beforeEach(() => {
    repo = new InMemoryAccountRepository();
  });

  test('Should persist a new account correctly', async () => {
    const account = AccountObjectMother();
    await repo.persist(account);
    const foundAccount = await repo.findById(account.id.value);
    expect(JsonCompare.strict(account.toJson(), foundAccount?.toJson())).toEqual([]);
  });
});
