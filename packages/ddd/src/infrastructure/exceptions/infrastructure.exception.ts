import { AbstractException, ExceptionBrand } from '../../shared/index';
import type { ExceptionOptions } from '../../shared/index';
import { InfrastructureExceptionCode } from './infrastructure-exception-code';

export class InfrastructureException extends AbstractException {
  static {
    ExceptionBrand.brandClass(this, InfrastructureExceptionCode.InfrastructureException);
  }

  constructor(
    message: string,
    exceptionCodes: (InfrastructureExceptionCode | string)[] = [],
    options: ExceptionOptions = {},
  ) {
    super(
      message,
      [InfrastructureExceptionCode.InfrastructureException, ...exceptionCodes],
      options,
      InfrastructureExceptionCode,
    );
  }
}
