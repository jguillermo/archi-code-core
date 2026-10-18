import { InfrastructureException } from './infrastructure.exception';
import type { ExceptionOptions } from '../abstract.exception';
import { ExceptionBrand } from '../brand/exception-brand';
import { ExceptionCode } from '../exception-code';

export class InternalErrorException extends InfrastructureException {
  static {
    ExceptionBrand.brandClass(this, ExceptionCode.InternalError);
  }

  constructor(message: string, options: ExceptionOptions = {}) {
    super(`Failed, internal error: ${message}`, [ExceptionCode.InternalError], options);
  }
}
