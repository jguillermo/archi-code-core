import type { SerializedEvent } from '../../domain/index';

export type ChannelHandler = (event: SerializedEvent) => Promise<void>;

export interface ChannelSubscription {
  close(): Promise<void>;
}

export interface EventChannel {
  send(events: readonly SerializedEvent[]): Promise<void>;
  receive(
    eventName: string,
    consumer: string,
    handler: ChannelHandler,
  ): Promise<ChannelSubscription>;
}
