import { UnknownEventException } from '../../exceptions/index';
import type { EventBase } from '../../domain/index';
import type { EventListener } from './event-listener';
import { ListensTo } from './listens-to';
import type { EventBus } from './event-bus';
import type { EventChannel } from './event-channel';
import type { EventSubscriber, Subscription } from './event-subscriber';
import type { EventRegistry } from './event-registry';
import { Frozen } from './frozen';

export class DomainEventBus<Event extends EventBase = EventBase>
  implements EventBus<Event>, EventSubscriber<Event>
{
  constructor(
    private readonly channel: EventChannel,
    private readonly registry: EventRegistry<Event>,
  ) {}

  async publish(events: readonly Event[]): Promise<void> {
    const serialized = events.map((event) => Frozen.deep(event).toJSON());
    await this.channel.send(serialized);
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
