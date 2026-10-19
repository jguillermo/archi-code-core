import type { TransactionRunner } from '../../application/index';
import type { TransactionParticipant } from './transaction-participant';

export class InMemoryTransactionRunner implements TransactionRunner {
  private depth = 0;
  private commits = 0;
  private rollbacks = 0;

  constructor(private readonly participants: readonly TransactionParticipant[] = []) {}

  get committed(): number {
    return this.commits;
  }

  get rolledBack(): number {
    return this.rollbacks;
  }

  async run<Result>(work: () => Promise<Result>): Promise<Result> {
    if (this.depth > 0) {
      return work();
    }
    const restores = this.participants.map((participant) => participant.snapshot());
    this.depth += 1;
    try {
      const result = await work();
      this.commits += 1;
      return result;
    } catch (error) {
      restores.reverse().forEach((restore) => restore());
      this.rollbacks += 1;
      throw error;
    } finally {
      this.depth -= 1;
    }
  }
}
