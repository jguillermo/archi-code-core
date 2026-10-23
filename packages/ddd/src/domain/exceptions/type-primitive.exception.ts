import { ExceptionBrand, ReceivedValue } from '../../shared/index';
import { DomainExceptionCode } from './domain-exception-code';
import { DomainException } from './domain.exception';

export class TypePrimitiveException extends DomainException {
  static {
    ExceptionBrand.brandClass(this, DomainExceptionCode.TypeFailed);
  }

  constructor(expectedType: string, receivedValue: unknown, template = 'Expected a valid ') {
    const received = ReceivedValue.describe(receivedValue);
    super(`Validation Error: ${template}${expectedType}, but received ${received}.`, [
      DomainExceptionCode.TypeFailed,
    ]);
  }
}
