import { ExceptionBrand } from '../../shared/index';
import type { ExceptionOptions } from '../../shared/index';
import { InfrastructureExceptionCode } from './infrastructure-exception-code';
import { InfrastructureException } from './infrastructure.exception';

export class InternalErrorException extends InfrastructureException {
  static {
    ExceptionBrand.brandClass(this, InfrastructureExceptionCode.InternalError);
  }

  constructor(message: string, options: ExceptionOptions = {}) {
    super(
      `Failed, internal error: ${message}`,
      [InfrastructureExceptionCode.InternalError],
      options,
    );
  }
}
