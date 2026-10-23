import { AbstractException } from '../../shared/exceptions/abstract.exception';
import type { ExceptionOptions } from '../../shared/exceptions/abstract.exception';
import { ExceptionBrand } from '../../shared/exceptions/brand/exception-brand';
import { ExceptionCode } from '../../shared/exceptions/exception-code';

export class ApplicationException extends AbstractException {
  static {
    ExceptionBrand.brandClass(this, ExceptionCode.ApplicationException);
  }

  constructor(
    message: string,
    exceptionCodes: (ExceptionCode | string)[] = [],
    options: ExceptionOptions = {},
  ) {
    super(message, [ExceptionCode.ApplicationException, ...exceptionCodes], options);
  }
}
