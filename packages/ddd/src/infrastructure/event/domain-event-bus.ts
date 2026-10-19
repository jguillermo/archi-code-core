import { UnknownEventException } from '../../exceptions/index';
import type { EventBase } from '../../domain/index';
import { ListensTo } from '../../application/index';
import type { EventBus, EventListener } from '../../application/index';
import type { EventChannel } from './event-channel';
import type { EventRegistry } from './event-registry';

export interface Subscription {
  unsubscribe(): Promise<void>;
}

export class DomainEventBus<Event extends EventBase = EventBase> implements EventBus<Event> {
  constructor(
    private readonly channel: EventChannel,
    private readonly registry: EventRegistry<Event>,
  ) {}

  async publish(events: readonly Event[]): Promise<void> {
    await this.channel.send(events.map((event) => event.toJSON()));
  }

  async subscribe(listener: EventListener<Event>): Promise<Subscription> {
    const { eventName, consumer } = ListensTo.subscriptionOf(listener);
    if (!this.registry.has(eventName)) {
      throw new UnknownEventException(eventName);
    }
    const subscription = await this.channel.receive(eventName, consumer, async (serialized) =>
      listener.handle(this.registry.fromJSON(serialized)),
    );
    return { unsubscribe: () => subscription.close() };
  }
}
