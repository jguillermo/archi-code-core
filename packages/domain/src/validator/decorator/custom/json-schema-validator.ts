import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';
import Ajv from 'ajv';

import { JsonValidator as JsonValidatorCore } from '../../primitive-validator/json.validator';
import { JSON_FORMAT_VALIDATES } from '../json-fotmat-validate';

export function JsonSchemaValidator(jsonSchema: any, validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      name: 'schemaValidator',
      target: object.constructor,
      constraints: [jsonSchema],
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: any) {
          if ((args as any).constraints[0].errors) {
            delete (args as any).constraints[0].errors;
          }
          if (!JsonValidatorCore.canBeJson(value)) {
            // esto parece raro, pero esta validacon ya esta en el canBeJson y aqui solo debeia llegar valores correctos, por eso no se valida, porque ya se valido antes y ya saliio eerror en al otro afuncion
            return true;
          }
          //todo, mejorar la instancia a un singleton
          const ajv = new Ajv({ allErrors: true });
          Object.keys(JSON_FORMAT_VALIDATES).forEach((formatName) => {
            ajv.addFormat(formatName, JSON_FORMAT_VALIDATES[formatName]);
          });

          const validate = ajv.compile(jsonSchema);

          const valid = validate(value);
          if (valid) {
            return true;
          } else {
            (args as any).constraints[0].errors = validate.errors;
            return false;
          }
        },
        defaultMessage(args: ValidationArguments) {
          const errors = (args.constraints[0] as any).errors;
          if (errors && errors.length > 0) {
            const errorMessages = errors.map((error) => `${error.instancePath} ${error.message}`).join(', ');
            return `JsonSchemaValidator:${errorMessages}`;
          }
          return `${args.property} error json schema must be object`;
        },
      },
    });
  };
}
