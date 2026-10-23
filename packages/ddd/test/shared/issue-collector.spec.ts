import { describe, expect, it } from 'vitest';
import { IssueCollector } from '../../src/shared/issue-collector';
import type { IssueReader } from '../../src/shared/issue-collector';
import { IssueCollectionError } from '../../src/shared/issue-collection-error';

class InvalidUnitsError extends Error {
  constructor(readonly units: unknown) {
    super(`Units must be a positive number, but received ${String(units)}.`);
  }
}

const readIssues: IssueReader = (error) => {
  if (error instanceof IssueCollectionError) {
    return error.issues;
  }
  if (error instanceof InvalidUnitsError) {
    return [{ field: null, code: 'ORD010', message: error.message }];
  }
  return null;
};

function units(value: unknown): number {
  if (typeof value !== 'number' || value <= 0) {
    throw new InvalidUnitsError(value);
  }
  return value;
}

function sku(value: unknown): string {
  if (typeof value !== 'string' || value === '') {
    throw new IssueCollectionError([
      { field: 'code', code: 'ORD011', message: 'A SKU needs a code.' },
    ]);
  }
  return value;
}

function issuesOf(collect: () => unknown): unknown {
  try {
    collect();
  } catch (error) {
    return (error as IssueCollectionError).issues;
  }
  return undefined;
}

describe('IssueCollector: building every field before reporting what is wrong', () => {
  it('returns every field built, by name', () => {
    expect(
      IssueCollector.collectFields(
        { sku: () => sku('TORCH-01'), units: () => units(2) },
        readIssues,
      ),
    ).toEqual({ sku: 'TORCH-01', units: 2 });
  });

  it('returns every item built, in order', () => {
    expect(IssueCollector.collectItems([3, 1], (value) => units(value), readIssues)).toEqual([
      3, 1,
    ]);
  });

  it('hands each item its position', () => {
    expect(
      IssueCollector.collectItems(['a', 'b'], (value, index) => `${index}:${value}`, readIssues),
    ).toEqual(['0:a', '1:b']);
  });

  it('reports every failing field in its own IssueCollectionError, each issue with its path', () => {
    const collect = () =>
      IssueCollector.collectFields(
        {
          sku: () => sku(''),
          lines: () => IssueCollector.collectItems([0, 1], (value) => units(value), readIssues),
        },
        readIssues,
      );
    expect(collect).toThrow(IssueCollectionError);
    expect(issuesOf(collect)).toEqual([
      { field: 'sku.code', code: 'ORD011', message: 'A SKU needs a code.' },
      {
        field: 'lines.0',
        code: 'ORD010',
        message: 'Units must be a positive number, but received 0.',
      },
    ]);
  });

  it('lets an error its reader does not know through untouched', () => {
    const outage = new Error('stock service unavailable');
    expect(() =>
      IssueCollector.collectFields(
        {
          units: () => {
            throw outage;
          },
        },
        readIssues,
      ),
    ).toThrow(outage);
  });
});
