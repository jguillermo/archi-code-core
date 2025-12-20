import { UserRegisterDto } from './user-register.dto';
import { UserRepository } from '../../domain/user/user.repository';
import { UserPasswordEncryptor } from '../../domain/user/services/password-encryptor/user-password-encryptor';
import { User } from '../../domain/user/user';
import { UserTypes } from '../../domain/user/user.types';
import { AuthenticationDetails } from '../../domain/user/types/userAuthenticationDetails';
import { UserEmailPasswordRegisterDto } from './user-email-password-register.dto';
import { AbstractUuidType, Builder, DomainException } from '@code-core/domain';
import { UserId } from '../../domain/user/types/userId';
import { UserEmail } from '../../domain/user/types/userEmail';

export class UserRegister {
  constructor(
    private readonly repository: UserRepository,
    private readonly userPasswordEncryptor: UserPasswordEncryptor,
  ) {}

  async emailPasswordMethod(dto: UserEmailPasswordRegisterDto): Promise<UserId> {
    const id = new UserId(AbstractUuidType.random());
    const user = await this.repository.findByEmail(new UserEmail(dto.email ?? ''));
    if (user) {
      throw new DomainException('User already exists', ['AA0001']);
    }
    await this.execute(
      Builder(UserRegisterDto)
        .id(id.value)
        .name(dto.name ?? '')
        .roles(['user'])
        .details({
          username_password: {
            password: dto.password ?? '',
            userName: dto.email ?? '',
          },
        })
        .build(),
    );
    return id;
  }

  private async execute(dto: UserRegisterDto): Promise<void> {
    const details = await this.encryptPassword(dto.details);
    const userData = new UserTypes(1, {
      id: dto.id as string,
      name: dto.name,
      roles: dto.roles,
      authenticationDetails: details,
    });
    const user = User.create(userData);
    await this.repository.persist(user);
    return;
  }

  private async encryptPassword(details: AuthenticationDetails | null): Promise<AuthenticationDetails | null> {
    if (details === null) {
      return null;
    }
    if (details.username_password) {
      details.username_password.password = await this.userPasswordEncryptor.encrypt(details.username_password.password);
    }
    return details;
  }
}
