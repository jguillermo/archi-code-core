import { AbstractException } from '../abstract.exception';
import type { ExceptionOptions } from '../abstract.exception';
import { ExceptionBrand } from '../brand/exception-brand';
import { ExceptionCode } from '../exception-code';

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
