import { Account } from './account';
import { CreatedAt, PrimitiveTypes, UpdatedAt } from '@code-core/domain';
import { AccountTypes } from './account.types';
import { AccountId } from './types/account-id';
import { AccountCurrency } from './types/account-currency';
import { AccountName } from './types/account-name';
import { AccountType } from './types/account-type';
import { AccountBalance } from './types/account-balance';
import { AccountFinancialEntity } from './types/account-financial-entity';
import { AccountNumber } from './types/account-number';
import { AccountListTag } from './types/account-list-tag';
import { AccountStatus } from './types/account-status';

export abstract class AccountRepository {
  abstract findById(accountId: string): Promise<Account | null>;

  abstract persist(account: Account): Promise<void>;

  abstract findAll(): Promise<Account[]>;

  abstract findLiabilities(): Promise<Account[]>; // Para reportes financieros

  protected toAggregate(data: PrimitiveTypes<AccountTypes>): Account {
    return new Account(
      new AccountId(data.id),
      new AccountName(data.name),
      new AccountType(data.type as any),
      new AccountCurrency(data.currency as any),
      new AccountBalance(data.balance),
      new AccountStatus(data.status as any),
      new AccountFinancialEntity(data.financialEntity),
      new AccountNumber(data.number),
      new AccountListTag(data.tags),
      new CreatedAt(data.creationDate),
      new UpdatedAt(data.creationDate),
    );
  }
}
