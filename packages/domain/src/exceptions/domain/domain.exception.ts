import { AbstractException } from '../abstract.exception';
import { ExceptionCode } from '../exception-code';

export class DomainException extends AbstractException {
  constructor(message: string, exceptionCodes: Array<ExceptionCode | string> = []) {
    super(message, [ExceptionCode.DomainException, ...exceptionCodes]);
  }
}
