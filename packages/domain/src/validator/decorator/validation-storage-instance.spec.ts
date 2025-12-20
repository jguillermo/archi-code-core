import { describe, expect, test } from '@jest/globals';
import { AddValidate } from './type-validator';
import { ValidationStorage } from './validation-storage';

describe('ValidationStorage instance', () => {
  test('should log the validations correctly', () => {
    @AddValidate([{ validator: 'IsNumber' }, { validator: 'IsInt' }])
    class ParentParentClass {
      private _value: any;

      constructor(value: any) {
        this._value = value;
      }

      get value(): any {
        return this._value;
      }
    }

    @AddValidate([
      { validator: 'Min', value: 10 },
      { validator: 'Max', value: 20 },
    ])
    class ParentClass extends ParentParentClass {
      constructor(value: any) {
        super(value);
      }
    }

    class ChildClass extends ParentClass {}

    const data = new ChildClass('ChildClassStr');

    const log = ValidationStorage.getInstance().log();

    expect(log.length).toBe(2);
    expect(data.value).toBe('ChildClassStr');
  });
});
