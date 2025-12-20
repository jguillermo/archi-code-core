import { beforeAll, describe, expect, test } from '@jest/globals';
import { ValidationStorage } from './validation-storage';
import { ValidatorMapI } from './validators-map';

describe('ValidationStorage', () => {
  let storage: ValidationStorage;

  beforeAll(() => {
    storage = ValidationStorage.getInstance();
  });

  test('should be a singleton', () => {
    const instance1 = ValidationStorage.getInstance();
    const instance2 = ValidationStorage.getInstance();
    expect(instance1).toBe(instance2);
  });

  test('should add and retrieve validations for a class property', () => {
    class TestClass {}

    const validator: ValidatorMapI = {
      validator: 'IsEmail',
      options: { message: 'Invalid email' },
    };
    storage.addValidations(TestClass, 'testProperty', [validator]);

    const validations = storage.getValidations(TestClass, 'testProperty');
    expect(validations).toHaveLength(1);
    expect(validations[0]).toBe(validator);
  });

  test('should concatenate validations if they already exist', () => {
    class TestClass {}

    const validator1: ValidatorMapI = {
      validator: 'IsEmail',
      options: { message: 'Invalid email' },
    };
    const validator2: ValidatorMapI = {
      validator: 'IsString',
      options: { message: 'Must be a string' },
    };
    storage.addValidations(TestClass, 'testProperty', [validator1]);
    storage.addValidations(TestClass, 'testProperty', [validator2]);

    const validations = storage.getValidations(TestClass, 'testProperty');
    expect(validations).toHaveLength(2);
    expect(validations).toContain(validator1);
    expect(validations).toContain(validator2);
  });

  test('should return empty array if no validations are present', () => {
    class TestClass {}

    const validations = storage.getValidations(TestClass, 'nonExistentProperty');
    expect(validations).toHaveLength(0);
  });
});
