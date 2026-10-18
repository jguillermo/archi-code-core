import { AbstractException } from '../abstract.exception';
import type { ExceptionOptions } from '../abstract.exception';
import { ExceptionBrand } from '../brand/exception-brand';
import { ExceptionCode } from '../exception-code';

export class InfrastructureException extends AbstractException {
  static {
    ExceptionBrand.brandClass(this, ExceptionCode.InfrastructureException);
  }

  constructor(
    message: string,
    exceptionCodes: (ExceptionCode | string)[] = [],
    options: ExceptionOptions = {},
  ) {
    super(message, [ExceptionCode.InfrastructureException, ...exceptionCodes], options);
  }
}
