import { Module } from '@nestjs/common';
import { Login, UserPasswordEncryptor, UserRegister, UserRepository, UserSigner } from '@bounded-context/authentication-authorization';
import { JwtUserSigner } from './infrastructure/user-sign/jwt-user-signer';
import { BcryptUserPasswordEncryptor } from './infrastructure/user-password-encryptor/bcrypt-user-password-encryptor';
import { UserRepositoryModule } from './infrastructure/user-repository/user-repository.module';

@Module({
  providers: [
    {
      provide: UserSigner,
      useFactory: () => new JwtUserSigner('secretsecretsecretsecretsecretsecretsecretsecretsecret'),
    },
    {
      provide: UserPasswordEncryptor,
      useFactory: () => new BcryptUserPasswordEncryptor(),
    },
    {
      provide: Login,
      useFactory: (userRepository: UserRepository, userSigner: UserSigner, userPasswordEncryptor: UserPasswordEncryptor) =>
        new Login(userRepository, userSigner, userPasswordEncryptor),
      inject: [UserRepository, UserSigner, UserPasswordEncryptor],
    },
    {
      provide: UserRegister,
      useFactory: (userRepository: UserRepository, userPasswordEncryptor: UserPasswordEncryptor) => new UserRegister(userRepository, userPasswordEncryptor),
      inject: [UserRepository, UserPasswordEncryptor],
    },
  ],
  exports: [Login, UserRegister],
  imports: [UserRepositoryModule],
})
export class AuthenticationAuthorizationModule {}
