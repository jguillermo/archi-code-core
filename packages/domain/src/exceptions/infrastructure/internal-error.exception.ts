import { InfrastructureException } from './infrastructure.exception';
import { ExceptionCode } from '../exception-code';

export class InternalErrorException extends InfrastructureException {
  constructor(message: string) {
    super(`Failed, internal error: ${message}`, [ExceptionCode.InternalError]);
  }
}
