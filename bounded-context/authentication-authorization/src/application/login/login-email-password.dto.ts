import { DomainValidator } from '@code-core/domain';
import { Validate } from 'class-validator';
import { UserEmail } from '../../domain/user/types/userEmail';
import { UserPassword } from '../../domain/user/types/userPassword';

export class LoginEmailPasswordDto {
  @Validate(DomainValidator, [UserEmail])
  public email: string | undefined;

  @Validate(DomainValidator, [UserPassword])
  public password: string | undefined;
}
