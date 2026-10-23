import { AbstractException, ExceptionBrand } from '../../shared/index';
import type { ExceptionOptions } from '../../shared/index';
import { DomainExceptionCode } from './domain-exception-code';

export class DomainException extends AbstractException {
  static {
    ExceptionBrand.brandClass(this, DomainExceptionCode.DomainException);
  }

  constructor(
    message: string,
    exceptionCodes: (DomainExceptionCode | string)[] = [],
    options: ExceptionOptions = {},
  ) {
    super(
      message,
      [DomainExceptionCode.DomainException, ...exceptionCodes],
      options,
      DomainExceptionCode,
    );
  }
}
