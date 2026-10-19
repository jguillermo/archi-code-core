import { ListensTo } from '../../application/index';
import type { EventListener, TransactionRunner } from '../../application/index';
import type { EventBase } from '../../domain/index';
import type { InboxStore } from '../inbox/inbox-store';

export interface IdempotentDelivery {
  readonly inbox: InboxStore;
  readonly transactions: TransactionRunner;
}

export class EventDispatcher<Event extends EventBase = EventBase> {
  private readonly listeners = new Map<string, EventListener<any>[]>();

  constructor(
    listeners: readonly EventListener<any>[] = [],
    private readonly idempotent?: IdempotentDelivery,
  ) {
    listeners.forEach((listener) => this.add(listener));
  }

  add(listener: EventListener<any>): this {
    const eventName = ListensTo.eventOf(listener);
    this.listeners.set(eventName, [...this.listenersOf(eventName), listener]);
    return this;
  }

  listenersOf(eventName: string): readonly EventListener<any>[] {
    return this.listeners.get(eventName) ?? [];
  }

  async dispatch(event: Event): Promise<void> {
    for (const listener of this.listenersOf(event.eventName())) {
      await this.deliver(listener, event);
    }
  }

  private async deliver(listener: EventListener<any>, event: Event): Promise<void> {
    if (this.idempotent === undefined) {
      await listener.handle(event);
      return;
    }
    const { inbox, transactions } = this.idempotent;
    await transactions.run(async () => {
      if (await inbox.markProcessed(listener.constructor.name, event.eventId)) {
        await listener.handle(event);
      }
    });
  }
}
