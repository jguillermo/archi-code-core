import { ApplicationException } from './application.exception';
import type { ExceptionOptions } from '../abstract.exception';
import { ExceptionBrand } from '../brand/exception-brand';
import { ExceptionCode } from '../exception-code';

export class NotAllowedException extends ApplicationException {
  static {
    ExceptionBrand.brandClass(this, ExceptionCode.NotAllowed);
  }

  constructor(message: string, options: ExceptionOptions = {}) {
    super(message, [ExceptionCode.NotAllowed], options);
  }
}
