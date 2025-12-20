import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';
import { DateValidator } from '../../primitive-validator/date.validator';

export function CanBeDate(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'canBeDate',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          return DateValidator.canBeDate(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a Date or a valid ISO 8601 date string`;
        },
      },
    });
  };
}
