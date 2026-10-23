import { describe, expect, it } from 'vitest';
import { IssueCollector } from '../../../../src/domain/type/composite/issue-collector';
import { NumberType } from '../../../../src/domain/type/number-type';
import { StringType } from '../../../../src/domain/type/string-type';
import { Required } from '../../../../src/domain/type/required/required-type';
import { ValidationException } from '../../../../src/exceptions/domain/validation.exception';

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

describe('IssueCollector: building every field before reporting what is wrong', () => {
  it('returns every field built, by name', () => {
    expect(
      IssueCollector.collectFields({
        sku: () => new Sku('TORCH-01'),
        units: () => new Quantity(2),
      }),
    ).toEqual({ sku: new Sku('TORCH-01'), units: new Quantity(2) });
  });

  it('returns every item built, in order', () => {
    expect(IssueCollector.collectItems([3, 1], (units) => new Quantity(units))).toEqual([
      new Quantity(3),
      new Quantity(1),
    ]);
  });

  it('reports every failing field in one ValidationException, with its path', () => {
    const collect = () =>
      IssueCollector.collectFields({
        sku: () => new Sku(null as unknown as string),
        lines: () =>
          IssueCollector.collectItems(['two', 1] as number[], (units) => new Quantity(units)),
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
    ]);
  });

  it('lets an error that is not a domain error through untouched', () => {
    const outage = new Error('stock service unavailable');
    expect(() =>
      IssueCollector.collectFields({
        units: () => {
          throw outage;
        },
      }),
    ).toThrow(outage);
  });
});
