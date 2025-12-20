import { DomainValidator, DomainValidatorDto } from '@code-core/domain';
import { AuthenticationType } from '../../domain/user/services/authentication/authentication-type';
import { Validate } from 'class-validator';

export class LoginDto extends DomainValidatorDto {
  @Validate(DomainValidator, [AuthenticationType])
  public type?: string;
  public credentials?: Record<string, string>;
}
