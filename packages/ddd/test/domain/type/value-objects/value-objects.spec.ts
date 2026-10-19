import { describe, expect, expectTypeOf, it } from 'vitest';
import { Validations } from '@archi-code/validation';
import { ValueObjects } from '../../../../src/domain/type/value-objects/value-objects';
import { ArrayType } from '../../../../src/domain/type/array-type';
import { IdType } from '../../../../src/domain/type/id-type';
import { NumberType } from '../../../../src/domain/type/number-type';
import { StringType } from '../../../../src/domain/type/string-type';
import { Required } from '../../../../src/domain/type/required/required';
import { DomainException } from '../../../../src/exceptions/domain/domain.exception';
import { ValidationException } from '../../../../src/exceptions/domain/validation.exception';
import { AggregateNotFoundException } from '../../../../src/exceptions/application/aggregate-not-found.exception';

class OrderId extends IdType<'OrderId'> {}

@Validations([{ validator: 'isEmail' }])
class CustomerEmail extends Required(StringType) {}

class Sku extends Required(StringType) {}

@Validations([
  { validator: 'isInt', properties: { min: 1, max: 20 }, message: 'From 1 to 20 units' },
])
class Units extends Required(NumberType) {}

class Note extends StringType {}

@Validations([{ validator: 'isLength', properties: { min: 2 }, message: 'A tag has 2 letters' }])
class Tag extends Required(StringType) {}

class Tags extends ArrayType<Tag> {
  protected createItem(value: unknown): Tag {
    return new Tag(value as string);
  }
}

class CouponExpired extends DomainException {
  constructor(code: string) {
    super(`Coupon ${code} has expired`, ['ORD010']);
  }
}

class OrderLine {
  constructor(
    readonly sku: Sku,
    readonly units: Units,
  ) {}
}

interface PlaceOrderInput {
  orderId: string;
  email: string;
  note?: string;
  lines: { sku: string; units: number }[];
}

const orderId = '9b2f6c1e-4d3a-4f8b-a1c2-3e4d5f6a7b8c';

function placeOrderCommand(input: PlaceOrderInput) {
  return ValueObjects.build({
    orderId: () => new OrderId(input.orderId),
    email: () => new CustomerEmail(input.email),
    note: () => new Note(input.note),
    lines: () =>
      ValueObjects.buildList(input.lines, (line) =>
        ValueObjects.build({ sku: () => new Sku(line.sku), units: () => new Units(line.units) }),
      ),
  });
}

function issuesOf(build: () => unknown): unknown {
  try {
    build();
  } catch (error) {
    return (error as ValidationException).errors;
  }
  return undefined;
}

describe('ValueObjects: building every value object of an input at once', () => {
  describe('build', () => {
    it('returns the command typed field by field when every value is valid', () => {
      const command = placeOrderCommand({
        orderId,
        email: 'ana@example.com',
        lines: [{ sku: 'TORCH-01', units: 2 }],
      });

      expectTypeOf(command.orderId).toEqualTypeOf<OrderId>();
      expectTypeOf(command.email).toEqualTypeOf<CustomerEmail>();
      expectTypeOf(command.lines).toEqualTypeOf<{ sku: Sku; units: Units }[]>();
      expect(command.orderId).toBeInstanceOf(OrderId);
      expect(command.email.value).toBe('ana@example.com');
      expect(command.note.value).toBeNull();
      expect(command.lines.map((line) => new OrderLine(line.sku, line.units))).toEqual([
        new OrderLine(new Sku('TORCH-01'), new Units(2)),
      ]);
    });

    it('fits a command interface declared by the use case', () => {
      interface ShipOrderCommand {
        orderId: OrderId;
        email: CustomerEmail;
      }
      const command: ShipOrderCommand = ValueObjects.build({
        orderId: () => new OrderId(orderId),
        email: () => new CustomerEmail('ana@example.com'),
      });
      expect(command.orderId.value).toBe(orderId);
    });

    it('evaluates every field and reports all of them, not only the first one', () => {
      const place = () =>
        placeOrderCommand({
          orderId: 'not-an-id',
          email: 'ana',
          lines: [{ sku: 'TORCH-01', units: 2 }],
        });

      expect(place).toThrow(ValidationException);
      expect(issuesOf(place)).toEqual([
        {
          field: 'orderId',
          code: 'DOM003',
          message: 'Validation Error: Expected a valid UUID, but received "not-an-id".',
        },
        {
          field: 'email',
          code: 'isEmail',
          message: 'CustomerEmail: Value does not satisfy isEmail',
        },
      ]);
    });

    it('reports missing, unconvertible and rule-breaking values together', () => {
      expect(
        issuesOf(() =>
          ValueObjects.build({
            email: () => new CustomerEmail(''),
            units: () => new Units('three' as unknown as number),
            otherUnits: () => new Units(30),
          }),
        ),
      ).toEqual([
        {
          field: 'email',
          code: 'DOM004',
          message: 'Validation Error: CustomerEmail is required, but received "".',
        },
        {
          field: 'units',
          code: 'DOM003',
          message: 'Validation Error: Expected a valid Number, but received "three".',
        },
        { field: 'otherUnits', code: 'isInt', message: 'Units: From 1 to 20 units' },
      ]);
    });

    it('keeps every broken rule of one value under the same field', () => {
      @Validations([{ validator: 'isLength', properties: { min: 8 } }])
      class SignUpEmail extends CustomerEmail {}

      expect(issuesOf(() => ValueObjects.build({ email: () => new SignUpEmail('a@b') }))).toEqual([
        { field: 'email', code: 'isEmail', message: 'SignUpEmail: Value does not satisfy isEmail' },
        {
          field: 'email',
          code: 'isLength',
          message: 'SignUpEmail: Value does not satisfy isLength',
        },
      ]);
    });

    it('reports a business exception thrown while building a value under its field', () => {
      const redeem = () =>
        ValueObjects.build({
          email: () => new CustomerEmail('ana@example.com'),
          coupon: () => {
            throw new CouponExpired('SPRING');
          },
        });
      expect(issuesOf(redeem)).toEqual([
        { field: 'coupon', code: 'ORD010', message: 'Coupon SPRING has expired' },
      ]);
    });

    it('lets an error that is not a domain error through untouched, it is a bug', () => {
      const outage = new TypeError('Cannot read properties of undefined');
      expect(() =>
        ValueObjects.build({
          email: () => new CustomerEmail('ana'),
          broken: () => {
            throw outage;
          },
        }),
      ).toThrow(outage);
    });

    it('treats any domain exception as a field error, whatever its subclass', () => {
      class UnknownCurrency extends DomainException {
        constructor(code: string) {
          super(`Currency ${code} is not sold here`, ['PAY002']);
        }
      }
      expect(
        issuesOf(() =>
          ValueObjects.build({
            currency: () => {
              throw new UnknownCurrency('GBP');
            },
          }),
        ),
      ).toEqual([{ field: 'currency', code: 'PAY002', message: 'Currency GBP is not sold here' }]);
    });

    it('lets an application exception through untouched: it is not a field of the input', () => {
      const missing = new AggregateNotFoundException('Order', orderId);
      expect(() =>
        ValueObjects.build({
          email: () => new CustomerEmail('ana'),
          order: () => {
            throw missing;
          },
        }),
      ).toThrow(missing);
    });

    it('an empty input builds an empty command', () => {
      expect(ValueObjects.build({})).toEqual({});
    });
  });

  describe('buildList and nested inputs', () => {
    it('names each invalid line by its position and field', () => {
      const place = () =>
        placeOrderCommand({
          orderId,
          email: 'ana@example.com',
          lines: [
            { sku: 'TORCH-01', units: 2 },
            { sku: '', units: 0 },
            { sku: 'MASK-02', units: 25 },
          ],
        });

      expect(issuesOf(place)).toEqual([
        {
          field: 'lines.1.sku',
          code: 'DOM004',
          message: 'Validation Error: Sku is required, but received "".',
        },
        { field: 'lines.1.units', code: 'isInt', message: 'Units: From 1 to 20 units' },
        { field: 'lines.2.units', code: 'isInt', message: 'Units: From 1 to 20 units' },
      ]);
      expect(() => place()).toThrow(
        'Validation failed, lines.1.sku: Validation Error: Sku is required, but received "".',
      );
    });

    it('names an invalid item of a list value object by its position', () => {
      expect(issuesOf(() => ValueObjects.build({ tags: () => new Tags(['ddd', 'x']) }))).toEqual([
        { field: 'tags.1', code: 'isLength', message: 'Tag: A tag has 2 letters' },
      ]);
    });

    it('reports the field of a list value object for the rules of the whole list', () => {
      @Validations([{ custom: 'hasTags', fn: (value) => Array.isArray(value) && value.length > 0 }])
      class ProductTags extends Tags {}

      expect(issuesOf(() => ValueObjects.build({ tags: () => new ProductTags([]) }))).toEqual([
        { field: 'tags', code: 'hasTags', message: 'ProductTags: Value does not satisfy hasTags' },
      ]);
    });

    it('passes the index to the factory and keeps the order', () => {
      const positions = ValueObjects.buildList(['TORCH-01', 'MASK-02'], (sku, index) => ({
        position: index + 1,
        sku: new Sku(sku),
      }));
      expect(positions.map(({ position, sku }) => `${position}:${sku.value}`)).toEqual([
        '1:TORCH-01',
        '2:MASK-02',
      ]);
    });

    it('builds an empty list from an empty input', () => {
      expect(ValueObjects.buildList([], (sku: string) => new Sku(sku))).toEqual([]);
    });
  });
});
