import { AbstractEnumType, AddValidate } from '@code-core/domain';

enum AuthenticationClient {
  USERNAME_PASSWORD = 'username_password',
}

@AddValidate([{ validator: 'IsEnum', value: AuthenticationClient }, { validator: 'IsNotEmpty' }])
export class AuthenticationType extends AbstractEnumType<AuthenticationClient> {
  protected getEnum(): Record<string, AuthenticationClient> {
    return AuthenticationClient;
  }

  static client = AuthenticationClient;
}
