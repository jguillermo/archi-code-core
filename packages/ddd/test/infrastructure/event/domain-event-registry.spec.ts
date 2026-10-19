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
  static readonly eventName = 'OrderPlaced';

  constructor(
    orderId: string,
    readonly customer: string,
    metadata?: EventMetadata,
  ) {
    super(orderId, metadata);
  }
}

class OrderShipped extends EventBase {
  static readonly eventName = 'OrderShipped';

  constructor(
    orderId: string,
    readonly carrier: string,
    metadata?: EventMetadata,
  ) {
    super(orderId, metadata);
  }
}

class OrderLinesChanged extends EventBase {
  static readonly eventName = 'OrderLinesChanged';

  constructor(
    orderId: string,
    readonly lines: { sku: string; units: number }[],
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
      eventName: 'OrderShipped',
      eventVersion: 1,
      eventId,
      aggregateId: orderId,
      occurredOn: '2026-03-02T10:00:00.000Z',
      carrier: 'SEUR',
    };
    const rebuilt = orderEvents().fromJSON(body);
    expect(rebuilt).toBeInstanceOf(OrderShipped);
    expect(rebuilt).toMatchObject({ eventId, carrier: 'SEUR' });
  });

  it('gives listeners an immutable fact, down to the lines it carries', () => {
    const changed = new DomainEventRegistry<OrderLinesChanged>()
      .register(
        OrderLinesChanged,
        (e) => new OrderLinesChanged(e.aggregateId, e.lines as { sku: string; units: number }[], e),
      )
      .fromJSON(
        JSON.stringify(
          new OrderLinesChanged(orderId, [{ sku: 'TORCH-01', units: 2 }], { eventId }),
        ),
      );
    expect(Object.isFrozen(changed)).toBe(true);
    expect(Object.isFrozen(changed.lines)).toBe(true);
    expect(() => {
      changed.lines[0].units = 5;
    }).toThrow(TypeError);
    expect(changed.lines).toEqual([{ sku: 'TORCH-01', units: 2 }]);
  });

  it('registers each event by its class, under its static eventName', () => {
    const registry = new DomainEventRegistry<OrderEvent>().register(
      OrderShipped,
      (e) => new OrderShipped(e.aggregateId, e.carrier as string, e),
    );
    expect(registry.has(OrderShipped.eventName)).toBe(true);
    expect(registry.has('order.shipped')).toBe(false);
  });

  it('keeps reading stored events after the class is renamed in code, by their eventName', () => {
    class OrderDispatched extends EventBase {
      static readonly eventName = 'OrderShipped';
    }
    const registry = new DomainEventRegistry().register(
      OrderDispatched,
      (e) => new OrderDispatched(e.aggregateId, e),
    );
    expect(registry.has('OrderShipped')).toBe(true);
    expect(registry.has('OrderDispatched')).toBe(false);
  });

  it('registers events one after another in a single expression', () => {
    const registry = new DomainEventRegistry();
    expect(registry.register(OrderPlaced, (e) => new OrderPlaced(e.aggregateId, 'x'))).toBe(
      registry,
    );
  });

  it('tells which events it can rebuild', () => {
    const registry = orderEvents();
    expect(registry.has('OrderPlaced')).toBe(true);
    expect(registry.has('OrderCancelled')).toBe(false);
  });

  it('refuses to register the same event twice, a wiring mistake at start-up', () => {
    const register = () =>
      orderEvents().register(OrderPlaced, (e) => new OrderPlaced(e.aggregateId, 'x'));
    expect(register).toThrow(InfrastructureException);
    expect(register).toThrow('Event "OrderPlaced" is already registered.');
  });

  it('refuses an event it does not know with UnknownEventException', () => {
    const read = () =>
      orderEvents().fromJSON({
        eventName: 'OrderCancelled',
        eventVersion: 1,
        eventId,
        aggregateId: orderId,
        occurredOn: '2026-03-02T10:00:00.000Z',
      });
    expect(read).toThrow(UnknownEventException);
    expect(read).toThrow('Unknown event "OrderCancelled": register it before reading it.');
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
    ['a string', '"OrderPlaced"'],
  ])('refuses a message whose JSON is %s', (_, text) => {
    const read = () => orderEvents().fromJSON(text);
    expect(read).toThrow(InternalErrorException);
    expect(read).toThrow('Failed, internal error: a serialized event must be a JSON object');
  });

  it('refuses a factory that drops the eventId, because the inbox could not skip a redelivery', () => {
    const forgetful = new DomainEventRegistry<OrderEvent>().register(
      OrderShipped,
      (e) => new OrderShipped(e.aggregateId, e.carrier as string),
    );
    const delivered = new OrderShipped(orderId, 'UPS', {
      eventId,
      occurredOn: '2026-03-01T09:30:00Z',
    });

    const rebuild = () => forgetful.fromJSON(delivered.toJSON());
    expect(rebuild).toThrow(InternalErrorException);
    expect(rebuild).toThrow(
      'the factory of "OrderShipped" must pass the serialized event as metadata, so it keeps its eventId and occurredOn',
    );
  });

  it('refuses a factory that keeps the eventId but stamps a new occurredOn', () => {
    const restamping = new DomainEventRegistry<OrderEvent>().register(
      OrderShipped,
      (e) => new OrderShipped(e.aggregateId, e.carrier as string, { eventId: e.eventId }),
    );
    const delivered = new OrderShipped(orderId, 'UPS', {
      eventId,
      occurredOn: '2026-03-01T09:30:00Z',
    });

    expect(() => restamping.fromJSON(delivered.toJSON())).toThrow(InternalErrorException);
  });

  it('accepts the same identity written by another producer: upper case id, time without milliseconds', () => {
    const rebuilt = orderEvents().fromJSON({
      eventName: 'OrderShipped',
      eventVersion: 1,
      eventId: eventId.toUpperCase(),
      aggregateId: orderId,
      occurredOn: '2026-03-01T10:30:00+01:00',
      carrier: 'UPS',
    });
    expect(rebuilt.eventId).toBe(eventId);
    expect(rebuilt.occurredOn.toISOString()).toBe('2026-03-01T09:30:00.000Z');
  });

  it('propagates the error of a factory that rejects the stored data', () => {
    expect(() =>
      orderEvents().fromJSON({
        eventName: 'OrderPlaced',
        eventVersion: 1,
        eventId: 'not-an-id',
        aggregateId: orderId,
        occurredOn: '2026-03-01T09:30:00Z',
        customer: 'Ana',
      }),
    ).toThrow('Validation Error: Expected a valid UUID, but received "not-an-id".');
  });

  it('hands the stored version to the factory, so a consumer can read an older shape', () => {
    class CustomerRenamed extends EventBase {
      static readonly eventName = 'CustomerRenamed';
      static readonly eventVersion = 2;

      constructor(
        customerId: string,
        readonly givenName: string,
        readonly familyName: string,
        metadata?: EventMetadata,
      ) {
        super(customerId, metadata);
      }
    }
    const registry = new DomainEventRegistry<CustomerRenamed>().register(
      CustomerRenamed,
      (json) => {
        if (json.eventVersion === 1) {
          const [givenName, ...rest] = String(json.name).split(' ');
          return new CustomerRenamed(json.aggregateId, givenName, rest.join(' '), json);
        }
        return new CustomerRenamed(
          json.aggregateId,
          json.givenName as string,
          json.familyName as string,
          json,
        );
      },
    );
    const storedLastYear = registry.fromJSON({
      eventName: 'CustomerRenamed',
      eventVersion: 1,
      eventId,
      aggregateId: orderId,
      occurredOn: '2025-03-01T09:30:00.000Z',
      name: 'Ana María López',
    });
    expect(storedLastYear).toMatchObject({ givenName: 'Ana', familyName: 'María López' });
    expect(storedLastYear.toJSON().eventVersion).toBe(2);
  });
});
