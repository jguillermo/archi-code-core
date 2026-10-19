import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import { EventBase } from '../../../src/domain/event/event-base';
import type { EventMetadata, SerializedEvent } from '../../../src/domain/event/event-base';
import { NumberType } from '../../../src/domain/type/number-type';
import { RequiredValueException } from '../../../src/exceptions/domain/required-value.exception';
import { TypePrimitiveException } from '../../../src/exceptions/domain/type-primitive.exception';
import { InternalErrorException } from '../../../src/exceptions/infrastructure/internal-error.exception';

class PaymentCaptured extends EventBase {
  static readonly eventName = 'PaymentCaptured';

  constructor(
    orderId: string,
    readonly amount: number,
    readonly currency: string,
    metadata?: EventMetadata,
  ) {
    super(orderId, metadata);
  }
}

class StockReserved extends EventBase {
  static readonly eventName = 'StockReserved';

  constructor(
    productId: string,
    readonly units: NumberType,
  ) {
    super(productId);
  }
}

const orderId = '9b2f6c1e-4d3a-4f8b-a1c2-3e4d5f6a7b8c';
const eventId = '1d2e3f4a-5b6c-4d7e-8f9a-0b1c2d3e4f5a';
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('EventBase: a fact the domain publishes', () => {
  describe('its name', () => {
    it('is declared once on the class, so listeners and registries refer to it without an instance', () => {
      expect(PaymentCaptured.eventName).toBe('PaymentCaptured');
      expect(new PaymentCaptured(orderId, 10, 'EUR').eventName()).toBe('PaymentCaptured');
    });

    it('is inherited by a subclass that does not declare its own', () => {
      class CardPaymentCaptured extends PaymentCaptured {}
      expect(new CardPaymentCaptured(orderId, 10, 'EUR').eventName()).toBe('PaymentCaptured');
    });

    it.each([
      ['without a static eventName', class OrderArchived extends EventBase {}],
      [
        'with a blank static eventName',
        class OrderArchived extends EventBase {
          static readonly eventName = '  ';
        },
      ],
    ])('refuses to create an event %s, a mistake in the code', (_, OrderArchived) => {
      const create = () => new OrderArchived(orderId);
      expect(create).toThrow(InternalErrorException);
      expect(create).toThrow('OrderArchived must declare a static eventName');
    });
  });

  describe('when an aggregate records it', () => {
    it('gets a new random event id, so consumers can drop duplicates', () => {
      const first = new PaymentCaptured(orderId, 49.9, 'EUR');
      const second = new PaymentCaptured(orderId, 49.9, 'EUR');
      expect(first.eventId).toMatch(uuidPattern);
      expect(first.eventId).not.toBe(second.eventId);
    });

    it('takes the moment from the clock the use case injects, so tests know the exact time', () => {
      const clock = { now: () => new Date('2026-03-01T09:30:00Z') };
      const event = new PaymentCaptured(orderId, 10, 'EUR', { clock });
      expect(event.occurredOn.toISOString()).toBe('2026-03-01T09:30:00.000Z');
    });

    it('asks the clock once per event, so two events of a moving clock keep their own moment', () => {
      let tick = Date.parse('2026-03-01T09:30:00Z');
      const clock = { now: () => new Date((tick += 1000)) };
      const first = new PaymentCaptured(orderId, 10, 'EUR', { clock });
      const second = new PaymentCaptured(orderId, 10, 'EUR', { clock });
      expect(first.occurredOn.toISOString()).toBe('2026-03-01T09:30:01.000Z');
      expect(second.occurredOn.toISOString()).toBe('2026-03-01T09:30:02.000Z');
    });

    it('does not keep the clock: it is not part of the event nor of its JSON', () => {
      const event = new PaymentCaptured(orderId, 10, 'EUR', {
        clock: { now: () => new Date('2026-03-01T09:30:00Z') },
      });
      expect(Object.keys(event)).not.toContain('clock');
      expect(event.toJSON()).not.toHaveProperty('clock');
    });

    it('refuses a broken clock that returns an invalid date', () => {
      const clock = { now: () => new Date('not a date') };
      expect(() => new PaymentCaptured(orderId, 10, 'EUR', { clock })).toThrow(
        TypePrimitiveException,
      );
    });

    it('uses the system time when no clock is given', () => {
      vi.useFakeTimers({ now: new Date('2026-03-01T09:30:00Z') });
      try {
        expect(new PaymentCaptured(orderId, 10, 'EUR').occurredOn.toISOString()).toBe(
          '2026-03-01T09:30:00.000Z',
        );
      } finally {
        vi.useRealTimers();
      }
    });

    it('keeps the id of the aggregate it belongs to and its own payload', () => {
      expect(new PaymentCaptured(orderId, 49.9, 'EUR')).toMatchObject({
        aggregateId: orderId,
        amount: 49.9,
        currency: 'EUR',
      });
    });

    it('its moment cannot be changed by a handler', () => {
      const event = new PaymentCaptured(orderId, 10, 'EUR');
      expect(() => event.occurredOn.setFullYear(2000)).toThrow(TypeError);
    });

    it.each([
      ['an empty', ''],
      ['a blank', '   '],
    ])('refuses %s aggregate id', (_, aggregateId) => {
      expect(() => new PaymentCaptured(aggregateId, 10, 'EUR')).toThrow(RequiredValueException);
      expect(() => new PaymentCaptured(aggregateId, 10, 'EUR')).toThrow(
        `Validation Error: PaymentCaptured.aggregateId is required, but received "${aggregateId}".`,
      );
    });
  });

  describe('when it is read back from an outbox table or a message broker', () => {
    it('keeps the stored event id and moment', () => {
      const event = new PaymentCaptured(orderId, 49.9, 'EUR', {
        eventId,
        occurredOn: '2026-03-01T09:30:00.000Z',
      });
      expect(event.eventId).toBe(eventId);
      expect(event.occurredOn.toISOString()).toBe('2026-03-01T09:30:00.000Z');
    });

    it('keeps the stored moment even when a clock is also given', () => {
      const clock = { now: () => new Date('2030-01-01T00:00:00Z') };
      const event = new PaymentCaptured(orderId, 1, 'EUR', {
        occurredOn: '2026-03-01T09:30:00.000Z',
        clock,
      });
      expect(event.occurredOn.toISOString()).toBe('2026-03-01T09:30:00.000Z');
    });

    it('accepts the moment as a Date', () => {
      const occurredOn = new Date('2026-03-01T09:30:00Z');
      const event = new PaymentCaptured(orderId, 1, 'EUR', { occurredOn });
      expect(event.occurredOn.getTime()).toBe(occurredOn.getTime());
      expect(event.occurredOn).not.toBe(occurredOn);
    });

    it('stores the event id in lowercase', () => {
      const event = new PaymentCaptured(orderId, 1, 'EUR', { eventId: eventId.toUpperCase() });
      expect(event.eventId).toBe(eventId);
    });

    it.each([
      ['a corrupt event id', { eventId: 'not-an-id' }],
      ['the nil uuid as event id', { eventId: '00000000-0000-0000-0000-000000000000' }],
      ['a moment without a zone', { occurredOn: '2026-03-01T09:30:00' }],
      ['an invalid moment', { occurredOn: 'yesterday' }],
    ])('refuses %s', (_, metadata) => {
      expect(() => new PaymentCaptured(orderId, 1, 'EUR', metadata)).toThrow(
        TypePrimitiveException,
      );
    });
  });

  describe('eventVersion: the version of the shape of its data', () => {
    it('is 1 unless the event class declares another one', () => {
      expect(new PaymentCaptured(orderId, 10, 'EUR').eventVersion()).toBe(1);
      expect('eventVersion' in PaymentCaptured).toBe(false);
    });

    it('a class that changed the shape of its data declares the new version', () => {
      class PaymentCapturedV2 extends PaymentCaptured {
        static readonly eventVersion = 2;
      }
      const event = new PaymentCapturedV2(orderId, 10, 'EUR');
      expect(event.eventVersion()).toBe(2);
      expect(event.eventName()).toBe('PaymentCaptured');
      expect(event.toJSON().eventVersion).toBe(2);
    });

    it.each([0, -1, 1.5, Number.NaN])('refuses the version %s', (version) => {
      class BrokenVersion extends EventBase {
        static readonly eventName = 'OrderArchived';
        static readonly eventVersion = version;
      }
      expect(() => new BrokenVersion(orderId)).toThrow(
        'Failed, internal error: BrokenVersion.eventVersion must be a whole number from 1',
      );
    });
  });

  describe('toJSON: what goes to the outbox or the broker', () => {
    it('serializes name, schema version, id, aggregate id, ISO moment and payload', () => {
      const event = new PaymentCaptured(orderId, 49.9, 'EUR', {
        eventId,
        occurredOn: '2026-03-01T09:30:00Z',
      });
      expect(JSON.parse(JSON.stringify(event))).toEqual({
        eventName: 'PaymentCaptured',
        eventVersion: 1,
        eventId,
        aggregateId: orderId,
        occurredOn: '2026-03-01T09:30:00.000Z',
        amount: 49.9,
        currency: 'EUR',
      });
      expectTypeOf(event.toJSON()).toEqualTypeOf<SerializedEvent>();
    });

    it('writes the envelope first and the payload after, so outbox rows read the same', () => {
      const event = new PaymentCaptured(orderId, 49.9, 'EUR', { eventId });
      expect(Object.keys(event.toJSON())).toEqual([
        'eventName',
        'eventVersion',
        'eventId',
        'aggregateId',
        'occurredOn',
        'amount',
        'currency',
      ]);
    });

    it('serializes value objects in the payload as their plain value', () => {
      const event = new StockReserved('PRODUCT-7', new NumberType(3));
      expect(JSON.parse(JSON.stringify(event))).toMatchObject({
        eventName: 'StockReserved',
        aggregateId: 'PRODUCT-7',
        units: 3,
      });
    });
  });
});
