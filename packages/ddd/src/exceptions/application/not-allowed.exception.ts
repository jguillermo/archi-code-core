import { ApplicationException } from './application.exception';
import { ExceptionBrand } from '../brand/exception-brand';
import { ExceptionCode } from '../exception-code';

export class NotAllowedException extends ApplicationException {
  static {
    ExceptionBrand.brandClass(this, ExceptionCode.NotAllowed);
  }

  constructor(message: string) {
    super(message, [ExceptionCode.NotAllowed]);
  }
}
