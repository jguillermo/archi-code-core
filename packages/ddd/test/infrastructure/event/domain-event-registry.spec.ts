import { describe, expect, it } from 'vitest';
import { EventBase } from '../../../src/domain/index';
import {
  ExceptionCode,
  InfrastructureException,
  InternalErrorException,
  UnknownEventException,
} from '../../../src/exceptions/index';
import type { EventMetadata, SerializedEvent } from '../../../src/domain/index';
import { DomainEventRegistry } from '../../../src/infrastructure/event/domain-event-registry';

class OrderPlaced extends EventBase {
  static readonly eventName = 'order.placed';

  constructor(
    orderId: string,
    readonly customer: string,
    metadata?: EventMetadata,
  ) {
    super(orderId, metadata);
  }
}

class OrderShipped extends EventBase {
  static readonly eventName = 'order.shipped';

  constructor(
    orderId: string,
    readonly carrier: string,
    metadata?: EventMetadata,
  ) {
    super(orderId, metadata);
  }
}

type OrderEvent = OrderPlaced | OrderShipped;

const orderId = '9b2f6c1e-4d3a-4f8b-a1c2-3e4d5f6a7b8c';
const eventId = '1d2e3f4a-5b6c-4d7e-8f9a-0b1c2d3e4f5a';

function orderEvents() {
  return new DomainEventRegistry<OrderEvent>()
    .register(OrderPlaced, (e) => new OrderPlaced(e.aggregateId, e.customer as string, e))
    .register(OrderShipped, (e) => new OrderShipped(e.aggregateId, e.carrier as string, e));
}

describe('DomainEventRegistry: rebuilding events read from an outbox or a broker', () => {
  it('an outbox worker rebuilds the event from the JSON row it stored', () => {
    const recorded = new OrderPlaced(orderId, 'Ana', {
      eventId,
      occurredOn: '2026-03-01T09:30:00Z',
    });
    const row = JSON.stringify(recorded);
    const rebuilt = orderEvents().fromJSON(row);
    expect(rebuilt).toBeInstanceOf(OrderPlaced);
    expect(rebuilt).toMatchObject({ eventId, aggregateId: orderId, customer: 'Ana' });
    expect(rebuilt.occurredOn.toISOString()).toBe('2026-03-01T09:30:00.000Z');
    expect(JSON.stringify(rebuilt)).toBe(row);
  });

  it('a broker consumer rebuilds the event from the parsed message body', () => {
    const body: SerializedEvent = {
      eventName: 'order.shipped',
      eventId,
      aggregateId: orderId,
      occurredOn: '2026-03-02T10:00:00.000Z',
      carrier: 'SEUR',
    };
    const rebuilt = orderEvents().fromJSON(body);
    expect(rebuilt).toBeInstanceOf(OrderShipped);
    expect(rebuilt).toMatchObject({ eventId, carrier: 'SEUR' });
  });

  it('registers each event by its class, under its static eventName', () => {
    const registry = new DomainEventRegistry<OrderEvent>().register(
      OrderShipped,
      (e) => new OrderShipped(e.aggregateId, e.carrier as string, e),
    );
    expect(registry.has(OrderShipped.eventName)).toBe(true);
    expect(registry.has('OrderShipped')).toBe(false);
  });

  it('registers events one after another in a single expression', () => {
    const registry = new DomainEventRegistry();
    expect(registry.register(OrderPlaced, (e) => new OrderPlaced(e.aggregateId, 'x'))).toBe(
      registry,
    );
  });

  it('tells which events it can rebuild', () => {
    const registry = orderEvents();
    expect(registry.has('order.placed')).toBe(true);
    expect(registry.has('order.cancelled')).toBe(false);
  });

  it('refuses to register the same event twice, a wiring mistake at start-up', () => {
    const register = () =>
      orderEvents().register(OrderPlaced, (e) => new OrderPlaced(e.aggregateId, 'x'));
    expect(register).toThrow(InfrastructureException);
    expect(register).toThrow('Event "order.placed" is already registered.');
  });

  it('refuses an event it does not know with UnknownEventException', () => {
    const read = () =>
      orderEvents().fromJSON({
        eventName: 'order.cancelled',
        eventId,
        aggregateId: orderId,
        occurredOn: '2026-03-02T10:00:00.000Z',
      });
    expect(read).toThrow(UnknownEventException);
    expect(read).toThrow('Unknown event "order.cancelled": register it before reading it.');
    try {
      read();
    } catch (error) {
      expect((error as UnknownEventException).code).toBe(ExceptionCode.UnknownEvent);
      expect((error as UnknownEventException).code).toBe('INF002');
    }
  });

  it.each([
    ['without an event name', '{"aggregateId":"x"}'],
    ['whose event name is not text', '{"eventName":42,"aggregateId":"x"}'],
  ])('refuses a message %s, saying what is missing', (_, message) => {
    expect(() => orderEvents().fromJSON(message)).toThrow(InternalErrorException);
    expect(() => orderEvents().fromJSON(message)).toThrow(
      'Failed, internal error: a serialized event needs its eventName',
    );
  });

  it('refuses a corrupt row, keeping the parse error as cause', () => {
    try {
      orderEvents().fromJSON('{"eventName":');
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(InternalErrorException);
      expect((error as InternalErrorException).message).toBe(
        'Failed, internal error: a serialized event is not valid JSON',
      );
      expect((error as InternalErrorException).cause).toBeInstanceOf(SyntaxError);
    }
  });

  it.each([
    ['null', 'null'],
    ['a number', '42'],
    ['a string', '"order.placed"'],
  ])('refuses a message whose JSON is %s', (_, text) => {
    const read = () => orderEvents().fromJSON(text);
    expect(read).toThrow(InternalErrorException);
    expect(read).toThrow('Failed, internal error: a serialized event must be a JSON object');
  });

  it('propagates the error of a factory that rejects the stored data', () => {
    expect(() =>
      orderEvents().fromJSON({
        eventName: 'order.placed',
        eventId: 'not-an-id',
        aggregateId: orderId,
        occurredOn: '2026-03-01T09:30:00Z',
        customer: 'Ana',
      }),
    ).toThrow('Validation Error: Expected a valid UUID, but received "not-an-id".');
  });
});
