import { InfrastructureException } from '@code-core/domain';

export class UserPasswordEncryptorException extends InfrastructureException {
  constructor(message: string) {
    super(message, ['PASS-ENCRYPT-001']);
  }
}
