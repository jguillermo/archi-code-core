import { ExceptionBrand } from '../../shared/index';
import type { ExceptionOptions } from '../../shared/index';
import { ApplicationExceptionCode } from './application-exception-code';
import { ApplicationException } from './application.exception';

export class AggregateNotFoundException extends ApplicationException {
  static {
    ExceptionBrand.brandClass(this, ApplicationExceptionCode.AggregateNotFound);
  }

  constructor(entity: string, id: string, options: ExceptionOptions = {}) {
    super(
      `${entity} with ID ${id} not found.`,
      [ApplicationExceptionCode.AggregateNotFound],
      options,
    );
  }
}
