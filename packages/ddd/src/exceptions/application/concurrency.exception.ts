import { ApplicationException } from './application.exception';
import type { ExceptionOptions } from '../abstract.exception';
import { ExceptionBrand } from '../brand/exception-brand';
import { ExceptionCode } from '../exception-code';

export class ConcurrencyException extends ApplicationException {
  static {
    ExceptionBrand.brandClass(this, ExceptionCode.ConcurrencyConflict);
  }

  constructor(
    aggregateName: string,
    id: string,
    expectedVersion: number,
    options: ExceptionOptions = {},
  ) {
    super(
      `${aggregateName} with ID ${id} was changed by someone else: expected version ${expectedVersion}.`,
      [ExceptionCode.ConcurrencyConflict],
      options,
    );
  }
}
