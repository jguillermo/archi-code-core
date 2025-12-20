import { AuthenticationMethod } from '../authentication-method';
import { User } from '../../../user';
import { UserRepository } from '../../../user.repository';
import { UserPasswordEncryptor } from '../../password-encryptor/user-password-encryptor';
import { InvalidCredentialsException } from '../invalid-credentials.exception';
import { UserEmail } from '../../../types/userEmail';

export class UsernamePasswordAuthentication implements AuthenticationMethod {
  private readonly exceptionError = 'The user does not exist or the password is incorrect';

  constructor(
    private readonly repository: UserRepository,
    private readonly passwordEncryptor: UserPasswordEncryptor,
  ) {}

  async authenticate(credentials: Record<string, string>): Promise<User | null> {
    const { username, password } = credentials;
    const user = await this.repository.findByEmail(new UserEmail(username));
    if (!user) {
      throw new InvalidCredentialsException(this.exceptionError, 'AUTH-101');
    }
    if (!user.password) {
      throw new InvalidCredentialsException(this.exceptionError, 'AUTH-102');
    }
    const isPasswordValid = await this.passwordEncryptor.verify(password, user.password);
    if (!isPasswordValid) {
      throw new InvalidCredentialsException(this.exceptionError, 'AUTH-103');
    }

    return user;
  }
}
