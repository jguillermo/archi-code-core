import { IsInt, IsOptional, IsPositive } from 'class-validator';

export class DomainValidatorDto {
  @IsOptional()
  @IsInt()
  @IsPositive()
  public levelValidation = 1;
}
