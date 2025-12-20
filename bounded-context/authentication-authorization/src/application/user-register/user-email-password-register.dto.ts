import { DomainValidator } from '@code-core/domain';
import { Validate } from 'class-validator';
import { UserName } from '../../domain/user/types/userName';
import { UserEmail } from '../../domain/user/types/userEmail';
import { UserPassword } from '../../domain/user/types/userPassword';

export class UserEmailPasswordRegisterDto {
  @Validate(DomainValidator, [UserName])
  public name: string | undefined;

  @Validate(DomainValidator, [UserEmail])
  public email: string | undefined;

  @Validate(DomainValidator, [UserPassword])
  public password: string | undefined;
}
