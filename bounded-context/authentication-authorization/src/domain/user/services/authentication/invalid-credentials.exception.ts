import { ApplicationException } from '@code-core/domain';

export class InvalidCredentialsException extends ApplicationException {
  constructor(message: string, code: string) {
    super(message, [code]);
  }
}
