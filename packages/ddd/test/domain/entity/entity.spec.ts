import { describe, expect, expectTypeOf, it } from 'vitest';
import { Entity } from '../../../src/domain/entity/entity';
import { AggregateRoot } from '../../../src/domain/aggregate/aggregate-root';
import { IdType } from '../../../src/domain/type/id-type';
import { NumberType } from '../../../src/domain/type/number-type';
import { Required } from '../../../src/domain/type/required/required';
import { StringType } from '../../../src/domain/type/string-type';
import type { PrimitiveTypes } from '../../../src/domain/primitive/primitive-types';

class SeatId extends IdType {}
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
});
