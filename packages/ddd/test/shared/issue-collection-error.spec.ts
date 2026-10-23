import { describe, expect, it } from 'vitest';
import { IssueCollectionError } from '../../src/shared/issue-collection-error';

describe('IssueCollectionError: what the collector throws for the layer to translate', () => {
  it('carries every issue collected, frozen', () => {
    const issues = [{ field: 'sku', code: 'ORD011', message: 'A SKU needs a code.' }];
    const error = new IssueCollectionError(issues);

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('IssueCollectionError');
    expect(error.message).toBe('1 issues collected');
    expect(error.issues).toEqual(issues);
    expect(error.issues).not.toBe(issues);
    expect(Object.isFrozen(error.issues)).toBe(true);
  });
});
