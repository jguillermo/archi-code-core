import type { TransactionParticipant } from '../transaction/transaction-participant';
import type { InboxStore } from './inbox-store';

export class InMemoryInbox implements InboxStore, TransactionParticipant {
  private processed: ReadonlySet<string> = new Set();

  async markProcessed(consumer: string, eventId: string): Promise<boolean> {
    const key = `${consumer}:${eventId.toLowerCase()}`;
    if (this.processed.has(key)) {
      return false;
    }
    this.processed = new Set(Array.from(this.processed).concat(key));
    return true;
  }

  snapshot(): () => void {
    const processed = this.processed;
    return () => {
      this.processed = processed;
    };
  }
}
