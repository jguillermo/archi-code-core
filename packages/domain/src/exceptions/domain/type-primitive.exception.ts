import { DomainException } from './domain.exception';
import { ExceptionCode } from '../exception-code';
import { universalToString } from '@archi-code/common';

export class TypePrimitiveException extends DomainException {
  constructor(expectedType: string, receivedValue: any, template = 'Expected a valid ') {
    if (typeof receivedValue === 'string') {
      receivedValue = `"${receivedValue}"`;
    }
    super(
      `Validation Error: ${template}${expectedType}, but received ${universalToString(receivedValue)}.`,
      [ExceptionCode.TypeFailed],
    );
  }
}
