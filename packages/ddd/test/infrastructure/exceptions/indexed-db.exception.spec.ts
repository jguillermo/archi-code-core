import { describe, expect, it, vi } from 'vitest';
import { IndexedDbException } from '../../../src/infrastructure/exceptions/indexed-db.exception';
import { InfrastructureExceptionCode } from '../../../src/infrastructure/exceptions/infrastructure-exception-code';
import { InfrastructureException } from '../../../src/infrastructure/exceptions/infrastructure.exception';
import { ExceptionClassifier } from '../../../src/infrastructure/exceptions/kind/exception-classifier';
import { ExceptionKind } from '../../../src/infrastructure/exceptions/kind/exception-kind';

describe('IndexedDbException', () => {
  it('tells why IndexedDB failed with a reason a caller can switch on, and keeps the browser error', () => {
    const cause = new DOMException('Key already exists in the object store.', 'ConstraintError');

    const exception = new IndexedDbException('duplicate_key', 'order ord-1 already exists', {
      cause,
    });

    expect(exception.reason).toBe('duplicate_key');
    expect(exception.message).toBe('IndexedDB duplicate_key: order ord-1 already exists');
    expect(exception.cause).toBe(cause);
  });

  it('is an infrastructure exception with the code INF004, a persistence error', () => {
    const exception = new IndexedDbException('blocked', 'shop is open in another tab');

    expect(exception).toBeInstanceOf(InfrastructureException);
    expect(exception.code).toBe(InfrastructureExceptionCode.PersistenceError);
    expect(exception.description).toBe(
      'Infrastructure Exception (INF000), Persistence Error (INF004)',
    );
    expect(ExceptionClassifier.classify(exception)).toBe(ExceptionKind.Internal);
  });

  it('is recognized when thrown by another copy of the package', async () => {
    vi.resetModules();
    const other = await import('../../../src/infrastructure/exceptions/indexed-db.exception');
    expect(new other.IndexedDbException('unavailable', 'x')).toBeInstanceOf(IndexedDbException);
  });
});
