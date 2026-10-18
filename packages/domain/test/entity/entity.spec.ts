import { describe, expect, expectTypeOf, it } from 'vitest';
import { Entity } from '../../src/entity/entity';
import { IdType } from '../../src/type/id-type';
import { NumberType } from '../../src/type/number-type';
import { Required } from '../../src/type/required/required';
import { StringType } from '../../src/type/string-type';

class OrderLineId extends IdType {}
class Sku extends Required(StringType) {}
class Quantity extends Required(NumberType) {}
class EmployeeNumber extends Required(StringType) {}

class OrderLine extends Entity<OrderLineId> {
  constructor(
    id: OrderLineId,
    readonly sku: Sku,
    readonly quantity: Quantity,
  ) {
    super(id);
  }
}

class ReturnLine extends Entity<OrderLineId> {}

class Employee extends Entity<EmployeeNumber> {}

const lineId = '0f8c2b6e-3c1a-4c55-9a4e-0d6c1b2f7a10';
const otherLineId = '5b1d3f2a-8e7c-4b6d-9f0a-1c2e3d4f5a6b';

describe('Entity: an object with identity inside an aggregate', () => {
  it('exposes its id with the id type it was declared with', () => {
    const line = new OrderLine(new OrderLineId(lineId), new Sku('TORCH-01'), new Quantity(2));
    expectTypeOf(line.id).toEqualTypeOf<OrderLineId>();
    expect(line.id.value).toBe(lineId);
  });

  it('uses IdType when no id type is given', () => {
    class Note extends Entity {}
    expectTypeOf(new Note(new IdType(lineId)).id).toEqualTypeOf<IdType>();
  });

  it('accepts any value object as id, such as an employee number', () => {
    const employee = new Employee(new EmployeeNumber('EMP-0042'));
    expect(employee.id.value).toBe('EMP-0042');
  });

  describe('equals: identity, not attributes', () => {
    it('a line whose quantity changed is still the same line', () => {
      const before = new OrderLine(new OrderLineId(lineId), new Sku('TORCH-01'), new Quantity(2));
      const after = new OrderLine(new OrderLineId(lineId), new Sku('TORCH-01'), new Quantity(5));
      expect(before.equals(after)).toBe(true);
    });

    it('a line loaded with the id in capitals is the same line', () => {
      const stored = new OrderLine(new OrderLineId(lineId), new Sku('A'), new Quantity(1));
      const typed = new OrderLine(
        new OrderLineId(lineId.toUpperCase()),
        new Sku('A'),
        new Quantity(1),
      );
      expect(stored.equals(typed)).toBe(true);
    });

    it('two lines with the same product but different ids are different lines', () => {
      const first = new OrderLine(new OrderLineId(lineId), new Sku('A'), new Quantity(1));
      const second = new OrderLine(new OrderLineId(otherLineId), new Sku('A'), new Quantity(1));
      expect(first.equals(second)).toBe(false);
    });

    it('an order line and a return line with the same id are different entities', () => {
      const line = new OrderLine(new OrderLineId(lineId), new Sku('A'), new Quantity(1));
      expect(line.equals(new ReturnLine(new OrderLineId(lineId)))).toBe(false);
    });

    it.each([
      ['null', null],
      ['undefined', undefined],
      ['its raw id', lineId],
      ['a plain object with the same id', { id: new OrderLineId(lineId) }],
    ])('is never equal to %s', (_, other) => {
      expect(new ReturnLine(new OrderLineId(lineId)).equals(other)).toBe(false);
    });
  });
});
