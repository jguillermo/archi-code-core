import type { EventBase } from '../../domain/index';

export interface EventBus {
  publish(events: readonly EventBase[]): Promise<void>;
}
