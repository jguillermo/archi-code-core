import { DomainValidator, DomainValidatorDto } from '@code-core/domain';
import { Validate } from 'class-validator';
import { AccountId } from '../../../domain/account/types/account-id';

export class CloseFinancialAccountDto extends DomainValidatorDto {
  @Validate(DomainValidator, [AccountId])
  accountId?: string;
}
