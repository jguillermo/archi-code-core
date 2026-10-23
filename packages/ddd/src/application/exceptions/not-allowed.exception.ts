import { ApplicationException } from './application.exception';
import type { ExceptionOptions } from '../../shared/exceptions/abstract.exception';
import { ExceptionBrand } from '../../shared/exceptions/brand/exception-brand';
import { ExceptionCode } from '../../shared/exceptions/exception-code';

export class NotAllowedException extends ApplicationException {
  static {
    ExceptionBrand.brandClass(this, ExceptionCode.NotAllowed);
  }

  constructor(message: string, options: ExceptionOptions = {}) {
    super(message, [ExceptionCode.NotAllowed], options);
  }
}
