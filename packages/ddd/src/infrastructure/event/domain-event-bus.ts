import { ApplicationException } from '../../application/index';
import { DomainException } from '../../domain/index';
import { UnknownEventException } from '../exceptions/unknown-event.exception';
import type { EventBase, SerializedEvent } from '../../domain/index';
import { ListensTo } from '../../application/index';
import type {
  EventBus,
  EventListener,
  ListenerSubscription,
  Logger,
} from '../../application/index';
import type { EventChannel } from './event-channel';
import type { EventRegistry } from './event-registry';
import { SilentLogger } from '../logging/silent-logger';

export interface Subscription {
  unsubscribe(): Promise<void>;
}

export class DomainEventBus<Event extends EventBase = EventBase> implements EventBus<Event> {
  constructor(
    private readonly channel: EventChannel,
    private readonly registry: EventRegistry<Event>,
    private readonly logger: Logger = new SilentLogger(),
  ) {}

  async publish(events: readonly Event[]): Promise<void> {
    await this.channel.send(events.map((event: EventBase): SerializedEvent => ({ ...event })));
    this.logger.debug('domain_events_published', {
      events: events.map((event) => ({
        eventName: event.eventName,
        eventId: event.eventId,
      })),
    });
  }

  async subscribe(listener: EventListener<Event>): Promise<Subscription> {
    const subscription = ListensTo.subscriptionOf(listener);
    const { eventName, consumer } = subscription;
    if (!this.registry.has(eventName)) {
      throw new UnknownEventException(eventName);
    }
    const channelSubscription = await this.channel.receive(eventName, consumer, (serialized) =>
      this.deliver(listener, subscription, serialized),
    );
    this.logger.info('event_listener_subscribed', { eventName, consumer });
    return {
      unsubscribe: async () => {
        await channelSubscription.close();
        this.logger.info('event_listener_unsubscribed', { eventName, consumer });
      },
    };
  }

  private async deliver(
    listener: EventListener<Event>,
    { eventName, consumer }: ListenerSubscription,
    serialized: SerializedEvent,
  ): Promise<void> {
    try {
      await listener.handle(this.registry.fromJSON(serialized));
    } catch (error) {
      const context = {
        eventName,
        consumer,
        eventId: serialized.eventId,
        error,
      };
      if (error instanceof DomainException || error instanceof ApplicationException) {
        this.logger.warn('event_listener_rejected', context);
      } else {
        this.logger.error('event_listener_failed', context);
      }
      throw error;
    }
  }
}
