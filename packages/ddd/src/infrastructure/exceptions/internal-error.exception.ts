import { InfrastructureException } from './infrastructure.exception';
import type { ExceptionOptions } from '../../shared/exceptions/abstract.exception';
import { ExceptionBrand } from '../../shared/exceptions/brand/exception-brand';
import { ExceptionCode } from '../../shared/exceptions/exception-code';

export class InternalErrorException extends InfrastructureException {
  static {
    ExceptionBrand.brandClass(this, ExceptionCode.InternalError);
  }

  constructor(message: string, options: ExceptionOptions = {}) {
    super(`Failed, internal error: ${message}`, [ExceptionCode.InternalError], options);
  }
}
