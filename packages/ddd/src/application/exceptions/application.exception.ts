import { AbstractException, ExceptionBrand } from '../../shared/index';
import type { ExceptionOptions } from '../../shared/index';
import { ApplicationExceptionCode } from './application-exception-code';

export class ApplicationException extends AbstractException {
  static {
    ExceptionBrand.brandClass(this, ApplicationExceptionCode.ApplicationException);
  }

  constructor(
    message: string,
    exceptionCodes: (ApplicationExceptionCode | string)[] = [],
    options: ExceptionOptions = {},
  ) {
    super(
      message,
      [ApplicationExceptionCode.ApplicationException, ...exceptionCodes],
      options,
      ApplicationExceptionCode,
    );
  }
}
