import type { EventBus } from '../../application/index';
import type { EventBase, SerializedEvent } from '../../domain/index';
import { Frozen } from '../event/frozen';
import type { TransactionParticipant } from '../transaction/transaction-participant';
import type { OutboxEntry, OutboxStore } from './outbox-store';

type EntryState = 'pending' | 'published' | 'parked';

interface StoredEntry extends OutboxEntry {
  readonly state: EntryState;
  readonly attempts: number;
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
        event: Frozen.deep(JSON.parse(JSON.stringify(Frozen.deep(event))) as SerializedEvent),
        state: 'pending' as const,
        attempts: 0,
      });
    });
    this.entries = [...this.entries, ...stored];
  }

  async pending(limit: number): Promise<readonly OutboxEntry[]> {
    return this.inState('pending').slice(0, limit);
  }

  async parked(): Promise<readonly OutboxEntry[]> {
    return this.inState('parked');
  }

  async markPublished(entries: readonly OutboxEntry[]): Promise<void> {
    const sequences = new Set(entries.map((entry) => entry.sequence));
    this.update((entry) =>
      sequences.has(entry.sequence) ? { ...entry, state: 'published' } : entry,
    );
  }

  async markFailed(failed: OutboxEntry): Promise<number> {
    this.update((entry) =>
      entry.sequence === failed.sequence ? { ...entry, attempts: entry.attempts + 1 } : entry,
    );
    return this.entries.find((entry) => entry.sequence === failed.sequence)?.attempts ?? 0;
  }

  async park(parked: OutboxEntry): Promise<void> {
    this.update((entry) =>
      entry.sequence === parked.sequence ? { ...entry, state: 'parked' } : entry,
    );
  }

  snapshot(): () => void {
    const { entries, lastSequence } = this;
    return () => {
      this.entries = entries;
      this.lastSequence = lastSequence;
    };
  }

  private inState(state: EntryState): readonly OutboxEntry[] {
    return this.entries
      .filter((entry) => entry.state === state)
      .map(({ sequence, event }) => Object.freeze({ sequence, event }));
  }

  private update(change: (entry: StoredEntry) => StoredEntry): void {
    this.entries = this.entries.map((entry) => Object.freeze(change(entry)));
  }
}
