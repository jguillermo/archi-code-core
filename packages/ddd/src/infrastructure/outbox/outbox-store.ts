import type { SerializedEvent } from '../../domain/index';

export interface OutboxEntry {
  readonly sequence: number;
  readonly event: SerializedEvent;
}

export interface OutboxStore {
  pending(limit: number): Promise<readonly OutboxEntry[]>;
  markPublished(entries: readonly OutboxEntry[]): Promise<void>;
  markFailed(entry: OutboxEntry): Promise<number>;
  park(entry: OutboxEntry): Promise<void>;
}
