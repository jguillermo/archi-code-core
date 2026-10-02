import { DomainException } from './domain.exception';
import { ExceptionCode } from '../exception-code';
import { anyToString } from '@archi-code/validation';

export class RequiredValueException extends DomainException {
  constructor(typeName: string, receivedValue: unknown) {
    const received =
      typeof receivedValue === 'string' ? `"${receivedValue}"` : anyToString(receivedValue);
    super(`Validation Error: ${typeName} is required, but received ${received}.`, [
      ExceptionCode.RequiredValue,
    ]);
  }
}
