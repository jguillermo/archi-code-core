import { DomainException } from './domain.exception';
import { ExceptionBrand } from '../../shared/exceptions/brand/exception-brand';
import { ExceptionCode } from '../../shared/exceptions/exception-code';
import { ReceivedValue } from '../../shared/exceptions/received/received-value';

export class TypePrimitiveException extends DomainException {
  static {
    ExceptionBrand.brandClass(this, ExceptionCode.TypeFailed);
  }

  constructor(expectedType: string, receivedValue: unknown, template = 'Expected a valid ') {
    const received = ReceivedValue.describe(receivedValue);
    super(`Validation Error: ${template}${expectedType}, but received ${received}.`, [
      ExceptionCode.TypeFailed,
    ]);
  }
}
