import { ApplicationException } from '../../exceptions/index';
import type { EventBase, EventClass } from '../../domain/index';
import type { EventListener } from './event-listener';

type ListenerClass<Event extends EventBase> = abstract new (...args: any[]) => EventListener<Event>;

export interface ListensToOptions {
  readonly consumer: string;
}

export interface ListenerSubscription {
  readonly eventName: string;
  readonly consumer: string;
}

const LISTENED_EVENT = Symbol.for('@archi-code/ddd/listens-to.v1');

export function ListensTo<Event extends EventBase>(
  event: EventClass<Event>,
  options: ListensToOptions,
) {
  return (listener: ListenerClass<Event>): void => {
    if (Object.prototype.hasOwnProperty.call(listener, LISTENED_EVENT)) {
      throw new ApplicationException(`${listener.name} already listens to an event`);
    }
    const consumer = options?.consumer;
    if (typeof consumer !== 'string' || consumer.trim() === '') {
      throw new ApplicationException(
        `${listener.name} needs a consumer name: @ListensTo(<event class>, { consumer: '<name>' })`,
      );
    }
    const subscription: ListenerSubscription = Object.freeze({
      eventName: event.eventName,
      consumer,
    });
    Object.defineProperty(listener, LISTENED_EVENT, { value: subscription });
  };
}

ListensTo.subscriptionOf = (listener: EventListener<any>): ListenerSubscription => {
  const listenerClass = listener.constructor;
  if (!Object.prototype.hasOwnProperty.call(listenerClass, LISTENED_EVENT)) {
    throw new ApplicationException(
      `${listenerClass.name} needs @ListensTo(<event class>, { consumer: '<name>' })`,
    );
  }
  return (listenerClass as unknown as Record<symbol, ListenerSubscription>)[LISTENED_EVENT];
};
