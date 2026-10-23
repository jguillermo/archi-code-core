import { describe, expect, expectTypeOf, it } from 'vitest';
import { Entity } from '../../../src/domain/entity/entity';
import { AggregateRoot } from '../../../src/domain/aggregate/aggregate-root';
import { IdType } from '../../../src/domain/type/id-type';
import { NumberType } from '../../../src/domain/type/number-type';
import { Required } from '../../../src/domain/type/required/required-type';
import { StringType } from '../../../src/domain/type/string-type';
import type { PrimitiveTypes } from '../../../src/domain/primitive/primitive-types';
import type { RequiredMarked } from '../../../src/domain/type/required/required-mark';
import { RequiredValueException } from '../../../src/domain/exceptions/required-value.exception';

class SeatId extends IdType<'SeatId'> {}
class SeatLabel extends Required(StringType) {}
class Row extends Required(NumberType) {}

class Seat extends Entity<SeatId> {
  constructor(
    id: SeatId,
    readonly label: SeatLabel,
    readonly row: Row,
  ) {
    super(id);
  }
}

class Locker extends Entity<SeatId> {}

class Room extends AggregateRoot {}

const seatId = '7a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d';
const otherSeatId = '1f2e3d4c-5b6a-4978-8a9b-0c1d2e3f4a5b';

function seat(id = seatId, label = 'A1'): Seat {
  return new Seat(new SeatId(id), new SeatLabel(label), new Row(1));
}

describe('Entity: a part of an aggregate with an identity of its own, and nothing else', () => {
  it('keeps its id read-only', () => {
    const first = seat();
    expect(first.id.value).toBe(seatId);
    // @ts-expect-error the identity of an entity never changes
    first.id = new SeatId(otherSeatId);
  });

  it('two seats with the same id are the same seat, even when their data differs', () => {
    expect(seat(seatId, 'A1').equals(seat(seatId, 'B7'))).toBe(true);
  });

  it('two seats with different ids are different seats, even with the same data', () => {
    expect(seat(seatId, 'A1').equals(seat(otherSeatId, 'A1'))).toBe(false);
  });

  it('a seat and a locker with the same id are different things', () => {
    expect(seat().equals(new Locker(new SeatId(seatId)))).toBe(false);
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['its id text', seatId],
    ['an object with the same id', { id: new SeatId(seatId) }],
  ])('is not equal to %s', (_, other) => {
    expect(seat().equals(other)).toBe(false);
  });

  it('is the base of every aggregate root', () => {
    expect(new Room(new IdType(seatId))).toBeInstanceOf(Entity);
  });

  it('gives a child entity its id and value objects as primitives, never its methods', () => {
    expectTypeOf<PrimitiveTypes<Seat>>().toEqualTypeOf<{
      id: string;
      label: string;
      row: number;
    }>();
  });

  it('offers nothing but its id and equals: behavior belongs to the aggregate root', () => {
    expect(Object.getOwnPropertyNames(Entity.prototype).sort()).toEqual(['constructor', 'equals']);
  });

  describe('a stable identity from the start [IDDD ch. 5]', () => {
    class Nickname extends StringType {}
    class Guest extends Entity<Nickname & RequiredMarked> {}

    it('refuses an id that holds no value, so two new entities are never taken for the same one', () => {
      const withoutId = () => new Guest(new Nickname(null) as Nickname & RequiredMarked);
      expect(withoutId).toThrow(RequiredValueException);
      expect(withoutId).toThrow('Validation Error: Guest.id is required, but received null.');
    });

    it('refuses a missing id passed from untyped code', () => {
      expect(() => new Locker(undefined as unknown as SeatId)).toThrow(
        'Validation Error: Locker.id is required, but received undefined.',
      );
    });

    it('only takes a required value object as id', () => {
      // @ts-expect-error an optional value object may hold no value, so it cannot be an id
      expect(() => new (class extends Entity<Nickname> {})(new Nickname('ana'))).not.toThrow();
    });
  });
});
