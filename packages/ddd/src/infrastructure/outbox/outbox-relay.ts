import type { SerializedEvent } from '../../domain/index';
import { InfrastructureException } from '../../exceptions/index';
import type { OutboxEntry, OutboxStore } from './outbox-store';

export type OutboxDelivery = (event: SerializedEvent, sequence: number) => Promise<void> | void;

export type ParkedDelivery = (
  event: SerializedEvent,
  error: unknown,
  sequence: number,
) => Promise<void> | void;

export interface OutboxRelayOptions {
  readonly maxAttempts?: number;
  readonly onParked?: ParkedDelivery;
}

export class OutboxRelay {
  private readonly maxAttempts: number;
  private readonly onParked: ParkedDelivery;

  constructor(
    private readonly store: OutboxStore,
    private readonly deliver: OutboxDelivery,
    { maxAttempts = 5, onParked = () => undefined }: OutboxRelayOptions = {},
  ) {
    if (!Number.isSafeInteger(maxAttempts) || maxAttempts < 1) {
      throw new InfrastructureException(
        `OutboxRelay needs maxAttempts as a whole number from 1, got ${String(maxAttempts)}.`,
      );
    }
    this.maxAttempts = maxAttempts;
    this.onParked = onParked;
  }

  async forward(limit = 100): Promise<number> {
    const delivered: OutboxEntry[] = [];
    try {
      for (const entry of await this.store.pending(limit)) {
        if (await this.tryToDeliver(entry)) {
          delivered.push(entry);
        }
      }
    } finally {
      if (delivered.length > 0) {
        await this.store.markPublished(delivered);
      }
    }
    return delivered.length;
  }

  private async tryToDeliver(entry: OutboxEntry): Promise<boolean> {
    try {
      await this.deliver(entry.event, entry.sequence);
      return true;
    } catch (error) {
      if ((await this.store.markFailed(entry)) < this.maxAttempts) {
        throw error;
      }
      await this.store.park(entry);
      await this.onParked(entry.event, error, entry.sequence);
      return false;
    }
  }
}
