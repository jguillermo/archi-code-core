import { describe, expect, expectTypeOf, it } from 'vitest';
import type { TransactionRunner } from '../../../src/application/ports/transaction-runner';

class RecordingTransactions implements TransactionRunner {
  readonly log: string[] = [];

  async run<Result>(work: () => Promise<Result>): Promise<Result> {
    this.log.push('BEGIN');
    try {
      const result = await work();
      this.log.push('COMMIT');
      return result;
    } catch (error) {
      this.log.push('ROLLBACK');
      throw error;
    }
  }
}

describe('TransactionRunner: the port a use case opens its transaction with', () => {
  it('only requires run(work), which resolves to what the work returns', () => {
    expectTypeOf<TransactionRunner['run']>().toEqualTypeOf<
      <Result>(work: () => Promise<Result>) => Promise<Result>
    >();
  });

  it('lets an adapter commit the work of a use case, or roll it back when it fails', async () => {
    const transactions = new RecordingTransactions();
    expect(await transactions.run(async () => 'order-1')).toBe('order-1');
    await expect(
      transactions.run(async () => {
        throw new Error('payment declined');
      }),
    ).rejects.toThrow('payment declined');
    expect(transactions.log).toEqual(['BEGIN', 'COMMIT', 'BEGIN', 'ROLLBACK']);
  });
});
