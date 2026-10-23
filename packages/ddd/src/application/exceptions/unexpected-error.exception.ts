import { ExceptionBrand } from '../../shared/index';
import type { ExceptionOptions } from '../../shared/index';
import { ApplicationExceptionCode } from './application-exception-code';
import { ApplicationException } from './application.exception';

export class UnexpectedErrorException extends ApplicationException {
  static {
    ExceptionBrand.brandClass(this, ApplicationExceptionCode.UnexpectedError);
  }

  constructor(message: string, options: ExceptionOptions = {}) {
    super(
      `Failed, unexpected error: ${message}`,
      [ApplicationExceptionCode.UnexpectedError],
      options,
    );
  }
}
