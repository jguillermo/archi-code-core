import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';
import { BooleanValidator } from '../../primitive-validator/boolean.validator';

export function CanBeBooleanValidator(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'canBeBoolean',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          return BooleanValidator.canBeBoolean(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a boolean`;
        },
      },
    });
  };
}
