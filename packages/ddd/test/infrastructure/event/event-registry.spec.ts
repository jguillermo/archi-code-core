import { describe, expect, it } from 'vitest';
import { InfrastructureExceptionCode } from '../../../src/infrastructure/exceptions/infrastructure-exception-code';
import { EventBase } from '../../../src/domain/index';
import { InternalErrorException } from '../../../src/infrastructure/exceptions/internal-error.exception';
import { UnknownEventException } from '../../../src/infrastructure/exceptions/unknown-event.exception';
import type { EventMetadata, SerializedEvent } from '../../../src/domain/index';
import { EventRegistry } from '../../../src/infrastructure/event/event-registry';

class OrderPlaced extends EventBase {
  static readonly eventName = 'OrderPlaced';

  constructor(
    readonly orderId: string,
    readonly customer: string,
    metadata?: EventMetadata,
  ) {
    super(metadata);
  }
}

class OrderShipped extends EventBase {
  static readonly eventName = 'OrderShipped';

  constructor(
    readonly orderId: string,
    readonly carrier: string,
    metadata?: EventMetadata,
  ) {
    super(metadata);
  }
}

class OrderLinesChanged extends EventBase {
  static readonly eventName = 'OrderLinesChanged';

  constructor(
    readonly orderId: string,
    readonly lines: { sku: string; units: number }[],
    metadata?: EventMetadata,
  ) {
    super(metadata);
  }
}

type OrderEvent = OrderPlaced | OrderShipped;

const orderId = '9b2f6c1e-4d3a-4f8b-a1c2-3e4d5f6a7b8c';
const eventId = '1d2e3f4a-5b6c-4d7e-8f9a-0b1c2d3e4f5a';

function orderEvents() {
  return new EventRegistry<OrderEvent>()
    .register(OrderPlaced, (e) => new OrderPlaced(e.orderId as string, e.customer as string, e))
    .register(OrderShipped, (e) => new OrderShipped(e.orderId as string, e.carrier as string, e));
}

describe('EventRegistry: rebuilding the events a channel delivers', () => {
  it('a database channel rebuilds the event from the JSON row it stored', () => {
    const recorded = new OrderPlaced(orderId, 'Ana', {
      eventId,
      occurredOn: '2026-03-01T09:30:00Z',
    });
    const row = JSON.stringify(recorded);
    const rebuilt = orderEvents().fromJSON(JSON.parse(row));
    expect(rebuilt).toBeInstanceOf(OrderPlaced);
    expect(rebuilt).toMatchObject({ eventId, orderId, customer: 'Ana' });
    expect(rebuilt.occurredOn).toBe('2026-03-01T09:30:00.000Z');
    expect(JSON.stringify(rebuilt)).toBe(row);
  });

  it('a broker consumer rebuilds the event from the parsed message body', () => {
    const body: SerializedEvent = {
      eventName: 'OrderShipped',
      eventId,
      occurredOn: '2026-03-02T10:00:00.000Z',
      orderId,
      carrier: 'SEUR',
    };
    const rebuilt = orderEvents().fromJSON(body);
    expect(rebuilt).toBeInstanceOf(OrderShipped);
    expect(rebuilt).toMatchObject({ eventId, carrier: 'SEUR' });
  });

  it('returns the event its factory built, with the lines it carries', () => {
    let built: OrderLinesChanged | undefined;
    const changed = new EventRegistry<OrderLinesChanged>()
      .register(OrderLinesChanged, (e) => {
        built = new OrderLinesChanged(
          e.orderId as string,
          e.lines as { sku: string; units: number }[],
          e,
        );
        return built;
      })
      .fromJSON(
        JSON.parse(
          JSON.stringify(
            new OrderLinesChanged(orderId, [{ sku: 'TORCH-01', units: 2 }], { eventId }),
          ),
        ),
      );
    expect(changed).toBe(built);
    expect(changed.lines).toEqual([{ sku: 'TORCH-01', units: 2 }]);
  });

  it('registers each event by its class, under its static eventName', () => {
    const registry = new EventRegistry<OrderEvent>().register(
      OrderShipped,
      (e) => new OrderShipped(e.orderId as string, e.carrier as string, e),
    );
    expect(registry.has(OrderShipped.eventName)).toBe(true);
    expect(registry.has('order.shipped')).toBe(false);
  });

  it('keeps reading stored events after the class is renamed in code, by their eventName', () => {
    class OrderDispatched extends EventBase {
      static readonly eventName = 'OrderShipped';
    }
    const registry = new EventRegistry().register(OrderDispatched, (e) => new OrderDispatched(e));
    expect(registry.has('OrderShipped')).toBe(true);
    expect(registry.has('OrderDispatched')).toBe(false);
  });

  it('registers events one after another in a single expression', () => {
    const registry = new EventRegistry();
    expect(registry.register(OrderPlaced, (e) => new OrderPlaced(e.orderId as string, 'x'))).toBe(
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
      orderEvents().register(OrderPlaced, (e) => new OrderPlaced(e.orderId as string, 'x'));
    expect(register).toThrow(InternalErrorException);
    expect(register).toThrow('Failed, internal error: event "OrderPlaced" is already registered');
  });

  it('refuses an event it does not know with UnknownEventException', () => {
    const read = () =>
      orderEvents().fromJSON({
        eventName: 'OrderCancelled',
        eventId,
        occurredOn: '2026-03-02T10:00:00.000Z',
        orderId,
      });
    expect(read).toThrow(UnknownEventException);
    expect(read).toThrow('Unknown event "OrderCancelled": register it before reading it.');
    try {
      read();
    } catch (error) {
      expect((error as UnknownEventException).code).toBe(InfrastructureExceptionCode.UnknownEvent);
      expect((error as UnknownEventException).code).toBe('INF002');
    }
  });

  it.each([
    ['without an event name', '{"orderId":"x"}'],
    ['whose event name is not text', '{"eventName":42,"orderId":"x"}'],
  ])('refuses a message %s, saying what is missing', (_, message) => {
    expect(() => orderEvents().fromJSON(JSON.parse(message))).toThrow(InternalErrorException);
    expect(() => orderEvents().fromJSON(JSON.parse(message))).toThrow(
      'Failed, internal error: a serialized event needs its eventName',
    );
  });

  it.each([
    ['null', 'null'],
    ['a number', '42'],
    ['a string', '"OrderPlaced"'],
  ])('refuses a message whose JSON is %s', (_, text) => {
    const read = () => orderEvents().fromJSON(JSON.parse(text));
    expect(read).toThrow(InternalErrorException);
    expect(read).toThrow('Failed, internal error: a serialized event must be a JSON object');
  });

  it('refuses a factory that drops the eventId, because a listener could not skip a redelivery', () => {
    const forgetful = new EventRegistry<OrderEvent>().register(
      OrderShipped,
      (e) => new OrderShipped(e.orderId as string, e.carrier as string),
    );
    const delivered = new OrderShipped(orderId, 'UPS', {
      eventId,
      occurredOn: '2026-03-01T09:30:00Z',
    });

    const rebuild = () => forgetful.fromJSON({ ...delivered });
    expect(rebuild).toThrow(InternalErrorException);
    expect(rebuild).toThrow(
      'the factory of "OrderShipped" must pass the serialized event as metadata, so it keeps its eventId and occurredOn',
    );
  });

  it('refuses a factory that keeps the eventId but stamps a new occurredOn', () => {
    const restamping = new EventRegistry<OrderEvent>().register(
      OrderShipped,
      (e) => new OrderShipped(e.orderId as string, e.carrier as string, { eventId: e.eventId }),
    );
    const delivered = new OrderShipped(orderId, 'UPS', {
      eventId,
      occurredOn: '2026-03-01T09:30:00Z',
    });

    expect(() => restamping.fromJSON({ ...delivered })).toThrow(InternalErrorException);
  });

  it('accepts the same identity written by another producer: upper case id, time without milliseconds', () => {
    const rebuilt = orderEvents().fromJSON({
      eventName: 'OrderShipped',
      eventId: eventId.toUpperCase(),
      occurredOn: '2026-03-01T10:30:00+01:00',
      orderId,
      carrier: 'UPS',
    });
    expect(rebuilt.eventId).toBe(eventId);
    expect(rebuilt.occurredOn).toBe('2026-03-01T09:30:00.000Z');
  });

  it('propagates the error of a factory that rejects the stored data', () => {
    expect(() =>
      orderEvents().fromJSON({
        eventName: 'OrderPlaced',
        eventId: 'not-an-id',
        occurredOn: '2026-03-01T09:30:00Z',
        orderId,
        customer: 'Ana',
      }),
    ).toThrow('Validation Error: Expected a valid UUID, but received "not-an-id".');
  });

  it('hands the stored data to the factory, so a consumer can still read an older shape', () => {
    class CustomerRenamed extends EventBase {
      static readonly eventName = 'CustomerRenamed';

      constructor(
        readonly customerId: string,
        readonly givenName: string,
        readonly familyName: string,
        metadata?: EventMetadata,
      ) {
        super(metadata);
      }
    }
    const registry = new EventRegistry<CustomerRenamed>().register(CustomerRenamed, (json) => {
      if (typeof json.name === 'string') {
        const [givenName, ...rest] = json.name.split(' ');
        return new CustomerRenamed(json.customerId as string, givenName, rest.join(' '), json);
      }
      return new CustomerRenamed(
        json.customerId as string,
        json.givenName as string,
        json.familyName as string,
        json,
      );
    });
    const storedLastYear = registry.fromJSON({
      eventName: 'CustomerRenamed',
      eventId,
      occurredOn: '2025-03-01T09:30:00.000Z',
      customerId: orderId,
      name: 'Ana María López',
    });
    expect(storedLastYear).toMatchObject({ givenName: 'Ana', familyName: 'María López' });
    expect(storedLastYear).not.toHaveProperty('name');
  });
});
