import { describe, expect, it } from 'vitest';
import { CompositeIssues } from '../../../../src/domain/type/composite/composite-issues';
import { NumberType } from '../../../../src/domain/type/number-type';
import { StringType } from '../../../../src/domain/type/string-type';
import { Required } from '../../../../src/domain/type/required/required-type';
import { DomainException } from '../../../../src/domain/exceptions/domain.exception';
import { ValidationException } from '../../../../src/domain/exceptions/validation.exception';

class Quantity extends Required(NumberType) {}
class Sku extends Required(StringType) {}

function issuesOf(collect: () => unknown): unknown {
  try {
    collect();
  } catch (error) {
    return (error as ValidationException).errors;
  }
  return undefined;
}

describe('CompositeIssues: the domain side of collecting every field of a composite', () => {
  it('returns every field and item built', () => {
    expect(
      CompositeIssues.collectFields({
        sku: () => new Sku('TORCH-01'),
        units: () => new Quantity(2),
      }),
    ).toEqual({ sku: new Sku('TORCH-01'), units: new Quantity(2) });
    expect(CompositeIssues.collectItems([3, 1], (units) => new Quantity(units))).toEqual([
      new Quantity(3),
      new Quantity(1),
    ]);
  });

  it('reports every failing field in one ValidationException, nested lists included', () => {
    const collect = () =>
      CompositeIssues.collectFields({
        sku: () => new Sku(null as unknown as string),
        lines: () =>
          CompositeIssues.collectItems(['two', 1] as number[], (units) => new Quantity(units)),
        status: () => {
          throw new DomainException('A cancelled order cannot change', ['ORD002']);
        },
      });
    expect(collect).toThrow(ValidationException);
    expect(issuesOf(collect)).toEqual([
      {
        field: 'sku',
        code: 'DOM004',
        message: 'Validation Error: Sku is required, but received null.',
      },
      {
        field: 'lines.0',
        code: 'DOM003',
        message: 'Validation Error: Expected a valid Number, but received "two".',
      },
      { field: 'status', code: 'ORD002', message: 'A cancelled order cannot change' },
    ]);
  });

  it('lets an error that is not a domain error through untouched', () => {
    const outage = new Error('stock service unavailable');
    expect(() =>
      CompositeIssues.collectFields({
        units: () => {
          throw outage;
        },
      }),
    ).toThrow(outage);
  });
});
