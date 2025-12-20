import 'reflect-metadata';
import { ValidationStorage } from './validation-storage';
import { ValidatorMapI, validatorsMap } from './validators-map';
import { validateSync, ValidationError } from 'class-validator';
import { ValidatorOptions } from 'class-validator/types/validation/ValidatorOptions';
import { ValidatorsDoc } from './validators-doc';

function registerDecorator(cls: Function, validatorConfigs: ValidatorMapI[], propertyKey: string) {
  validatorConfigs.forEach((config) => {
    let validator: any;
    if (typeof config.validator === 'string' && validatorsMap[config.validator]) {
      validator = validatorsMap[config.validator];
      if (!validator) {
        throw new Error(`Validator ${config.validator} is not supported.`);
      }
    } else {
      validator = config.validator;
    }

    if (config.value) {
      validator(config.value, config.options)(cls.prototype, propertyKey);
    } else {
      validator(config.options)(cls.prototype, propertyKey);
    }
  });
  ValidationStorage.getInstance().addValidations(cls, propertyKey, validatorConfigs);
}

function applyParentValidations(cls: Function, propertyKey: string) {
  const parentPrototype = Object.getPrototypeOf(cls.prototype);
  if (parentPrototype && parentPrototype !== Object.prototype) {
    const parentValidatorConfigs = ValidationStorage.getInstance().getValidations(parentPrototype.constructor, propertyKey);
    if (parentValidatorConfigs.length > 0) {
      registerDecorator(cls, parentValidatorConfigs, propertyKey);
    }
  }
}

export function AddValidate(validatorConfigs: ValidatorMapI[], propertyKey: string = '_value') {
  return function (cls: Function) {
    applyParentValidations(cls, propertyKey);
    registerDecorator(cls, validatorConfigs, propertyKey);
    const validatorList = ValidationStorage.getInstance().getValidations(cls, propertyKey);
    const documentation = ValidatorsDoc.instance.generatePropertySchema(validatorList);
    Reflect.defineMetadata('type:doc', documentation, cls);
  };
}

function replacePropertyWithClassName(errors: ValidationError[]): ValidationError[] {
  errors.forEach((error) => {
    if (error.target) {
      const className = error.target.constructor.name;
      const property = error.property;
      if (error.constraints) {
        Object.keys(error.constraints).forEach((key) => {
          // @ts-expect-error: dynamic modify in runtime
          error.constraints[key] = error.constraints[key].replace(new RegExp(property, 'g'), className);
        });
      }
    }
  });
  return errors;
}

function getClassHierarchy(klass: any): any[] {
  const hierarchy = [];
  let currentClass = klass;

  while (currentClass && currentClass !== Function.prototype) {
    // @ts-expect-error: dynamic modify in runtime
    hierarchy.push(currentClass);
    currentClass = Object.getPrototypeOf(currentClass);
  }

  return hierarchy;
}

export function validateType(object: object, validatorOptions?: ValidatorOptions): ValidationError[] {
  const errors = validateSync(object, validatorOptions);
  if (errors.length === 0) {
    return errors;
  }
  const classHierarchy = getClassHierarchy(object.constructor);
  const isType = classHierarchy.some((klass) => ValidationStorage.getInstance().hasClassRegister(klass));
  return isType ? replacePropertyWithClassName(errors) : errors;
}
