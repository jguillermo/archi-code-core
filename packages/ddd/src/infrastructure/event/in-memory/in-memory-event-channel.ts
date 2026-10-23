import type { ChannelHandler, ChannelSubscription, EventChannel } from '../event-channel';
import type { SerializedEvent } from '../../../domain/index';
import { InfrastructureException } from '../../exceptions/infrastructure.exception';
import { Emitter } from './emitter';

export interface InMemoryEventChannelOptions {
  readonly delivery?: 'serial' | 'parallel';
}

export class InMemoryEventChannel implements EventChannel {
  private readonly emitter = new Emitter<SerializedEvent>();
  private readonly receivers = new Set<string>();
  private readonly sentEvents: SerializedEvent[] = [];
  private readonly delivery: 'serial' | 'parallel';

  constructor({ delivery = 'serial' }: InMemoryEventChannelOptions = {}) {
    this.delivery = delivery;
  }

  get sent(): readonly SerializedEvent[] {
    return [...this.sentEvents];
  }

  async send(events: readonly SerializedEvent[]): Promise<void> {
    for (const event of events) {
      const copy = InMemoryEventChannel.copy(event);
      this.sentEvents.push(copy);
      if (this.delivery === 'parallel') {
        await this.emitter.emit(copy.eventName, copy);
      } else {
        await this.emitter.emitSerial(copy.eventName, copy);
      }
    }
  }

  async receive(
    eventName: string,
    consumer: string,
    handler: ChannelHandler,
  ): Promise<ChannelSubscription> {
    const receiver = JSON.stringify([eventName, consumer]);
    if (this.receivers.has(receiver)) {
      throw new InfrastructureException(
        `${consumer} already receives "${eventName}": close its subscription first.`,
      );
    }
    this.receivers.add(receiver);
    const off = this.emitter.on(eventName, (event) => handler(InMemoryEventChannel.copy(event)));
    let open = true;
    return {
      close: async () => {
        if (open) {
          open = false;
          off();
          this.receivers.delete(receiver);
        }
      },
    };
  }

  private static copy(event: SerializedEvent): SerializedEvent {
    return JSON.parse(JSON.stringify(event));
  }
}
