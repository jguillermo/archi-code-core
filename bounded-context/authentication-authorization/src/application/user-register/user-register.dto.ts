import { DomainValidator, DomainValidatorDto } from '@code-core/domain';
import { Validate } from 'class-validator';
import { UserName } from '../../domain/user/types/userName';
import { UserRoles } from '../../domain/user/types/userPermissions';
import { AuthenticationDetails, UserAuthenticationDetails } from '../../domain/user/types/userAuthenticationDetails';
import { UserId } from '../../domain/user/types/userId';

export class UserRegisterDto extends DomainValidatorDto {
  @Validate(DomainValidator, [UserId])
  public id: string | null = null;

  @Validate(DomainValidator, [UserName])
  public name: string | null = null;

  @Validate(DomainValidator, [UserRoles])
  public roles: string[] | null = null;

  @Validate(DomainValidator, [UserAuthenticationDetails])
  public details: AuthenticationDetails | null = null;
}
