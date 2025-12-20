import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';
import { JsonValidator } from '../../primitive-validator/json.validator';

export function CanBeJson(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'canBeJson',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          return JsonValidator.canBeJson(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a object or a valid JSON string.`;
        },
      },
    });
  };
}
