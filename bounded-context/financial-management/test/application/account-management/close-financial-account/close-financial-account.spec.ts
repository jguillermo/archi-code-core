import { beforeEach, describe, expect, it } from '@jest/globals';
import { DomainException } from '@code-core/domain';
import { AccountObjectMother } from '../../../object-mother/account-object-mother';
import { AccountStatus } from '../../../../src/domain/account/types/account-status';
import { AccountType } from '../../../../src/domain/account/types/account-type';
import { CloseFinancialAccount } from '../../../../src/application/account-management/close-financial-account/close-financial-account';
import { AccountRepository } from '../../../../src/domain/account/account.repository';
import { InMemoryAccountRepository } from '../../../domain/account/in-memory-account-repository';
import { CloseFinancialAccountDto } from '../../../../src/application/account-management/close-financial-account/close-financial-account.dto';
import { AccountId } from '../../../../src/domain/account/types/account-id';

describe('Account - Close', () => {
  it('should throw an error if balance is not zero', () => {
    const account = AccountObjectMother({ balance: 100 });
    expect(() => account.validateZeroBalance()).toThrow(DomainException);
  });

  it('should not throw an error if balance is zero', () => {
    const account = AccountObjectMother({ balance: 0 });

    expect(() => account.validateZeroBalance()).not.toThrow();
  });

  it('should close an account with zero balance', () => {
    const account = AccountObjectMother({ balance: 0 });
    account.close();
    const { status, lastUpdated } = account.toJson();
    expect(status).toBe(AccountStatus.enum().CLOSED);
    expect(lastUpdated).toBeInstanceOf(Date);
  });

  it('should throw an error when trying to close an account with a non-zero balance', () => {
    const account = AccountObjectMother({ balance: 50 });
    expect(() => account.close()).toThrow(DomainException);
    const { status } = account.toJson();
    expect(status).toBe(AccountStatus.enum().ACTIVE);
  });

  it('should throw an error when trying to close an already closed account', () => {
    const account = AccountObjectMother({ status: AccountStatus.enum().CLOSED, balance: 0 });

    expect(() => account.close()).toThrow(DomainException);
  });

  it('should not modify the account state if an exception is thrown during closing', () => {
    const account = AccountObjectMother({ balance: 10 });

    try {
      account.close();
    } catch (e) {
      const { status } = account.toJson();
      expect(status).toBe(AccountStatus.enum().ACTIVE);
    }
  });

  it('should update the last updated date when the account is closed', () => {
    const account = AccountObjectMother({ balance: 0 });

    const beforeClose = new Date();
    account.close();
    const { lastUpdated } = account.toJson();

    expect(lastUpdated).toBeInstanceOf(Date);
    expect(lastUpdated.getTime()).toBeGreaterThanOrEqual(beforeClose.getTime());
  });

  it('should close a virtual account with zero balance', () => {
    const account = AccountObjectMother({ type: AccountType.enum().VIRTUAL, balance: 0 });

    account.close();
    const { status } = account.toJson();
    expect(status).toBe(AccountStatus.enum().CLOSED);
  });

  it('should throw an error when trying to close a virtual account with a non-zero balance', () => {
    const account = AccountObjectMother({ type: AccountType.enum().VIRTUAL, balance: 100 });

    account.close();
    const { status } = account.toJson();
    expect(status).toBe(AccountStatus.enum().CLOSED);
  });
});

describe('CloseFinancialAccount Use Case', () => {
  let useCase: CloseFinancialAccount;
  let accountRepository: AccountRepository;

  const dtoObjectMOther = (accountId?: any): CloseFinancialAccountDto => {
    const dto = new CloseFinancialAccountDto();
    dto.accountId = accountId ?? AccountId.random();
    return dto;
  };

  beforeEach(() => {
    accountRepository = new InMemoryAccountRepository();
    useCase = new CloseFinancialAccount(accountRepository);
  });

  it('should throw an error if the account is not found', async () => {
    const dto = dtoObjectMOther('c5a2d381-8e1b-4c53-a63f-30804d03c45e');
    expect(useCase.execute(dto)).rejects.toThrow(`Account with ID c5a2d381-8e1b-4c53-a63f-30804d03c45e not found.`);
  });

  it('should throw an error if the account balance is not zero at level 1', async () => {
    const account = AccountObjectMother({ balance: 100 });
    await accountRepository.persist(account);
    const dto = dtoObjectMOther(account.id.value);
    expect(useCase.execute(dto)).rejects.toThrow('Account balance must be zero to close the account');
  });

  it('should throw an error when trying to close an already closed account', async () => {
    const account = AccountObjectMother({ status: AccountStatus.enum().CLOSED, balance: 0 });
    await accountRepository.persist(account);
    const dto = dtoObjectMOther(account.id.value);
    await expect(useCase.execute(dto)).rejects.toThrow('Account is already closed');
  });
});
