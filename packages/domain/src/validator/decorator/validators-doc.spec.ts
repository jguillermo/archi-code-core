import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { ValidatorsDoc } from './validators-doc';
import { ValidatorMapI } from './validators-map';
import { CanBeBooleanValidator } from './custom/can-be-boolean';
import { CanBeDate } from './custom/can-be-date';
import { CanBeJson } from './custom/can-be-json';
import { CanBeNumberValidator } from './custom/can-be-number';
import { CanBeStringValidator } from './custom/can-be-string';
import { JsonSchemaValidator } from './custom/json-schema-validator';

describe('ValidatorsDoc.generatePropertySchema', () => {
  let validatorsDoc: ValidatorsDoc;

  beforeEach(() => {
    validatorsDoc = ValidatorsDoc.instance;
  });

  /**
   * Group: Numeric Validations
   */
  describe('Numeric Validations', () => {
    test('Min: should assign minimum', () => {
      const input: ValidatorMapI[] = [{ validator: 'Min', value: 5 }];
      const { schema, required } = validatorsDoc.generatePropertySchema(input);
      expect(schema).toMatchObject({ type: 'number', minimum: 5 });
      expect(required).toBe(true);
    });

    test('Max: should assign maximum', () => {
      const input: ValidatorMapI[] = [{ validator: 'Max', value: 10 }];
      const { schema } = validatorsDoc.generatePropertySchema(input);
      expect(schema).toMatchObject({ type: 'number', maximum: 10 });
    });

    test('IsPositive: should assign minimum equal to 1', () => {
      const input: ValidatorMapI[] = [{ validator: 'IsPositive' }];
      const { schema } = validatorsDoc.generatePropertySchema(input);
      expect(schema).toMatchObject({ type: 'number', minimum: 1 });
    });

    test('IsNegative: should assign maximum equal to -1', () => {
      const input: ValidatorMapI[] = [{ validator: 'IsNegative' }];
      const { schema } = validatorsDoc.generatePropertySchema(input);
      expect(schema).toMatchObject({ type: 'number', maximum: -1 });
    });

    test('IsDivisibleBy: should assign multipleOf with the given value', () => {
      const input: ValidatorMapI[] = [{ validator: 'IsDivisibleBy', value: 3 }];
      const { schema } = validatorsDoc.generatePropertySchema(input);
      expect(schema).toMatchObject({ type: 'number', multipleOf: 3 });
    });

    test('IsDecimal: should set type "number"', () => {
      const input: ValidatorMapI[] = [{ validator: 'IsDecimal' }];
      const { schema } = validatorsDoc.generatePropertySchema(input);
      expect(schema.type).toBe('number');
    });

    test('IsNumber: should set type "number"', () => {
      const input: ValidatorMapI[] = [{ validator: 'IsNumber' }];
      const { schema } = validatorsDoc.generatePropertySchema(input);
      expect(schema.type).toBe('number');
    });

    test('IsInt: should set type "integer"', () => {
      const input: ValidatorMapI[] = [{ validator: 'IsInt' }];
      const { schema } = validatorsDoc.generatePropertySchema(input);
      expect(schema.type).toBe('integer');
    });

    test('IsLatitude: should set type "number"', () => {
      const input: ValidatorMapI[] = [{ validator: 'IsLatitude' }];
      const { schema } = validatorsDoc.generatePropertySchema(input);
      expect(schema.type).toBe('number');
    });

    test('IsLongitude: should set type "number"', () => {
      const input: ValidatorMapI[] = [{ validator: 'IsLongitude' }];
      const { schema } = validatorsDoc.generatePropertySchema(input);
      expect(schema.type).toBe('number');
    });
  });

  /**
   * Group: String Validations
   */
  describe('String Validations', () => {
    test('MinLength: should assign minLength', () => {
      const input: ValidatorMapI[] = [{ validator: 'MinLength', value: 3 }];
      const { schema } = validatorsDoc.generatePropertySchema(input);
      expect(schema).toMatchObject({ type: 'string', minLength: 3 });
    });

    test('MaxLength: should assign maxLength', () => {
      const input: ValidatorMapI[] = [{ validator: 'MaxLength', value: 30 }];
      const { schema } = validatorsDoc.generatePropertySchema(input);
      expect(schema).toMatchObject({ type: 'string', maxLength: 30 });
    });

    test('Length: should assign minLength and maxLength from an array of two elements', () => {
      const input: ValidatorMapI[] = [{ validator: 'Length', value: [4, 8] }];
      const { schema } = validatorsDoc.generatePropertySchema(input);
      expect(schema).toMatchObject({ type: 'string', minLength: 4, maxLength: 8 });
    });

    test('Matches: should assign pattern using the regular expression', () => {
      const regex = /^[a-z]+$/;
      const input: ValidatorMapI[] = [{ validator: 'Matches', value: regex }];
      const { schema } = validatorsDoc.generatePropertySchema(input);
      expect(schema).toMatchObject({ type: 'string', pattern: regex.toString() });
    });

    test('IsNotEmpty: should assign type "string" and minLength equal to 1', () => {
      const input: ValidatorMapI[] = [{ validator: 'IsNotEmpty' }];
      const { schema } = validatorsDoc.generatePropertySchema(input);
      expect(schema).toMatchObject({ type: 'string', minLength: 1 });
    });

    test('Equals: should assign const with the provided value', () => {
      const input: ValidatorMapI[] = [{ validator: 'Equals', value: 'test' }];
      const { schema } = validatorsDoc.generatePropertySchema(input);
      expect(schema).toMatchObject({ type: 'string', const: 'test' });
    });

    test('NotEquals: should assign "x-validate-NotEquals" with the given value', () => {
      const input: ValidatorMapI[] = [{ validator: 'NotEquals', value: 'noTest' }];
      const { schema } = validatorsDoc.generatePropertySchema(input);
      expect(schema).toMatchObject({ type: 'string', 'x-validate-NotEquals': 'noTest' });
    });

    test('IsEmpty: should assign maxLength equal to 0', () => {
      const input: ValidatorMapI[] = [{ validator: 'IsEmpty' }];
      const { schema } = validatorsDoc.generatePropertySchema(input);
      expect(schema).toMatchObject({ type: 'string', maxLength: 0 });
    });

    test('Contains: should store value in x-validate-Contains', () => {
      const input: ValidatorMapI[] = [{ validator: 'Contains', value: 'sub' }];
      const { schema } = validatorsDoc.generatePropertySchema(input);
      expect(schema['x-validate-Contains']).toBe('sub');
    });

    test('NotContains: should store value in x-validate-NotContains', () => {
      const input: ValidatorMapI[] = [{ validator: 'NotContains', value: 'forbidden' }];
      const { schema } = validatorsDoc.generatePropertySchema(input);
      expect(schema['x-validate-NotContains']).toBe('forbidden');
    });

    test('IsByteLength: should store value in x-validate-IsByteLength', () => {
      const input: ValidatorMapI[] = [{ validator: 'IsByteLength', value: [2, 10] }];
      const { schema } = validatorsDoc.generatePropertySchema(input);
      expect(schema['x-validate-IsByteLength']).toEqual([2, 10]);
    });
  });

  /**
   * Group: Date Validations
   */
  describe('Date Validations', () => {
    test('MinDate: should assign type "string", format "date-time" and x-minDate', () => {
      const input: ValidatorMapI[] = [{ validator: 'MinDate', value: '2020-01-01' }];
      const { schema } = validatorsDoc.generatePropertySchema(input);
      expect(schema).toMatchObject({ type: 'string', format: 'date-time', 'x-minDate': '2020-01-01' });
    });

    test('MaxDate: should assign type "string", format "date-time" and x-maxDate', () => {
      const input: ValidatorMapI[] = [{ validator: 'MaxDate', value: '2022-12-31' }];
      const { schema } = validatorsDoc.generatePropertySchema(input);
      expect(schema).toMatchObject({ type: 'string', format: 'date-time', 'x-maxDate': '2022-12-31' });
    });

    test('IsDate and IsDateString: should assign type "string" and format "date-time"', () => {
      const input1: ValidatorMapI[] = [{ validator: 'IsDate' }];
      const input2: ValidatorMapI[] = [{ validator: 'IsDateString' }];
      const { schema: schema1 } = validatorsDoc.generatePropertySchema(input1);
      const { schema: schema2 } = validatorsDoc.generatePropertySchema(input2);
      expect(schema1).toMatchObject({ type: 'string', format: 'date-time' });
      expect(schema2).toMatchObject({ type: 'string', format: 'date-time' });
    });

    test('IsNumberString: should assign type "string" and pattern for digits', () => {
      const input: ValidatorMapI[] = [{ validator: 'IsNumberString' }];
      const { schema } = validatorsDoc.generatePropertySchema(input);
      expect(schema).toMatchObject({ type: 'string', pattern: '^[0-9]+$' });
    });

    test('IsISO8601: should assign type "string" and format "date-time"', () => {
      const input: ValidatorMapI[] = [{ validator: 'IsISO8601' }];
      const { schema } = validatorsDoc.generatePropertySchema(input);
      expect(schema).toMatchObject({ type: 'string', format: 'date-time' });
    });
  });

  /**
   * Group: Array Validations
   */
  describe('Array Validations', () => {
    test('IsArray: should assign type "array" with default items as { type: "string" }', () => {
      const input: ValidatorMapI[] = [{ validator: 'IsArray' }];
      const { schema } = validatorsDoc.generatePropertySchema(input);
      expect(schema).toMatchObject({ type: 'array', items: { type: 'string' } });
    });

    test('ArrayContains: should assign x-validate-ArrayContains with the given value', () => {
      const input: ValidatorMapI[] = [{ validator: 'ArrayContains', value: 'test' }];
      const { schema } = validatorsDoc.generatePropertySchema(input);
      expect(schema).toMatchObject({ 'x-validate-ArrayContains': 'test' });
    });

    test('ArrayNotContains: should assign x-validate-ArrayNotContains with the given value', () => {
      const input: ValidatorMapI[] = [{ validator: 'ArrayNotContains', value: 'test' }];
      const { schema } = validatorsDoc.generatePropertySchema(input);
      expect(schema).toMatchObject({ 'x-validate-ArrayNotContains': 'test' });
    });

    test('ArrayNotEmpty: should assign type "array" and minItems equal to 1', () => {
      const input: ValidatorMapI[] = [{ validator: 'ArrayNotEmpty' }];
      const { schema } = validatorsDoc.generatePropertySchema(input);
      expect(schema).toMatchObject({ type: 'array', minItems: 1 });
    });

    test('ArrayMinSize: should assign type "array" and minItems equal to the given value', () => {
      const input: ValidatorMapI[] = [{ validator: 'ArrayMinSize', value: 2 }];
      const { schema } = validatorsDoc.generatePropertySchema(input);
      expect(schema).toMatchObject({ type: 'array', minItems: 2 });
    });

    test('ArrayMaxSize: should assign type "array" and maxItems equal to the given value', () => {
      const input: ValidatorMapI[] = [{ validator: 'ArrayMaxSize', value: 5 }];
      const { schema } = validatorsDoc.generatePropertySchema(input);
      expect(schema).toMatchObject({ type: 'array', maxItems: 5 });
    });

    test('ArrayUnique: should assign type "array" and uniqueItems true', () => {
      const input: ValidatorMapI[] = [{ validator: 'ArrayUnique' }];
      const { schema } = validatorsDoc.generatePropertySchema(input);
      expect(schema).toMatchObject({ type: 'array', uniqueItems: true });
    });
  });

  /**
   * Group: Enum Validations
   */
  describe('Enum Validations', () => {
    test('IsEnum: should assign enum values and type "string"', () => {
      enum Colors {
        Red = 'red',
        Blue = 'blue',
        Green = 'green',
      }
      const input: ValidatorMapI[] = [{ validator: 'IsEnum', value: Colors }];
      const { schema, required } = validatorsDoc.generatePropertySchema(input);
      expect(schema.enum).toEqual(['red', 'blue', 'green']);
      expect(schema.type).toBe('string');
      expect(required).toBe(true);
    });

    test('Combination: IsEnum with IsOptional should mark as not required', () => {
      enum Status {
        Active = 'active',
        Inactive = 'inactive',
      }
      const input: ValidatorMapI[] = [{ validator: 'IsEnum', value: Status }, { validator: 'IsOptional' }];
      const { schema, required } = validatorsDoc.generatePropertySchema(input);
      expect(schema.enum).toEqual(['active', 'inactive']);
      expect(schema.type).toBe('string');
      expect(required).toBe(false);
    });

    test('Combination: Multiple enum validators without IsOptional should mark as required', () => {
      enum Days {
        Monday = 'mon',
        Tuesday = 'tue',
      }
      const input: ValidatorMapI[] = [{ validator: 'IsEnum', value: Days }, { validator: 'IsNotEmpty' }];
      const { schema, required } = validatorsDoc.generatePropertySchema(input);
      expect(schema.enum).toEqual(['mon', 'tue']);
      expect(schema.type).toBe('string');
      expect(schema.minLength).toBe(1);
      expect(required).toBe(true);
    });
  });

  /**
   * Group: Extended Validators (No Direct Mapping)
   */
  describe('Extended Validators', () => {
    test('Allow: should assign x-validate-Allow with the given value', () => {
      const input: ValidatorMapI[] = [{ validator: 'Allow', value: 'anything' }];
      const { schema } = validatorsDoc.generatePropertySchema(input);
      expect(schema).toMatchObject({ 'x-validate-Allow': 'anything', type: 'string' });
    });

    test('IsInstance: should assign x-validate-IsInstance with the given value', () => {
      const input: ValidatorMapI[] = [{ validator: 'IsInstance', value: 'classRef' }];
      const { schema } = validatorsDoc.generatePropertySchema(input);
      expect(schema).toMatchObject({ 'x-validate-IsInstance': 'classRef', type: 'string' });
    });

    test('IsDefined: should store flag in x-validate-IsDefined', () => {
      const input: ValidatorMapI[] = [{ validator: 'IsDefined' }];
      const { schema } = validatorsDoc.generatePropertySchema(input);
      expect(schema['x-validate-IsDefined']).toBe(true);
    });

    test('IsJSON: should store flag in x-validate-IsJSON', () => {
      const input: ValidatorMapI[] = [{ validator: 'IsJSON' }];
      const { schema } = validatorsDoc.generatePropertySchema(input);
      expect(schema['x-validate-IsJSON']).toBe(true);
    });

    test('IsJWT: should store flag in x-validate-IsJWT', () => {
      const input: ValidatorMapI[] = [{ validator: 'IsJWT' }];
      const { schema } = validatorsDoc.generatePropertySchema(input);
      expect(schema['x-validate-IsJWT']).toBe(true);
    });

    test('IsLatLong: should store flag in x-validate-IsLatLong', () => {
      const input: ValidatorMapI[] = [{ validator: 'IsLatLong' }];
      const { schema } = validatorsDoc.generatePropertySchema(input);
      expect(schema['x-validate-IsLatLong']).toBe(true);
    });

    test('IsLocale: should store flag in x-validate-IsLocale', () => {
      const input: ValidatorMapI[] = [{ validator: 'IsLocale' }];
      const { schema } = validatorsDoc.generatePropertySchema(input);
      expect(schema['x-validate-IsLocale']).toBe(true);
    });

    test('IsLowercase: should store flag in x-validate-IsLowercase', () => {
      const input: ValidatorMapI[] = [{ validator: 'IsLowercase' }];
      const { schema } = validatorsDoc.generatePropertySchema(input);
      expect(schema['x-validate-IsLowercase']).toBe(true);
    });

    test('IsMACAddress: should store flag in x-validate-IsMACAddress', () => {
      const input: ValidatorMapI[] = [{ validator: 'IsMACAddress' }];
      const { schema } = validatorsDoc.generatePropertySchema(input);
      expect(schema['x-validate-IsMACAddress']).toBe(true);
    });

    test('IsMilitaryTime: should store flag in x-validate-IsMilitaryTime', () => {
      const input: ValidatorMapI[] = [{ validator: 'IsMilitaryTime' }];
      const { schema } = validatorsDoc.generatePropertySchema(input);
      expect(schema['x-validate-IsMilitaryTime']).toBe(true);
    });

    test('IsNotEmptyObject: should store flag in x-validate-IsNotEmptyObject', () => {
      const input: ValidatorMapI[] = [{ validator: 'IsNotEmptyObject' }];
      const { schema } = validatorsDoc.generatePropertySchema(input);
      expect(schema['x-validate-IsNotEmptyObject']).toBe(true);
    });

    test('IsObject: should set type to object', () => {
      const input: ValidatorMapI[] = [{ validator: 'IsObject' }];
      const { schema } = validatorsDoc.generatePropertySchema(input);
      expect(schema.type).toBe('object');
    });

    test('IsOctal: should store flag in x-validate-IsOctal', () => {
      const input: ValidatorMapI[] = [{ validator: 'IsOctal' }];
      const { schema } = validatorsDoc.generatePropertySchema(input);
      expect(schema['x-validate-IsOctal']).toBe(true);
    });

    test('IsPhoneNumber: should store provided value in x-validate-IsPhoneNumber', () => {
      const input: ValidatorMapI[] = [{ validator: 'IsPhoneNumber', value: 'US' }];
      const { schema } = validatorsDoc.generatePropertySchema(input);
      expect(schema['x-validate-IsPhoneNumber']).toBe('US');
    });

    test('IsPort: should store flag in x-validate-IsPort', () => {
      const input: ValidatorMapI[] = [{ validator: 'IsPort' }];
      const { schema } = validatorsDoc.generatePropertySchema(input);
      expect(schema['x-validate-IsPort']).toBe(true);
    });

    test('IsRgbColor: should store flag in x-validate-IsRgbColor', () => {
      const input: ValidatorMapI[] = [{ validator: 'IsRgbColor' }];
      const { schema } = validatorsDoc.generatePropertySchema(input);
      expect(schema['x-validate-IsRgbColor']).toBe(true);
    });

    test('IsUppercase: should store flag in x-validate-IsUppercase', () => {
      const input: ValidatorMapI[] = [{ validator: 'IsUppercase' }];
      const { schema } = validatorsDoc.generatePropertySchema(input);
      expect(schema['x-validate-IsUppercase']).toBe(true);
    });

    test('IsVariableWidth: should store flag in x-validate-IsVariableWidth', () => {
      const input: ValidatorMapI[] = [{ validator: 'IsVariableWidth' }];
      const { schema } = validatorsDoc.generatePropertySchema(input);
      expect(schema['x-validate-IsVariableWidth']).toBe(true);
    });

    test('IsBoolean: should set type to boolean', () => {
      const input: ValidatorMapI[] = [{ validator: 'IsBoolean' }];
      const { schema } = validatorsDoc.generatePropertySchema(input);
      expect(schema.type).toBe('boolean');
    });
  });

  /**
   * Group: Generic String Validations
   */
  describe('Generic String Validations', () => {
    test('IsAlphanumeric: should assign type "string"', () => {
      const input: ValidatorMapI[] = [{ validator: 'IsAlphanumeric' }];
      const { schema } = validatorsDoc.generatePropertySchema(input);
      expect(schema).toMatchObject({ type: 'string' });
    });

    test('IsBase64: should assign type "string"', () => {
      const input: ValidatorMapI[] = [{ validator: 'IsBase64' }];
      const { schema } = validatorsDoc.generatePropertySchema(input);
      expect(schema).toMatchObject({ type: 'string' });
    });

    test('IsBooleanString: should assign type "string" and boolean pattern', () => {
      const input: ValidatorMapI[] = [{ validator: 'IsBooleanString' }];
      const { schema } = validatorsDoc.generatePropertySchema(input);
      expect(schema).toMatchObject({ type: 'string', pattern: '^(true|false)$' });
    });

    test('IsString: should assign type "string"', () => {
      const input: ValidatorMapI[] = [{ validator: 'IsString' }];
      const { schema } = validatorsDoc.generatePropertySchema(input);
      expect(schema.type).toBe('string');
    });

    test('IsBtcAddress: should store provided value in x-validate-IsBtcAddress', () => {
      const input: ValidatorMapI[] = [{ validator: 'IsBtcAddress', value: 'btcValue' }];
      const { schema } = validatorsDoc.generatePropertySchema(input);
      expect(schema['x-validate-IsBtcAddress']).toBe('btcValue');
    });
  });

  /**
   * Group: Optional and Required Validations
   */
  describe('Optional and Required Validations', () => {
    test('IsOptional: should mark the property as not required', () => {
      const input: ValidatorMapI[] = [{ validator: 'IsOptional' }];
      const { required } = validatorsDoc.generatePropertySchema(input);
      expect(required).toBe(false);
    });

    test('Combination: IsNotEmpty with IsOptional should mark as not required', () => {
      const input: ValidatorMapI[] = [{ validator: 'IsNotEmpty' }, { validator: 'IsOptional' }];
      const { schema, required } = validatorsDoc.generatePropertySchema(input);
      expect(schema).toMatchObject({ type: 'string', minLength: 1 });
      expect(required).toBe(false);
    });

    test('Combination: Multiple required validators (IsNotEmpty, MinLength, IsEmail) should mark as required', () => {
      const input: ValidatorMapI[] = [{ validator: 'IsNotEmpty' }, { validator: 'MinLength', value: 5 }, { validator: 'IsEmail' }];
      const { schema, required } = validatorsDoc.generatePropertySchema(input);
      expect(schema).toMatchObject({ type: 'string', minLength: 5, format: 'email' });
      expect(required).toBe(true);
    });

    test('Combination: Conflicting validators with one IsOptional should mark as not required', () => {
      const input: ValidatorMapI[] = [{ validator: 'MinLength', value: 8 }, { validator: 'MaxLength', value: 20 }, { validator: 'IsNotEmpty' }, { validator: 'IsOptional' }];
      const { schema, required } = validatorsDoc.generatePropertySchema(input);
      expect(schema).toMatchObject({ type: 'string', minLength: 1, maxLength: 20 });
      expect(required).toBe(false);
    });

    test('Combination: Only required validators (IsNotEmpty and IsIn) should mark as required', () => {
      const input: ValidatorMapI[] = [{ validator: 'IsNotEmpty' }, { validator: 'IsIn', value: ['red', 'green', 'blue'] }];
      const { schema, required } = validatorsDoc.generatePropertySchema(input);
      expect(schema).toMatchObject({ type: 'string', minLength: 1, enum: ['red', 'green', 'blue'] });
      expect(required).toBe(true);
    });

    test('Combination: Multiple validations without IsOptional should mark as required and emit a warning for type conflict', () => {
      // "Min" and "Max" set numeric type, but "IsNotEmpty" forces type "string"
      const input: ValidatorMapI[] = [{ validator: 'Min', value: 3 }, { validator: 'Max', value: 10 }, { validator: 'IsNotEmpty' }];

      // Spy on console.warn to check if warning is emitted
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const { schema, required } = validatorsDoc.generatePropertySchema(input);

      // Expect numeric mappers to prevail: type remains "number"
      expect(schema).toMatchObject({ type: 'string', minimum: 3, maximum: 10 });
      expect(required).toBe(true);

      // Verify that a warning was issued about the type conflict
      expect(warnSpy).toHaveBeenCalledWith('Warning: Type changed from "number" to "string" due to conflicting validators.');

      warnSpy.mockRestore();
    });

    test('If base has no type and addition sets type "string", no warning is emitted', () => {
      // Simulate a situation where the base schema is initially empty,
      // and only a string validator (MinLength) is applied.
      const input: ValidatorMapI[] = [{ validator: 'MinLength', value: 5 }];

      // Spy on console.warn to verify that no warning is issued.
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const { schema, required } = validatorsDoc.generatePropertySchema(input);

      // Since there is no prior type in the base schema, setting type to "string" is acceptable.
      expect(schema).toMatchObject({ type: 'string', minLength: 5 });
      expect(warnSpy).not.toHaveBeenCalled();
      expect(required).toBe(true);

      warnSpy.mockRestore();
    });

    test('Combination: integer to number  , not show warning', () => {
      // "Min" and "Max" set numeric type, but "IsNotEmpty" forces type "string"
      const input: ValidatorMapI[] = [{ validator: 'IsInt' }, { validator: 'IsLatitude', value: 10 }];

      // Spy on console.warn to check if warning is emitted
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const { schema } = validatorsDoc.generatePropertySchema(input);

      expect(schema).toMatchObject({ type: 'number' });

      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    test('Combination: number to integer   , not show warning', () => {
      // "Min" and "Max" set numeric type, but "IsNotEmpty" forces type "string"
      const input: ValidatorMapI[] = [{ validator: 'IsLatitude' }, { validator: 'IsInt' }];

      // Spy on console.warn to check if warning is emitted
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const { schema } = validatorsDoc.generatePropertySchema(input);

      expect(schema).toMatchObject({ type: 'integer' });

      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    test('If base has no type and addition sets type empty to  "string", no warning is emitted', () => {
      // Simulate a situation where the base schema is initially empty,
      // and only a string validator (MinLength) is applied.
      const input: ValidatorMapI[] = [{ validator: 'IsMongoId' }, { validator: 'MinLength', value: 5 }];

      // Spy on console.warn to verify that no warning is issued.
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const { schema, required } = validatorsDoc.generatePropertySchema(input);

      // Since there is no prior type in the base schema, setting type to "string" is acceptable.
      expect(schema).toMatchObject({ type: 'string', minLength: 5 });
      expect(warnSpy).not.toHaveBeenCalled();
      expect(required).toBe(true);

      warnSpy.mockRestore();
    });

    test('Combination: Required array validations (IsArray, ArrayNotEmpty) should mark as required', () => {
      const input: ValidatorMapI[] = [{ validator: 'IsArray' }, { validator: 'ArrayNotEmpty' }];
      const { schema, required } = validatorsDoc.generatePropertySchema(input);
      expect(schema).toMatchObject({ type: 'array', minItems: 1, items: { type: 'string' } });
      expect(required).toBe(true);
    });

    test('Combination: Array validations with IsOptional should mark as not required', () => {
      const input: ValidatorMapI[] = [{ validator: 'IsArray' }, { validator: 'ArrayMinSize', value: 2 }, { validator: 'IsOptional' }];
      const { schema, required } = validatorsDoc.generatePropertySchema(input);
      expect(schema).toMatchObject({ type: 'array', minItems: 2, items: { type: 'string' } });
      expect(required).toBe(false);
    });

    test('Complex Combination: Multiple validators for string with no IsOptional should mark as required', () => {
      const input: ValidatorMapI[] = [
        { validator: 'IsNotEmpty' },
        { validator: 'MinLength', value: 4 },
        { validator: 'MaxLength', value: 12 },
        { validator: 'Matches', value: /^[a-zA-Z]+$/ },
        { validator: 'IsEmail' },
      ];
      const { schema, required } = validatorsDoc.generatePropertySchema(input);
      expect(required).toBe(true);
      expect(schema.type).toBe('string');
      expect(schema.minLength).toBe(4);
      expect(schema.format).toBe('email');
      expect(schema.pattern).toBe(/^[a-zA-Z]+$/.toString());
    });

    test('Complex Combination: Multiple validators for string with IsOptional present should mark as not required', () => {
      const input: ValidatorMapI[] = [
        { validator: 'IsNotEmpty' },
        { validator: 'MinLength', value: 4 },
        { validator: 'MaxLength', value: 12 },
        { validator: 'Matches', value: /^[a-zA-Z]+$/ },
        { validator: 'IsEmail' },
        { validator: 'IsOptional' },
      ];
      const { schema, required } = validatorsDoc.generatePropertySchema(input);
      expect(required).toBe(false);
      expect(schema.type).toBe('string');
      expect(schema.minLength).toBe(4);
      expect(schema.format).toBe('email');
      expect(schema.pattern).toBe(/^[a-zA-Z]+$/.toString());
    });
  });

  /**
   * Group: Additional Generic String Validations
   */
  describe('Additional Generic String Validations', () => {
    test('IsAlphanumeric: should assign type "string"', () => {
      const input: ValidatorMapI[] = [{ validator: 'IsAlphanumeric' }];
      const { schema } = validatorsDoc.generatePropertySchema(input);
      expect(schema).toMatchObject({ type: 'string' });
    });

    test('IsBase64: should assign type "string"', () => {
      const input: ValidatorMapI[] = [{ validator: 'IsBase64' }];
      const { schema } = validatorsDoc.generatePropertySchema(input);
      expect(schema).toMatchObject({ type: 'string' });
    });

    test('IsBooleanString: should assign type "string" with boolean pattern', () => {
      const input: ValidatorMapI[] = [{ validator: 'IsBooleanString' }];
      const { schema } = validatorsDoc.generatePropertySchema(input);
      expect(schema).toMatchObject({ type: 'string', pattern: '^(true|false)$' });
    });

    test('IsString: should assign type "string"', () => {
      const input: ValidatorMapI[] = [{ validator: 'IsString' }];
      const { schema } = validatorsDoc.generatePropertySchema(input);
      expect(schema.type).toBe('string');
    });

    test('IsBtcAddress: should store provided value in x-validate-IsBtcAddress', () => {
      const input: ValidatorMapI[] = [{ validator: 'IsBtcAddress', value: 'btcValue' }];
      const { schema } = validatorsDoc.generatePropertySchema(input);
      expect(schema['x-validate-IsBtcAddress']).toBe('btcValue');
    });
  });

  describe('Custom Mappings', () => {
    test('CanBeBooleanValidator: should set type to boolean', () => {
      const input: ValidatorMapI[] = [{ validator: CanBeBooleanValidator }];
      const { schema, required } = validatorsDoc.generatePropertySchema(input);
      expect(schema.type).toBe('boolean');
      expect(required).toBe(true);
    });

    test('CanBeDate: should set type to string and format to date-time', () => {
      const input: ValidatorMapI[] = [{ validator: CanBeDate }];
      const { schema, required } = validatorsDoc.generatePropertySchema(input);
      expect(schema.type).toBe('string');
      expect(schema.format).toBe('date-time');
      expect(required).toBe(true);
    });

    test('CanBeJson: should set type to object', () => {
      const input: ValidatorMapI[] = [{ validator: CanBeJson }];
      const { schema, required } = validatorsDoc.generatePropertySchema(input);
      expect(schema.type).toBe('object');
      expect(required).toBe(true);
    });

    test('CanBeNumberValidator: should set type to number', () => {
      const input: ValidatorMapI[] = [{ validator: CanBeNumberValidator }];
      const { schema, required } = validatorsDoc.generatePropertySchema(input);
      expect(schema.type).toBe('number');
      expect(required).toBe(true);
    });

    test('CanBeStringValidator: should set type to string', () => {
      const input: ValidatorMapI[] = [{ validator: CanBeStringValidator }];
      const { schema, required } = validatorsDoc.generatePropertySchema(input);
      expect(schema.type).toBe('string');
      expect(required).toBe(true);
    });
    // Test combinations with IsOptional

    test('CanBeNumberValidator combined with IsOptional should mark as not required', () => {
      const input: ValidatorMapI[] = [{ validator: CanBeNumberValidator }, { validator: 'IsOptional' }];
      const { schema, required } = validatorsDoc.generatePropertySchema(input);
      expect(schema.type).toBe('number');
      expect(required).toBe(false);
    });

    test('JsonSchemaValidator: should set type to schema validator', () => {
      const jsonSchema = {
        type: 'object',
        properties: {
          a: { type: 'number', minimum: 10 },
          email: { type: 'string', format: 'email' },
        },
        required: ['a', 'email'],
        additionalProperties: false,
      };
      const input: ValidatorMapI[] = [{ validator: JsonSchemaValidator, value: jsonSchema }];
      const { schema, required } = validatorsDoc.generatePropertySchema(input);
      expect(schema.type).toBe('object');
      //todo: aun falta mejorar mas la data de objeto, hacer mas test al respecto
      expect(schema.properties).toEqual({
        a: {
          minimum: 10,
          type: 'number',
        },
        email: {
          format: 'email',
          type: 'string',
        },
      });
      expect(required).toBe(true);
    });

    test('JsonSchemaValidator: message anidator itms', () => {
      const jsonSchema = {
        type: 'object',
        properties: {
          username_password: {
            type: 'object',
            properties: {
              userName: { type: 'string', minLength: 5 },
              password: { type: 'string', minLength: 6 },
            },
            required: ['userName', 'password'],
          },
        },
        if: {
          properties: {
            username_password: { type: 'object' },
          },
        },
        then: {
          required: ['username_password'],
        },
        additionalProperties: false,
      };
      const input: ValidatorMapI[] = [{ validator: JsonSchemaValidator, value: jsonSchema }];
      const { schema, required } = validatorsDoc.generatePropertySchema(input);
      expect(schema.type).toBe('object');

      expect(schema.properties).toEqual({
        username_password: {
          properties: {
            password: {
              minLength: 6,
              type: 'string',
            },
            userName: {
              minLength: 5,
              type: 'string',
            },
          },
          required: ['userName', 'password'],
          type: 'object',
        },
      });
      expect(required).toBe(true);
    });

    // Test combinations with additional validations

    test('CanBeDate combined with MinDate should set format "date-time" and x-minDate', () => {
      const input: ValidatorMapI[] = [{ validator: CanBeDate }, { validator: 'MinDate', value: '2021-01-01' }];
      const { schema, required } = validatorsDoc.generatePropertySchema(input);
      // Expect that the type and format are "string" and "date-time"
      // and that the x-minDate property is added from MinDate.
      expect(schema.type).toBe('string');
      expect(schema.format).toBe('date-time');
      expect(schema['x-minDate']).toBe('2021-01-01');
      expect(required).toBe(true);
    });

    test('CanBeStringValidator combined with MinLength should set type "string" and minLength', () => {
      const input: ValidatorMapI[] = [{ validator: CanBeStringValidator }, { validator: 'MinLength', value: 5 }];
      const { schema, required } = validatorsDoc.generatePropertySchema(input);
      expect(schema.type).toBe('string');
      expect(schema.minLength).toBe(5);
      expect(required).toBe(true);
    });
  });
});
