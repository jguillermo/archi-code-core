import { DomainException } from './domain.exception';
import { ExceptionCode } from '../exception-code';

export class ValidationException extends DomainException {
  constructor(errors: string[]) {
    super(`Validation failed, ${errors.join(', ')}`, [ExceptionCode.ValidationFailed]);
  }
}
