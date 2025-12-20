import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';
import { StringValidator } from '../../primitive-validator/string.validator';

export function CanBeStringValidator(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'canBeString',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          return StringValidator.canBeString(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a string`;
        },
      },
    });
  };
}
