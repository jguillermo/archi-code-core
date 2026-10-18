import { describe, expect, it } from 'vitest';
import { AggregateShape } from '../../../src/infrastructure/repository/aggregate-shape';
import { IdType } from '../../../src/domain/type/id-type';
import { NumberType } from '../../../src/domain/type/number-type';
import { Required } from '../../../src/domain/type/required/required';
import { StringType } from '../../../src/domain/type/string-type';
import { InternalErrorException } from '../../../src/exceptions/infrastructure/internal-error.exception';

class Sku extends Required(StringType) {}
class Units extends Required(NumberType) {}
class Code extends Required(StringType) {}

const orderId = '9b2f6c1e-4d3a-4f8b-a1c2-3e4d5f6a7b8c';
const lineId = '0f8c2b6e-3c1a-4c55-9a4e-0d6c1b2f7a10';

function check(aggregate: object, primitives: object): () => void {
  return () => AggregateShape.assert('Order', aggregate, primitives);
}

describe('AggregateShape: what an aggregate may hold before it reaches a repository', () => {
  describe('accepted state', () => {
    it('value objects, lists of them, child entities made of them and an absent child', () => {
      const state = {
        id: new IdType(orderId),
        _customer: new Code('ANA'),
        _lines: [{ id: new IdType(lineId), sku: new Sku('TORCH-01'), units: new Units(2) }],
        _tags: [new Code('gift')],
        _coupon: null,
      };
      const primitives = {
        id: orderId,
        customer: 'ANA',
        lines: [{ id: lineId, sku: 'TORCH-01', units: 2 }],
        tags: ['gift'],
        coupon: null,
      };
      expect(check(state, primitives)).not.toThrow();
    });

    it('dates stored as the value of a value object are plain data in the primitives', () => {
      expect(
        check({ id: new IdType(orderId) }, { id: orderId, placedAt: new Date('2026-01-01') }),
      ).not.toThrow();
    });
  });

  describe('state that is not a value object', () => {
    it.each([
      ['a raw shipped flag', { _shipped: true }, 'Order._shipped is a boolean, not a value object'],
      ['a raw counter', { _units: 3 }, 'Order._units is a number, not a value object'],
      ['a raw note', { _note: 'call first' }, 'Order._note is a string, not a value object'],
      [
        'a raw placement date',
        { _placedAt: new Date('2026-01-01') },
        'Order._placedAt is a Date, not a value object',
      ],
      [
        'a field never initialized',
        { _carrier: undefined },
        'Order._carrier is undefined, not a value object',
      ],
    ])('refuses %s', (_, state, message) => {
      const primitives = Object.fromEntries(Object.keys(state).map((key) => [key.slice(1), 1]));
      expect(check(state, primitives)).toThrow(InternalErrorException);
      expect(check(state, primitives)).toThrow(`Failed, internal error: ${message}`);
    });

    it('points at the exact field of a child entity that keeps raw state', () => {
      const state = {
        _lines: [
          { id: new IdType(lineId), sku: new Sku('TORCH-01') },
          { id: new IdType(lineId), sku: 'HELMET-02' },
        ],
      };
      expect(check(state, { lines: [] })).toThrow(
        'Order._lines[1].sku is a string, not a value object',
      );
    });

    it('looks inside a single child entity too', () => {
      expect(check({ _coupon: { code: new Code('X'), percent: 10 } }, { coupon: {} })).toThrow(
        'Order._coupon.percent is a number, not a value object',
      );
    });
  });

  describe('state missing from the primitives', () => {
    it('refuses a private field without getter, which would be lost on save', () => {
      const state = { id: new IdType(orderId), _internalNote: new Code('VIP') };
      expect(check(state, { id: orderId })).toThrow('Order._internalNote is not in its primitives');
    });

    it('matches a public field by its own name', () => {
      expect(check({ customer: new Code('ANA') }, {})).toThrow(
        'Order.customer is not in its primitives',
      );
    });
  });

  describe('primitives that are not plain data', () => {
    it('refuses toPrimitives returning a value object instead of its value', () => {
      expect(check({ _customer: new Code('ANA') }, { customer: new Code('ANA') })).toThrow(
        'Order.toPrimitives() returns a value object at primitives.customer; return its value',
      );
    });

    it('finds a value object hidden in the primitives of a child entity', () => {
      const primitives = { lines: [{ id: lineId, sku: new Sku('TORCH-01') }] };
      expect(check({}, primitives)).toThrow(
        'Order.toPrimitives() returns a value object at primitives.lines.0.sku; return its value',
      );
    });
  });
});
