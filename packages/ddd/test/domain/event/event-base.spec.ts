import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import { EventBase } from '../../../src/domain/event/event-base';
import type { EventMetadata, SerializedEvent } from '../../../src/domain/event/event-base';
import { TypePrimitiveException } from '../../../src/exceptions/domain/type-primitive.exception';
import { InternalErrorException } from '../../../src/exceptions/infrastructure/internal-error.exception';

class PaymentCaptured extends EventBase {
  static readonly eventName = 'PaymentCaptured';

  constructor(
    readonly orderId: string,
    readonly amount: number,
    readonly currency: string,
    metadata?: EventMetadata,
  ) {
    super(metadata);
  }
}

const orderId = '9b2f6c1e-4d3a-4f8b-a1c2-3e4d5f6a7b8c';
const eventId = '1d2e3f4a-5b6c-4d7e-8f9a-0b1c2d3e4f5a';
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('EventBase: a fact the domain publishes', () => {
  describe('its name', () => {
    it('is declared once on the class, so listeners and registries refer to it without an instance', () => {
      expect(PaymentCaptured.eventName).toBe('PaymentCaptured');
    });

    it('is copied into every event as plain text, so the event carries it as data', () => {
      expect(new PaymentCaptured(orderId, 10, 'EUR').eventName).toBe('PaymentCaptured');
    });

    it('is inherited by a subclass that does not declare its own', () => {
      class CardPaymentCaptured extends PaymentCaptured {}
      expect(new CardPaymentCaptured(orderId, 10, 'EUR').eventName).toBe('PaymentCaptured');
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
      const create = () => new OrderArchived();
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
      expect(event.occurredOn).toBe('2026-03-01T09:30:00.000Z');
    });

    it('asks the clock once per event, so two events of a moving clock keep their own moment', () => {
      let tick = Date.parse('2026-03-01T09:30:00Z');
      const clock = { now: () => new Date((tick += 1000)) };
      const first = new PaymentCaptured(orderId, 10, 'EUR', { clock });
      const second = new PaymentCaptured(orderId, 10, 'EUR', { clock });
      expect(first.occurredOn).toBe('2026-03-01T09:30:01.000Z');
      expect(second.occurredOn).toBe('2026-03-01T09:30:02.000Z');
    });

    it('does not keep the clock: it is not part of the event', () => {
      const event = new PaymentCaptured(orderId, 10, 'EUR', {
        clock: { now: () => new Date('2026-03-01T09:30:00Z') },
      });
      expect(Object.keys(event)).not.toContain('clock');
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
        expect(new PaymentCaptured(orderId, 10, 'EUR').occurredOn).toBe('2026-03-01T09:30:00.000Z');
      } finally {
        vi.useRealTimers();
      }
    });

    it('keeps only its own payload, where the id of the aggregate is one more field', () => {
      expect(new PaymentCaptured(orderId, 49.9, 'EUR')).toMatchObject({
        orderId,
        amount: 49.9,
        currency: 'EUR',
      });
    });
  });

  describe('when it is read back from an outbox table or a message broker', () => {
    it('keeps the stored event id and moment', () => {
      const event = new PaymentCaptured(orderId, 49.9, 'EUR', {
        eventId,
        occurredOn: '2026-03-01T09:30:00.000Z',
      });
      expect(event.eventId).toBe(eventId);
      expect(event.occurredOn).toBe('2026-03-01T09:30:00.000Z');
    });

    it('keeps the stored moment even when a clock is also given', () => {
      const clock = { now: () => new Date('2030-01-01T00:00:00Z') };
      const event = new PaymentCaptured(orderId, 1, 'EUR', {
        occurredOn: '2026-03-01T09:30:00.000Z',
        clock,
      });
      expect(event.occurredOn).toBe('2026-03-01T09:30:00.000Z');
    });

    it('accepts the moment as a Date and keeps it as ISO text', () => {
      const event = new PaymentCaptured(orderId, 1, 'EUR', {
        occurredOn: new Date('2026-03-01T09:30:00Z'),
      });
      expect(event.occurredOn).toBe('2026-03-01T09:30:00.000Z');
    });

    it('normalizes a moment written with another zone to UTC', () => {
      const event = new PaymentCaptured(orderId, 1, 'EUR', {
        occurredOn: '2026-03-01T10:30:00+01:00',
      });
      expect(event.occurredOn).toBe('2026-03-01T09:30:00.000Z');
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

  describe('a plain object of primitive data: what goes to the outbox or the broker', () => {
    it('is its own JSON: name, id, ISO moment and the data it declares', () => {
      const event = new PaymentCaptured(orderId, 49.9, 'EUR', {
        eventId,
        occurredOn: '2026-03-01T09:30:00Z',
      });
      const serialized: SerializedEvent = { ...event };
      expect(serialized).toStrictEqual({
        eventName: 'PaymentCaptured',
        eventId,
        occurredOn: '2026-03-01T09:30:00.000Z',
        orderId,
        amount: 49.9,
        currency: 'EUR',
      });
      expect(JSON.parse(JSON.stringify(event))).toStrictEqual(serialized);
    });

    it('lists the envelope first and its data after, so outbox rows read the same', () => {
      const event = new PaymentCaptured(orderId, 49.9, 'EUR', { eventId });
      expect(Object.keys(event)).toEqual([
        'eventName',
        'eventId',
        'occurredOn',
        'orderId',
        'amount',
        'currency',
      ]);
    });

    it('has no conversion of its own: nothing to call before sending it', () => {
      expect(Object.getOwnPropertyNames(EventBase.prototype)).toEqual(['constructor']);
    });

    it('types its envelope as primitives', () => {
      expectTypeOf<EventBase['eventName']>().toEqualTypeOf<string>();
      expectTypeOf<EventBase['eventId']>().toEqualTypeOf<string>();
      expectTypeOf<EventBase['occurredOn']>().toEqualTypeOf<string>();
    });
  });
});
