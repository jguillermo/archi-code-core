import { ValidationArguments, ValidationError, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import { validateType } from '../decorator/type-validator';
import { TypeValidatorInterface } from '../primitive-validator/type-validator-interface';
import { getLevel, normalizeLevel } from '../../level/level.decorator';
import { TypePrimitiveException } from '../../exceptions/domain/type-primitive.exception';

@ValidatorConstraint({ name: 'domainValidator', async: false })
export class DomainValidator implements ValidatorConstraintInterface {
  private static factoryType(value: any, objClass: any): ValidationError[] {
    const type = new objClass(value);
    return validateType(type);
  }

  validate(value: any, args: ValidationArguments): boolean {
    try {
      if (this.shouldSkipLevelValidation(args)) {
        return true;
      }
      const type: TypeValidatorInterface = new args.constraints[0](value);
      return type.isValid();
    } catch (e) {
      return false;
    }
  }

  defaultMessage(args: ValidationArguments): string {
    try {
      if (this.shouldSkipLevelValidation(args)) {
        return '';
      }
      const type: TypeValidatorInterface = new args.constraints[0](args.value);
      return type.validatorMessageStr();
    } catch (e) {
      if (e instanceof TypePrimitiveException) {
        return e.message;
      }
      return 'Validation error';
    }
  }

  private shouldSkipLevelValidation(args: ValidationArguments): boolean {
    if (args.value) {
      return false; // not skip level validation if value is not null
    }
    const level = getLevel(args.constraints[0]);
    const currentLevel = normalizeLevel((args.object as any).levelValidation);
    return level > currentLevel;
  }
}
