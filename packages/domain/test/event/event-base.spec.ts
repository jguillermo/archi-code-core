import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import { EventBase } from '../../src/event/event-base';
import type { EventMetadata, SerializedEvent } from '../../src/event/event-base';
import { NumberType } from '../../src/type/number-type';
import { RequiredValueException } from '../../src/exceptions/domain/required-value.exception';
import { TypePrimitiveException } from '../../src/exceptions/domain/type-primitive.exception';

class PaymentCaptured extends EventBase {
  constructor(
    orderId: string,
    readonly amount: number,
    readonly currency: string,
    metadata?: EventMetadata,
  ) {
    super(orderId, metadata);
  }

  eventName(): string {
    return 'payment.captured';
  }
}

class StockReserved extends EventBase {
  constructor(
    productId: string,
    readonly units: NumberType,
  ) {
    super(productId);
  }

  eventName(): string {
    return 'stock.reserved';
  }
}

const orderId = '9b2f6c1e-4d3a-4f8b-a1c2-3e4d5f6a7b8c';
const eventId = '1d2e3f4a-5b6c-4d7e-8f9a-0b1c2d3e4f5a';
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('EventBase: a fact the domain publishes', () => {
  describe('when an aggregate records it', () => {
    it('gets a new random event id, so consumers can drop duplicates', () => {
      const first = new PaymentCaptured(orderId, 49.9, 'EUR');
      const second = new PaymentCaptured(orderId, 49.9, 'EUR');
      expect(first.eventId).toMatch(uuidPattern);
      expect(first.eventId).not.toBe(second.eventId);
    });

    it('records when it happened', () => {
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

  describe('toJSON: what goes to the outbox or the broker', () => {
    it('serializes name, id, aggregate id, ISO moment and payload', () => {
      const event = new PaymentCaptured(orderId, 49.9, 'EUR', {
        eventId,
        occurredOn: '2026-03-01T09:30:00Z',
      });
      expect(JSON.parse(JSON.stringify(event))).toEqual({
        eventName: 'payment.captured',
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
        eventName: 'stock.reserved',
        aggregateId: 'PRODUCT-7',
        units: 3,
      });
    });
  });
});
