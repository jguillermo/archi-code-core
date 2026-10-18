import { DomainException } from './domain.exception';
import { ExceptionBrand } from '../brand/exception-brand';
import { ExceptionCode } from '../exception-code';
import { anyToString } from '@archi-code/validation';

export class TypePrimitiveException extends DomainException {
  static {
    ExceptionBrand.brandClass(this, ExceptionCode.TypeFailed);
  }

  constructor(expectedType: string, receivedValue: unknown, template = 'Expected a valid ') {
    const received =
      typeof receivedValue === 'string' ? `"${receivedValue}"` : anyToString(receivedValue);
    super(`Validation Error: ${template}${expectedType}, but received ${received}.`, [
      ExceptionCode.TypeFailed,
    ]);
  }
}
