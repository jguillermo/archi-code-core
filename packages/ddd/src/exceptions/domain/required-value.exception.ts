import { DomainException } from './domain.exception';
import { ExceptionBrand } from '../brand/exception-brand';
import { ExceptionCode } from '../exception-code';
import { ReceivedValue } from '../received/received-value';

export class RequiredValueException extends DomainException {
  static {
    ExceptionBrand.brandClass(this, ExceptionCode.RequiredValue);
  }

  constructor(typeName: string, receivedValue: unknown) {
    const received = ReceivedValue.describe(receivedValue);
    super(`Validation Error: ${typeName} is required, but received ${received}.`, [
      ExceptionCode.RequiredValue,
    ]);
  }
}
