import { Body, Controller, Post } from '@nestjs/common';
import { UserEmailPasswordRegisterDto, UserRegister } from '@bounded-context/authentication-authorization';
import { UseDto } from '../../../bounded-context/shared/decorator/use-dto.decorator';
import { ApiTags } from '@nestjs/swagger';
import { AuthTag } from './auth-tag';

@ApiTags(AuthTag)
@Controller('register-user')
@UseDto(UserEmailPasswordRegisterDto)
export class RegisterUserController {
  constructor(private readonly userRegister: UserRegister) {}
  @Post('email-password')
  async registerUser(@Body() dto: UserEmailPasswordRegisterDto) {
    const id = await this.userRegister.emailPasswordMethod(dto);
    return { id: id.value };
  }
}
