import { describe, expect, it } from 'vitest';
import { IndexedDbException } from '../../../../src/infrastructure/exceptions/indexed-db.exception';
import { IndexedDbFailure } from '../../../../src/infrastructure/indexeddb/transaction/indexed-db-failure';

describe('IndexedDbFailure: what the browser refused, as an IndexedDbException', () => {
  it('keeps an IndexedDbException as it is', () => {
    const refused = new IndexedDbException('blocked', 'shop is open in another tab');

    expect(IndexedDbFailure.from(refused, 'saving an order')).toBe(refused);
  });

  it.each([
    ['ConstraintError', 'duplicate_key'],
    ['DataError', 'invalid_key'],
    ['QuotaExceededError', 'quota_exceeded'],
    ['NotFoundError', 'schema_mismatch'],
    ['VersionError', 'schema_mismatch'],
    ['AbortError', 'request_failed'],
    ['constructor', 'request_failed'],
  ])('turns a browser %s into the reason %s and keeps it as the cause', (name, reason) => {
    const browserError = new DOMException('the disk said no', name);

    const failure = IndexedDbFailure.from(browserError, 'saving order ord-1');

    expect(failure).toBeInstanceOf(IndexedDbException);
    expect(failure.reason).toBe(reason);
    expect(failure.message).toBe(`IndexedDB ${reason}: saving order ord-1: the disk said no`);
    expect(failure.cause).toBe(browserError);
  });

  it('says only what was being done when the browser gives no error', () => {
    const failure = IndexedDbFailure.from(null, 'the transaction on "orders" was aborted');

    expect(failure.message).toBe(
      'IndexedDB request_failed: the transaction on "orders" was aborted',
    );
    expect('cause' in failure).toBe(false);
  });

  it('keeps as the cause a thrown value that is not an error', () => {
    expect(IndexedDbFailure.from('stock is gone', 'saving').cause).toBe('stock is gone');
    expect(IndexedDbFailure.from({ name: 404, message: 404 }, 'saving').reason).toBe(
      'request_failed',
    );
  });

  it('reads the name of a browser error, or nothing when there is none', () => {
    expect(IndexedDbFailure.nameOf(new DOMException('stale', 'VersionError'))).toBe('VersionError');
    expect(IndexedDbFailure.nameOf(undefined)).toBe('');
  });
});
