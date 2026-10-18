import { ApplicationException } from '../../exceptions/index';
import type { EventBase, EventClass } from '../../domain/index';
import type { EventListener } from './event-listener';

type ListenerClass<Event extends EventBase> = abstract new (...args: any[]) => EventListener<Event>;

const LISTENED_EVENT = Symbol.for('@archi-code/ddd/listens-to.v1');

export function ListensTo<Event extends EventBase>(event: EventClass<Event>) {
  return (listener: ListenerClass<Event>): void => {
    if (Object.prototype.hasOwnProperty.call(listener, LISTENED_EVENT)) {
      throw new ApplicationException(`${listener.name} already listens to an event`);
    }
    Object.defineProperty(listener, LISTENED_EVENT, { value: event.eventName });
  };
}

ListensTo.eventOf = (listener: EventListener<any>): string => {
  const listenerClass = listener.constructor;
  if (!Object.prototype.hasOwnProperty.call(listenerClass, LISTENED_EVENT)) {
    throw new ApplicationException(`${listenerClass.name} needs @ListensTo(<event class>)`);
  }
  return (listenerClass as unknown as Record<symbol, string>)[LISTENED_EVENT];
};
