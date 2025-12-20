import { Body, Controller, Post } from '@nestjs/common';
import { UseDto } from '../../../bounded-context/shared/decorator/use-dto.decorator';
import { ApiTags } from '@nestjs/swagger';
import { AuthTag } from './auth-tag';
import { Login, LoginEmailPasswordDto } from '@bounded-context/authentication-authorization';

@ApiTags(AuthTag)
@Controller(`${AuthTag}/login`)
@UseDto(LoginEmailPasswordDto)
export class LoginController {
  constructor(private readonly login: Login) {}
  @Post('email-password')
  async registerUser(@Body() dto: LoginEmailPasswordDto) {
    const response = await this.login.emailPassword(dto);
    return { token: response.token };
  }
}
