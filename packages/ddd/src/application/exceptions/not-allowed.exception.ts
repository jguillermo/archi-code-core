import { ExceptionBrand } from '../../shared/index';
import type { ExceptionOptions } from '../../shared/index';
import { ApplicationExceptionCode } from './application-exception-code';
import { ApplicationException } from './application.exception';

export class NotAllowedException extends ApplicationException {
  static {
    ExceptionBrand.brandClass(this, ApplicationExceptionCode.NotAllowed);
  }

  constructor(message: string, options: ExceptionOptions = {}) {
    super(message, [ApplicationExceptionCode.NotAllowed], options);
  }
}
