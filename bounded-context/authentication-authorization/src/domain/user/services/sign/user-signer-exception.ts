import { InfrastructureException } from '@code-core/domain';

export class UserSignerException extends InfrastructureException {
  constructor(message: string) {
    super(message, ['DATA-SIGNER-001']);
  }
}
