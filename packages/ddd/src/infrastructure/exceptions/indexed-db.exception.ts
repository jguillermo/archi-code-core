import { ExceptionBrand } from '../../shared/index';
import type { ExceptionOptions } from '../../shared/index';
import { InfrastructureExceptionCode } from './infrastructure-exception-code';
import { InfrastructureException } from './infrastructure.exception';

export type IndexedDbExceptionReason =
  | 'unavailable'
  | 'blocked'
  | 'invalid_schema'
  | 'schema_mismatch'
  | 'duplicate_key'
  | 'invalid_key'
  | 'invalid_query'
  | 'quota_exceeded'
  | 'request_failed';

export class IndexedDbException extends InfrastructureException {
  static {
    ExceptionBrand.brandClass(this, InfrastructureExceptionCode.PersistenceError);
  }

  readonly reason: IndexedDbExceptionReason;

  constructor(reason: IndexedDbExceptionReason, message: string, options: ExceptionOptions = {}) {
    super(
      `IndexedDB ${reason}: ${message}`,
      [InfrastructureExceptionCode.PersistenceError],
      options,
    );
    this.reason = reason;
  }
}
