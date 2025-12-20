import { AuthenticationMethod } from './authentication-method';
import { UsernamePasswordAuthentication } from './client/username-password-authentication';
import { UserRepository } from '../../user.repository';
import { DomainException } from '@code-core/domain';
import { UserPasswordEncryptor } from '../password-encryptor/user-password-encryptor';
import { AuthenticationType } from './authentication-type';

export class AuthenticationFactory {
  static getAuthenticationMethod(method: AuthenticationType, repository: UserRepository, passwordEncryptor: UserPasswordEncryptor): AuthenticationMethod {
    switch (method.value) {
      case AuthenticationType.client.USERNAME_PASSWORD:
        return new UsernamePasswordAuthentication(repository, passwordEncryptor);
      default:
        throw new DomainException(`Authentication method '${method}' is not supported.`);
    }
  }
}
