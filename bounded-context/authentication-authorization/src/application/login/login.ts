import { LoginDto } from './login.dto';
import { AuthenticationFactory } from '../../domain/user/services/authentication/authentication-factory';
import { LoginResponse } from './login.response';
import { AuthenticationType } from '../../domain/user/services/authentication/authentication-type';
import { InvalidCredentialsException } from '../../domain/user/services/authentication/invalid-credentials.exception';
import { UserRepository } from '../../domain/user/user.repository';
import { UserSigner } from '../../domain/user/services/sign/user-signer';
import { UserPasswordEncryptor } from '../../domain/user/services/password-encryptor/user-password-encryptor';
import { LoginEmailPasswordDto } from './login-email-password.dto';
import { Builder } from '@code-core/domain';

export class Login {
  constructor(
    private readonly repository: UserRepository,
    private readonly userSigner: UserSigner,
    private readonly userPasswordEncryptor: UserPasswordEncryptor,
  ) {}

  async emailPassword(dto: LoginEmailPasswordDto): Promise<LoginResponse> {
    const loginDto = Builder(LoginDto)
      .type(AuthenticationType.client.USERNAME_PASSWORD)
      .credentials({
        username: dto?.email ?? '',
        password: dto?.password ?? '',
      })
      .build();

    return await this.execute(loginDto);
  }

  private async execute(dto: LoginDto): Promise<LoginResponse> {
    const authMethod = AuthenticationFactory.getAuthenticationMethod(new AuthenticationType(dto.type as any), this.repository, this.userPasswordEncryptor);
    const user = await authMethod.authenticate(dto.credentials ?? {});
    if (!user) throw new InvalidCredentialsException('The user credential is invalid', 'AUTH-001');
    const token = this.userSigner.sign(user.payload());
    return new LoginResponse(token);
  }
}
