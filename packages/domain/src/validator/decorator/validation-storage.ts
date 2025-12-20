import { ValidatorMapI } from './validators-map';

export class ValidationStorage {
  private static instance: ValidationStorage;
  private _validationMap: Map<symbol, Map<string, ValidatorMapI[]>>;
  private _classMap: WeakMap<Function, symbol>;

  private constructor() {
    this._validationMap = new Map();
    this._classMap = new WeakMap();
  }

  static getInstance(): ValidationStorage {
    if (!ValidationStorage.instance) {
      //console.log('===========Creating new instance=================================Creating new instance=================================Creating new instance=================================Creating new instance=================================Creating new instance======================');
      ValidationStorage.instance = new ValidationStorage();
    }
    return ValidationStorage.instance;
  }

  public hasClassRegister(cls: any): boolean {
    return this._classMap.has(cls);
  }

  private getClassKey(cls: Function): symbol {
    if (!this._classMap.has(cls)) {
      this._classMap.set(cls, Symbol());
    }
    return this._classMap.get(cls)!;
  }

  addValidations(cls: Function, propertyKey: string, validationConfigs: ValidatorMapI[]) {
    const clsKey = this.getClassKey(cls);
    if (!this._validationMap.has(clsKey)) {
      this._validationMap.set(clsKey, new Map());
    }
    const propertyValidations = this._validationMap.get(clsKey);
    if (!propertyValidations?.has(propertyKey)) {
      propertyValidations?.set(propertyKey, []);
    }
    const existingValidations = propertyValidations?.get(propertyKey) || [];
    propertyValidations?.set(propertyKey, existingValidations.concat(validationConfigs));
  }

  getValidations(cls: Function, propertyKey: string): ValidatorMapI[] {
    const clsKey = this.getClassKey(cls);
    return this._validationMap.get(clsKey)?.get(propertyKey) || [];
  }

  log(): any[] {
    const result: any = [];
    //private _validationMap: Map<symbol, Map<string, ValidatorMapI[]>>;
    this._validationMap.forEach((propertiesMap) => {
      propertiesMap.forEach((validations, propertyKey) => {
        const objList = {};
        objList[propertyKey] = validations;
        result.push(objList);
      });
    });

    return result;
  }
}
