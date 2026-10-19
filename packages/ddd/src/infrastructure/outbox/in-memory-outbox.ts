import type { EventBus } from '../../application/index';
import type { EventBase, SerializedEvent } from '../../domain/index';
import type { TransactionParticipant } from '../transaction/transaction-participant';
import type { OutboxEntry, OutboxStore } from './outbox-store';

interface StoredEntry extends OutboxEntry {
  readonly published: boolean;
}

export class InMemoryOutbox<Event extends EventBase = EventBase>
  implements EventBus<Event>, OutboxStore, TransactionParticipant
{
  private entries: readonly StoredEntry[] = [];
  private lastSequence = 0;

  async publish(events: readonly Event[]): Promise<void> {
    const stored = events.map((event) => {
      this.lastSequence += 1;
      return Object.freeze({
        sequence: this.lastSequence,
        event: Object.freeze(JSON.parse(JSON.stringify(event)) as SerializedEvent),
        published: false,
      });
    });
    this.entries = [...this.entries, ...stored];
  }

  async pending(limit: number): Promise<readonly OutboxEntry[]> {
    return this.entries
      .filter((entry) => !entry.published)
      .slice(0, limit)
      .map(({ sequence, event }) => Object.freeze({ sequence, event }));
  }

  async markPublished(entries: readonly OutboxEntry[]): Promise<void> {
    const sequences = new Set(entries.map((entry) => entry.sequence));
    this.entries = this.entries.map((entry) =>
      sequences.has(entry.sequence) ? Object.freeze({ ...entry, published: true }) : entry,
    );
  }

  snapshot(): () => void {
    const { entries, lastSequence } = this;
    return () => {
      this.entries = entries;
      this.lastSequence = lastSequence;
    };
  }
}
