import { IndexedDbException } from '../../exceptions/indexed-db.exception';
import type { IndexedDbExceptionReason } from '../../exceptions/indexed-db.exception';

export class IndexedDbFailure {
  private static readonly reasons: ReadonlyMap<string, IndexedDbExceptionReason> = new Map([
    ['ConstraintError', 'duplicate_key'],
    ['DataError', 'invalid_key'],
    ['QuotaExceededError', 'quota_exceeded'],
    ['NotFoundError', 'schema_mismatch'],
    ['VersionError', 'schema_mismatch'],
  ]);

  static from(error: unknown, context: string): IndexedDbException {
    if (error instanceof IndexedDbException) {
      return error;
    }
    const name = IndexedDbFailure.nameOf(error);
    const message = IndexedDbFailure.text(error, 'message');
    const detail = message === '' ? context : `${context}: ${message}`;
    const options = error === null || error === undefined ? {} : { cause: error };
    return new IndexedDbException(
      IndexedDbFailure.reasons.get(name) ?? 'request_failed',
      detail,
      options,
    );
  }

  static nameOf(error: unknown): string {
    return IndexedDbFailure.text(error, 'name');
  }

  private static text(error: unknown, field: 'name' | 'message'): string {
    if (typeof error !== 'object' || error === null) {
      return '';
    }
    const value = (error as Record<string, unknown>)[field];
    return typeof value === 'string' ? value : '';
  }
}
