import { DomainException } from './domain.exception';
import { ExceptionBrand } from '../brand/exception-brand';
import { ExceptionCode } from '../exception-code';

export class ValidationException extends DomainException {
  static {
    ExceptionBrand.brandClass(this, ExceptionCode.ValidationFailed);
  }

  readonly errors: readonly string[];

  constructor(errors: string[]) {
    super(`Validation failed, ${errors.join(', ')}`, [ExceptionCode.ValidationFailed]);
    this.errors = Object.freeze([...errors]);
  }
}
