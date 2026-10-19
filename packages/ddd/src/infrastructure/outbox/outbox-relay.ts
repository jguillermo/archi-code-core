import type { SerializedEvent } from '../../domain/index';
import type { OutboxEntry, OutboxStore } from './outbox-store';

export type OutboxDelivery = (event: SerializedEvent, sequence: number) => Promise<void> | void;

export class OutboxRelay {
  constructor(
    private readonly store: OutboxStore,
    private readonly deliver: OutboxDelivery,
  ) {}

  async forward(limit = 100): Promise<number> {
    const delivered: OutboxEntry[] = [];
    try {
      for (const entry of await this.store.pending(limit)) {
        await this.deliver(entry.event, entry.sequence);
        delivered.push(entry);
      }
    } finally {
      if (delivered.length > 0) {
        await this.store.markPublished(delivered);
      }
    }
    return delivered.length;
  }
}
