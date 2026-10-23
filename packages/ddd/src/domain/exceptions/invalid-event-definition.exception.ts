import { ExceptionBrand } from '../../shared/index';
import { DomainExceptionCode } from './domain-exception-code';
import { DomainException } from './domain.exception';

export class InvalidEventDefinitionException extends DomainException {
  static {
    ExceptionBrand.brandClass(this, DomainExceptionCode.InvalidEventDefinition);
  }

  constructor(eventClassName: string) {
    super(`${eventClassName} must declare a static eventName`, [
      DomainExceptionCode.InvalidEventDefinition,
    ]);
  }
}
