import { AccountId } from './types/account-id';
import { AccountName } from './types/account-name';
import { AccountType } from './types/account-type';
import { AccountCurrency } from './types/account-currency';
import { AccountBalance } from './types/account-balance';
import { AccountFinancialEntity } from './types/account-financial-entity';
import { AccountNumber } from './types/account-number';
import { AggregateTypes, CreatedAt, DataTypes, UpdatedAt } from '@code-core/domain';
import { AccountListTag } from './types/account-list-tag';
import { AccountStatus } from './types/account-status';

export class AccountTypes extends AggregateTypes {
  public readonly id: AccountId;
  public readonly name: AccountName;
  public readonly type: AccountType;
  public readonly currency: AccountCurrency;
  public readonly balance: AccountBalance;
  public readonly financialEntity: AccountFinancialEntity;
  public readonly number: AccountNumber;
  public readonly tags: AccountListTag;
  public readonly creationDate: CreatedAt;
  public readonly lastUpdated: UpdatedAt;
  public readonly status: AccountStatus;

  constructor(currentLevel: number, params: DataTypes<AccountTypes>) {
    super(currentLevel);
    this.id = this.initializeType(AccountId, params.id);
    this.name = this.initializeType(AccountName, params.name);
    this.type = this.initializeType(AccountType, params.type);
    this.currency = this.initializeType(AccountCurrency, params.currency);
    this.balance = this.initializeType(AccountBalance, params.balance);
    this.financialEntity = this.initializeType(AccountFinancialEntity, params.financialEntity);
    this.number = this.initializeType(AccountNumber, params.number);
    this.tags = this.initializeType(AccountListTag, params.tags);
    this.creationDate = CreatedAt.now();
    this.lastUpdated = UpdatedAt.now();
    this.status = AccountStatus.active();
  }
}
