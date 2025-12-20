import { TransactionId } from './types/transaction-id';
import { TransactionDate } from './types/transaction-date';
import { TransactionAccountId } from './types/transaction-account-id';
import { TransactionAmount } from './types/transaction-amount';
import { TransactionDescription } from './types/transaction-description';
import { TransactionCategory } from './types/transaction-category';
import { TransactionListTag } from './types/transaction-list-tag';
import { AggregateTypes, DataTypes } from '@code-core/domain';

export class TransactionTypes extends AggregateTypes {
  public readonly id: TransactionId;
  public readonly transactionDate: TransactionDate;
  public readonly fromAccountId: TransactionAccountId;
  public readonly toAccountId: TransactionAccountId;
  public readonly amount: TransactionAmount;
  public readonly description: TransactionDescription;
  public readonly category: TransactionCategory;
  public readonly tags: TransactionListTag;

  constructor(currentLevel: number, params: DataTypes<TransactionTypes>) {
    super(currentLevel);
    this.id = this.initializeType(TransactionId, params.id);
    this.transactionDate = this.initializeType(TransactionDate, params.transactionDate);
    this.fromAccountId = this.initializeType(TransactionAccountId, params.fromAccountId);
    this.toAccountId = this.initializeType(TransactionAccountId, params.toAccountId);
    this.amount = this.initializeType(TransactionAmount, params.amount);
    this.description = this.initializeType(TransactionDescription, params.description);
    this.category = this.initializeType(TransactionCategory, params.category);
    this.tags = this.initializeType(TransactionListTag, params.tags);
  }
}
