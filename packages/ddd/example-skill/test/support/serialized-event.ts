import type { SerializedEvent } from '@archi-code/ddd/domain';

export function aSerializedEvent(
  eventName: string,
  fields: Record<string, unknown>,
  occurredOn = '2026-03-01T09:00:00.000Z',
): SerializedEvent {
  return { eventName, eventId: crypto.randomUUID(), occurredOn, ...fields } as SerializedEvent;
}
