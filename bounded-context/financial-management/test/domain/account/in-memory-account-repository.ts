import { Account, AccountRepository } from '../../../src';
import { PrimitiveTypes } from '@code-core/domain';
import { AccountTypes } from '../../../src/domain/account/account.types';
import { EphemeraDb } from '@code-core/ephemeradb';

export class InMemoryAccountRepository extends AccountRepository {
  private db = new EphemeraDb<PrimitiveTypes<AccountTypes>>();

  async findAll(): Promise<Account[]> {
    const rs = await this.db.findAll();
    return rs.map((r) => this.toAggregate(r));
  }

  async findById(accountId: string): Promise<Account | null> {
    const rs = await this.db.findById(accountId);
    return rs ? this.toAggregate(rs) : null;
  }

  async findLiabilities(): Promise<Account[]> {
    const rs = await this.db.findAll();
    return rs.map((a) => this.toAggregate(a));
  }

  async persist(account: Account): Promise<void> {
    await this.db.persist(account.toJson());
  }
}
