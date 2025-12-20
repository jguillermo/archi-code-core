import { Transaction } from './transaction';

export abstract class TransactionRepository {
  abstract persist(transaction: Transaction): void;

  abstract findById(transactionId: string): Transaction | null;

  abstract findAllByAccount(accountId: string): Transaction[];
}
