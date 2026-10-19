import { describe, expect, expectTypeOf, it } from 'vitest';
import type { TransactionParticipant } from '../../../src/infrastructure/transaction/transaction-participant';

class StockLedger implements TransactionParticipant {
  units = 10;

  snapshot(): () => void {
    const units = this.units;
    return () => {
      this.units = units;
    };
  }
}

describe('TransactionParticipant: an in-memory adapter that can undo a failed transaction', () => {
  it('only requires snapshot(), which returns how to restore that moment', () => {
    expectTypeOf<TransactionParticipant>().toEqualTypeOf<{ snapshot(): () => void }>();
  });

  it('restores the state it had when the snapshot was taken', () => {
    const ledger = new StockLedger();
    const restore = ledger.snapshot();
    ledger.units -= 3;
    restore();
    expect(ledger.units).toBe(10);
  });
});
