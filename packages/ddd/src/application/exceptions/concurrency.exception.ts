import { ExceptionBrand } from '../../shared/index';
import type { ExceptionOptions } from '../../shared/index';
import { ApplicationExceptionCode } from './application-exception-code';
import { ApplicationException } from './application.exception';

export class ConcurrencyException extends ApplicationException {
  static {
    ExceptionBrand.brandClass(this, ApplicationExceptionCode.ConcurrencyConflict);
  }

  constructor(
    aggregateName: string,
    id: string,
    expectedVersion: number,
    options: ExceptionOptions = {},
  ) {
    super(
      `${aggregateName} with ID ${id} was changed by someone else: expected version ${expectedVersion}.`,
      [ApplicationExceptionCode.ConcurrencyConflict],
      options,
    );
  }
}
