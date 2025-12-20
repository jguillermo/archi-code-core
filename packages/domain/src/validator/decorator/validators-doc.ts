import { ValidatorMapI } from './validators-map';
import { ValidationMetadata } from 'class-validator/types/metadata/ValidationMetadata';
import { ValidationTypes } from 'class-validator';

type MappingFunction = (schema: any, value?: any) => void;

export class ValidatorsDoc {
  static #instance: ValidatorsDoc;
  private constructor() {}
  public static get instance(): ValidatorsDoc {
    if (!ValidatorsDoc.#instance) {
      ValidatorsDoc.#instance = new ValidatorsDoc();
    }
    return ValidatorsDoc.#instance;
  }

  private static readonly customMappings: Record<string, MappingFunction> = {
    CanBeBooleanValidator: (schema) => {
      schema.type = 'boolean';
    },
    CanBeDate: (schema) => {
      schema.type = 'string';
      schema.format = 'date-time';
    },
    CanBeJson: (schema) => {
      schema.type = 'object';
    },
    CanBeNumberValidator: (schema) => {
      schema.type = 'number';
    },
    CanBeStringValidator: (schema) => {
      schema.type = 'string';
    },
    JsonSchemaValidator: (schema, value) => {
      schema.type = 'object';
      schema.properties = value?.properties ? value.properties : {};
    },
  };

  // Validadores numéricos: se asigna explícitamente type "number" o "integer".
  private static readonly numericMappings: Record<string, MappingFunction> = {
    Min: (schema, value) => {
      schema.type = 'number';
      schema.minimum = value;
    },
    Max: (schema, value) => {
      schema.type = 'number';
      schema.maximum = value;
    },
    IsPositive: (schema) => {
      schema.type = 'number';
      schema.minimum = 1;
    },
    IsNegative: (schema) => {
      schema.type = 'number';
      schema.maximum = -1;
    },
    IsDivisibleBy: (schema, value) => {
      schema.type = 'number';
      schema.multipleOf = value;
    },
    IsDecimal: (schema) => {
      schema.type = 'number';
    },
    IsNumber: (schema) => {
      schema.type = 'number';
    },
    IsInt: (schema) => {
      schema.type = 'integer';
    },
    IsLatitude: (schema) => {
      schema.type = 'number';
    },
    IsLongitude: (schema) => {
      schema.type = 'number';
    },
  };

  // Validadores de cadenas (string): se asigna explícitamente type "string".
  private static readonly stringMappings: Record<string, MappingFunction> = {
    MinLength: (schema, value) => {
      schema.type = 'string';
      schema.minLength = value;
    },
    MaxLength: (schema, value) => {
      schema.type = 'string';
      schema.maxLength = value;
    },
    Length: (schema, value) => {
      schema.type = 'string';
      if (Array.isArray(value) && value.length === 2) {
        schema.minLength = value[0];
        schema.maxLength = value[1];
      }
    },
    Matches: (schema, value) => {
      schema.type = 'string';
      schema.pattern = value.toString();
    },
    Equals: (schema, value) => {
      schema.type = 'string';
      schema.const = value;
    },
    NotEquals: (schema, value) => {
      schema.type = 'string';
      schema['x-validate-NotEquals'] = value;
    },
    IsEmpty: (schema) => {
      schema.type = 'string';
      schema.maxLength = 0;
    },
    IsNotEmpty: (schema) => {
      schema.type = 'string';
      schema.minLength = 1;
    },
    IsIn: (schema, value) => {
      schema.type = 'string';
      schema.enum = value;
    },
    IsNotIn: (schema, value) => {
      schema.type = 'string';
      schema['x-validate-IsNotIn'] = value;
    },
    Contains: (schema, value) => {
      schema.type = 'string';
      schema['x-validate-Contains'] = value;
    },
    NotContains: (schema, value) => {
      schema.type = 'string';
      schema['x-validate-NotContains'] = value;
    },
    IsByteLength: (schema, value) => {
      schema.type = 'string';
      schema['x-validate-IsByteLength'] = value;
    },
  };

  // Validadores de fecha: se asigna explícitamente type "string" y el formato correspondiente.
  private static readonly dateMappings: Record<string, MappingFunction> = {
    MinDate: (schema, value) => {
      schema.type = 'string';
      schema.format = 'date-time';
      schema['x-minDate'] = value;
    },
    MaxDate: (schema, value) => {
      schema.type = 'string';
      schema.format = 'date-time';
      schema['x-maxDate'] = value;
    },
    IsDate: (schema) => {
      schema.type = 'string';
      schema.format = 'date-time';
    },
    IsDateString: (schema) => {
      schema.type = 'string';
      schema.format = 'date-time';
    },
    IsNumberString: (schema) => {
      schema.type = 'string';
      schema.pattern = '^[0-9]+$';
    },
    IsISO8601: (schema) => {
      schema.type = 'string';
      schema.format = 'date-time';
    },
  };

  // Validadores para arreglos: se asigna explícitamente type "array".
  private static readonly arrayMappings: Record<string, MappingFunction> = {
    IsArray: (schema) => {
      schema.type = 'array';
      if (!schema.items) {
        schema.items = { type: 'string' };
      }
    },
    ArrayContains: (schema, value) => {
      schema['x-validate-ArrayContains'] = value;
    },
    ArrayNotContains: (schema, value) => {
      schema['x-validate-ArrayNotContains'] = value;
    },
    ArrayNotEmpty: (schema) => {
      schema.type = 'array';
      schema.minItems = 1;
    },
    ArrayMinSize: (schema, value) => {
      schema.type = 'array';
      schema.minItems = value;
    },
    ArrayMaxSize: (schema, value) => {
      schema.type = 'array';
      schema.maxItems = value;
    },
    ArrayUnique: (schema) => {
      schema.type = 'array';
      schema.uniqueItems = true;
    },
  };

  // Validadores extendidos (sin mapeo directo a JSON Schema) – se asigna metadata extendida o el tipo cuando corresponde.
  private static readonly extendedMappings: Record<string, MappingFunction> = {
    Allow: (schema, value) => {
      schema['x-validate-Allow'] = value;
    },
    IsInstance: (schema, value) => {
      schema['x-validate-IsInstance'] = value;
    },
    IsDefined: (schema) => {
      schema['x-validate-IsDefined'] = true;
    },
    IsJSON: (schema) => {
      schema['x-validate-IsJSON'] = true;
    },
    IsJWT: (schema) => {
      schema['x-validate-IsJWT'] = true;
    },
    IsLatLong: (schema) => {
      schema['x-validate-IsLatLong'] = true;
    },
    IsLocale: (schema) => {
      schema['x-validate-IsLocale'] = true;
    },
    IsLowercase: (schema) => {
      schema['x-validate-IsLowercase'] = true;
    },
    IsMACAddress: (schema) => {
      schema['x-validate-IsMACAddress'] = true;
    },
    IsMilitaryTime: (schema) => {
      schema['x-validate-IsMilitaryTime'] = true;
    },
    IsNotEmptyObject: (schema) => {
      schema['x-validate-IsNotEmptyObject'] = true;
    },
    IsObject: (schema) => {
      schema.type = 'object';
    },
    IsOctal: (schema) => {
      schema['x-validate-IsOctal'] = true;
    },
    IsPhoneNumber: (schema, value) => {
      schema['x-validate-IsPhoneNumber'] = value;
    },
    IsPort: (schema) => {
      schema['x-validate-IsPort'] = true;
    },
    IsRgbColor: (schema) => {
      schema['x-validate-IsRgbColor'] = true;
    },
    IsUppercase: (schema) => {
      schema['x-validate-IsUppercase'] = true;
    },
    IsVariableWidth: (schema) => {
      schema['x-validate-IsVariableWidth'] = true;
    },
    IsBoolean: (schema) => {
      schema.type = 'boolean';
    },
  };

  // Validadores genéricos de cadena: se asigna explícitamente type "string" y, cuando corresponde, un formato.
  private static readonly genericStringMappings: Record<string, MappingFunction> = {
    IsAlpha: (schema) => {
      schema.type = 'string';
    },
    IsAlphanumeric: (schema) => {
      schema.type = 'string';
    },
    IsAscii: (schema) => {
      schema.type = 'string';
    },
    IsBase32: (schema) => {
      schema.type = 'string';
    },
    IsBase58: (schema) => {
      schema.type = 'string';
    },
    IsBase64: (schema) => {
      schema.type = 'string';
    },
    IsBIC: (schema) => {
      schema.type = 'string';
    },
    IsCreditCard: (schema) => {
      schema.type = 'string';
      schema.format = 'credit-card';
    },
    IsCurrency: (schema) => {
      schema.type = 'string';
    },
    IsDataURI: (schema) => {
      schema.type = 'string';
    },
    IsFQDN: (schema) => {
      schema.type = 'string';
    },
    IsFullWidth: (schema) => {
      schema.type = 'string';
    },
    IsHalfWidth: (schema) => {
      schema.type = 'string';
    },
    IsHash: (schema) => {
      schema.type = 'string';
    },
    IsHexadecimal: (schema) => {
      schema.type = 'string';
    },
    IsHexColor: (schema) => {
      schema.type = 'string';
    },
    IsHSL: (schema) => {
      schema.type = 'string';
    },
    IsIBAN: (schema) => {
      schema.type = 'string';
    },
    IsIdentityCard: (schema) => {
      schema.type = 'string';
    },
    IsPassportNumber: (schema) => {
      schema.type = 'string';
    },
    IsPostalCode: (schema) => {
      schema.type = 'string';
    },
    IsMimeType: (schema) => {
      schema.type = 'string';
    },
    IsMobilePhone: (schema) => {
      schema.type = 'string';
    },
    IsMongoId: (schema) => {
      schema.type = 'string';
    },
    IsMultibyte: (schema) => {
      schema.type = 'string';
    },
    IsSurrogatePair: (schema) => {
      schema.type = 'string';
    },
    IsTaxId: (schema) => {
      schema.type = 'string';
    },
    IsUrl: (schema) => {
      schema.type = 'string';
      schema.format = 'uri';
    },
    IsMagnetURI: (schema) => {
      schema.type = 'string';
    },
    IsUUID: (schema) => {
      schema.type = 'string';
      schema.format = 'uuid';
    },
    IsFirebasePushId: (schema) => {
      schema.type = 'string';
    },
    IsTimeZone: (schema) => {
      schema.type = 'string';
    },
    IsSemVer: (schema) => {
      schema.type = 'string';
    },
    IsISSN: (schema) => {
      schema.type = 'string';
    },
    IsISRC: (schema) => {
      schema.type = 'string';
    },
    IsRFC3339: (schema) => {
      schema.type = 'string';
    },
    IsStrongPassword: (schema) => {
      schema.type = 'string';
    },
    IsEnum: (schema, value) => {
      schema.enum = Object.values(value);
      schema.type = 'string';
    },
    IsEmail: (schema) => {
      schema.type = 'string';
      schema.format = 'email';
    },
    IsBooleanString: (schema) => {
      schema.type = 'string';
      schema.pattern = '^(true|false)$';
    },
    IsString: (schema) => {
      schema.type = 'string';
    },
    IsBtcAddress: (schema, value) => {
      schema['x-validate-IsBtcAddress'] = value;
    },
  };

  // Combina todos los mapeos en uno solo para búsqueda rápida.
  private static readonly allMappings: Record<string, MappingFunction> = {
    ...ValidatorsDoc.numericMappings,
    ...ValidatorsDoc.stringMappings,
    ...ValidatorsDoc.dateMappings,
    ...ValidatorsDoc.arrayMappings,
    ...ValidatorsDoc.extendedMappings,
    ...ValidatorsDoc.genericStringMappings,
    ...ValidatorsDoc.customMappings,
  };

  /**
   * Genera el fragmento del esquema OpenAPI para una propiedad basado en un arreglo de validaciones.
   * @param validators Arreglo de validaciones (ValidatorMapI) para la propiedad.
   * @returns Un objeto con la definición del esquema y un flag "required".
   */
  public generateDoc(validators: ValidationMetadata[]): { schema: any; required: boolean } {
    const validatorsMap: ValidatorMapI[] = validators.map((v) => {
      let validator: any;
      let value: any;

      if (v.type === ValidationTypes.CONDITIONAL_VALIDATION) {
        validator = 'IsOptional';
      } else {
        validator = typeof v.name === 'string' ? v.name.charAt(0).toUpperCase() + v.name.slice(1) : v.name;
        value = v.constraints?.length > 0 ? v.constraints[0] : undefined;
      }

      return {
        validator,
        value,
        //todo: mejorar mas las validaciones paraq ue se acpeten enum, array, y los demas tipos, aun falta validar esos otro metodos
      };
    });
    return this.generatePropertySchema(validatorsMap);
  }

  /**
   * Genera el fragmento del esquema OpenAPI para una propiedad basado en un arreglo de validaciones.
   * @param validators Arreglo de validaciones (ValidatorMapI) para la propiedad.
   * @returns Un objeto con la definición del esquema y un flag "required".
   */
  public generatePropertySchema(validators: ValidatorMapI[]): { schema: any; required: boolean } {
    let schema: any = {};
    let requiredValue = true;

    for (let i = 0, len = validators.length; i < len; i++) {
      const { schema: partSchema, required: isReq } = this.mapValidator(validators[i]);
      if (!isReq) {
        requiredValue = false;
      }
      // Fusiona de forma superficial: las propiedades de partSchema sobrescriben las previas.
      schema = this.mergeSchema(schema, partSchema);
    }

    if (!schema.type) {
      schema.type = 'string';
    }
    return { schema, required: requiredValue };
  }

  /**
   * Fusiona dos fragmentos de esquema de manera superficial.
   *
   * Si el fragmento adicional (addition) define un tipo y éste difiere del tipo ya presente en el esquema base,
   * se emite un warning indicando que se ha cambiado el tipo debido a validadores conflictivos, y se asigna el tipo del fragmento adicional.
   *
   * @param base - El esquema base previamente generado.
   * @param addition - El fragmento de esquema adicional que se desea fusionar.
   * @returns El esquema resultante de la fusión, donde prevalece el tipo definido en el fragmento adicional.
   */
  private mergeSchema(base: any, addition: any): any {
    const merged = { ...base, ...addition };
    if (addition.type) {
      if (base.type && base.type !== addition.type && !((base.type === 'integer' && addition.type === 'number') || (base.type === 'number' && addition.type === 'integer'))) {
        console.warn(`Warning: Type changed from "${base.type}" to "${addition.type}" due to conflicting validators.`);
      }
      merged.type = addition.type; // El último mapeo prevalece.
    }
    return merged;
  }

  /**
   * Mapea una validación individual (vData) a su fragmento de esquema correspondiente.
   * @param vData Un objeto ValidatorMapI.
   * @returns Un objeto con un fragmento del esquema y un flag que indica si la propiedad es requerida.
   */
  private mapValidator(vData: ValidatorMapI): { schema: any; required: boolean } {
    const schema: any = {};
    let required = true;
    let validatorName: string;

    if (typeof vData.validator === 'string') {
      validatorName = vData.validator;
    } else if (typeof vData.validator === 'function') {
      validatorName = vData.validator.name;
    } else {
      return { schema, required };
    }

    if (validatorName === 'IsOptional') {
      required = false;
    } else {
      const mapper = ValidatorsDoc.allMappings[validatorName];
      if (mapper) {
        mapper(schema, vData.value);
      } else {
        schema['x-validate-' + validatorName] = vData.value;
      }
    }

    return { schema, required };
  }
}
