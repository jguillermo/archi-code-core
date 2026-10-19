import { AsyncLocalStorage } from 'node:async_hooks';
import type { TransactionRunner } from '../../application/index';
import type { TransactionParticipant } from './transaction-participant';

export class InMemoryTransactionRunner implements TransactionRunner {
  private readonly open = new AsyncLocalStorage<true>();
  private turn: Promise<unknown> = Promise.resolve();
  private commits = 0;
  private rollbacks = 0;

  constructor(private readonly participants: readonly TransactionParticipant[] = []) {}

  get committed(): number {
    return this.commits;
  }

  get rolledBack(): number {
    return this.rollbacks;
  }

  run<Result>(work: () => Promise<Result>): Promise<Result> {
    if (this.open.getStore() === true) {
      return work();
    }
    const transaction = this.turn.then(() => this.runAlone(work));
    this.turn = transaction.catch(() => undefined);
    return transaction;
  }

  private async runAlone<Result>(work: () => Promise<Result>): Promise<Result> {
    const restores = this.participants.map((participant) => participant.snapshot());
    try {
      const result = await this.open.run(true, work);
      this.commits += 1;
      return result;
    } catch (error) {
      restores.reverse().forEach((restore) => restore());
      this.rollbacks += 1;
      throw error;
    }
  }
}
