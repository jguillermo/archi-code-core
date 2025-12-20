import { Module } from '@nestjs/common';
import { AuthenticationAuthorizationModule } from '../../bounded-context/authentication-authorization/authentication-authorization.module';
import { RegisterUserController } from './controller/register-user.controller';
import { LoginController } from './controller/login.controller';

@Module({
  controllers: [RegisterUserController, LoginController],
  imports: [AuthenticationAuthorizationModule],
})
export class AuthenticationAuthorizationAppModule {}
