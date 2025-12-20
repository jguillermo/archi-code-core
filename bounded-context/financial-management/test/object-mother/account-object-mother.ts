import { CreatedAt, PrimitiveTypes, UpdatedAt } from '@code-core/domain';
import { AccountTypes } from '../../src/domain/account/account.types';
import { Account } from '../../src/domain/account/account';
import { AccountId } from '../../src/domain/account/types/account-id';
import { AccountName } from '../../src/domain/account/types/account-name';
import { AccountType } from '../../src/domain/account/types/account-type';
import { AccountCurrency } from '../../src/domain/account/types/account-currency';
import { AccountBalance } from '../../src/domain/account/types/account-balance';
import { AccountFinancialEntity } from '../../src/domain/account/types/account-financial-entity';
import { AccountNumber } from '../../src/domain/account/types/account-number';
import { AccountListTag } from '../../src/domain/account/types/account-list-tag';
import { AccountStatus } from '../../src/domain/account/types/account-status';

export const AccountObjectMother = (overrides?: Partial<PrimitiveTypes<AccountTypes>>): Account => {
  return new Account(
    new AccountId(overrides?.id ?? AccountId.random()),
    new AccountName(overrides?.name ?? 'Account A'),
    new AccountType((overrides?.type as any) ?? AccountType.enum().REAL),
    new AccountCurrency((overrides?.currency as any) ?? AccountCurrency.enum().USD),
    new AccountBalance(overrides?.balance ?? 1000),
    new AccountStatus((overrides?.status as any) ?? AccountStatus.enum().ACTIVE),
    new AccountFinancialEntity(overrides?.financialEntity ?? 'Bank A'),
    new AccountNumber(overrides?.number ?? '123456'),
    new AccountListTag(overrides?.tags ?? ['saving', 'personal']),
    new CreatedAt(overrides?.creationDate ?? new Date()),
    new UpdatedAt(overrides?.creationDate ?? new Date()),
  );
};
