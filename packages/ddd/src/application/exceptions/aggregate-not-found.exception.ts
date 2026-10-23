import { ApplicationException } from './application.exception';
import type { ExceptionOptions } from '../../shared/exceptions/abstract.exception';
import { ExceptionBrand } from '../../shared/exceptions/brand/exception-brand';
import { ExceptionCode } from '../../shared/exceptions/exception-code';

export class AggregateNotFoundException extends ApplicationException {
  static {
    ExceptionBrand.brandClass(this, ExceptionCode.AggregateNotFound);
  }

  constructor(entity: string, id: string, options: ExceptionOptions = {}) {
    super(`${entity} with ID ${id} not found.`, [ExceptionCode.AggregateNotFound], options);
  }
}
