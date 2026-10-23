import { ExceptionBrand, ReceivedValue } from '../../shared/index';
import { DomainExceptionCode } from './domain-exception-code';
import { DomainException } from './domain.exception';

export class RequiredValueException extends DomainException {
  static {
    ExceptionBrand.brandClass(this, DomainExceptionCode.RequiredValue);
  }

  constructor(typeName: string, receivedValue: unknown) {
    const received = ReceivedValue.describe(receivedValue);
    super(`Validation Error: ${typeName} is required, but received ${received}.`, [
      DomainExceptionCode.RequiredValue,
    ]);
  }
}
