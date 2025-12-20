import { Validate } from 'class-validator';
import { AccountName } from '../../../domain/account/types/account-name';
import { AccountType } from '../../../domain/account/types/account-type';
import { AccountCurrency } from '../../../domain/account/types/account-currency';
import { AccountBalance } from '../../../domain/account/types/account-balance';
import { AccountFinancialEntity } from '../../../domain/account/types/account-financial-entity';
import { AccountNumber } from '../../../domain/account/types/account-number';
import { AccountListTag } from '../../../domain/account/types/account-list-tag';
import { AccountId } from '../../../domain/account/types/account-id';
import { DomainValidator, DomainValidatorDto } from '@code-core/domain';

export class CreateFinancialAccountDto extends DomainValidatorDto {
  @Validate(DomainValidator, [AccountId])
  id?: string;

  @Validate(DomainValidator, [AccountName])
  name?: string;

  @Validate(DomainValidator, [AccountType])
  type?: string;

  @Validate(DomainValidator, [AccountCurrency])
  currency?: string;

  @Validate(DomainValidator, [AccountBalance])
  balance?: number;

  @Validate(DomainValidator, [AccountFinancialEntity])
  financialEntity?: string;

  @Validate(DomainValidator, [AccountNumber])
  number?: string;

  @Validate(DomainValidator, [AccountListTag])
  tags?: string[];
}
