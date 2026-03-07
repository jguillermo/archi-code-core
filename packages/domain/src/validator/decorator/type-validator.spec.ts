import { describe, expect, it } from '@jest/globals';
import { AddValidate, validateType } from './type-validator';
import { PrimitivesKeys, skipByType } from '@code-core/test';
import { TypePrimitiveException } from '../../exceptions/domain/type-primitive.exception';

@AddValidate([
  {
    validator: 'MinLength',
    value: 3,
    options: { message: 'Name is too short' },
  },
  { validator: 'MaxLength', value: 20 },
])
class User {
  public _value: string;

  constructor(value: string) {
    this._value = value;
  }
}

describe('Validator', () => {
  it('error validator', async () => {
    const user = new User('J');
    const errors = await validateType(user);
    expect(errors.length).toEqual(1);
    expect(errors[0].property).toEqual('_value');
    expect(errors[0].constraints?.minLength).toBeDefined();
    expect(errors[0].constraints?.minLength).toEqual('Name is too short');
  });

  it('correct validator', async () => {
    const user = new User('John');
    const errors = await validateType(user);
    expect(errors.length).toEqual(0);
  });

  it('should add parent validator and documentation', async () => {
    class ParentPArentClass {
      private _value: any;

      constructor(value: any) {
        this._value = value;
      }

      get value(): any {
        return this._value;
      }
    }

    @AddValidate([{ validator: 'IsNumber' }])
    class ParentClass extends ParentPArentClass {
      constructor(value: any) {
        super(value);
      }
    }

    @AddValidate([{ validator: 'IsInt' }])
    class ChildClass extends ParentClass {}

    // ValidationStorage.getInstance().log();

    const childInstance = new ChildClass('ChildClassStr'); // Esto debería fallar la validación IsInt
    const childErrors = await validateType(childInstance);
    // Validation error for '_value' property
    const valueError = childErrors.find((error) => error.property === '_value');
    expect(valueError).toBeDefined();
    expect(valueError?.constraints).toEqual({
      isNumber: 'ChildClass must be a number conforming to the specified constraints',
      isInt: 'ChildClass must be an integer number',
    });

    expect(Reflect.getMetadata('type:doc', ParentClass)).toEqual({
      required: true,
      schema: {
        type: 'number',
      },
    });

    expect(Reflect.getMetadata('type:doc', ChildClass)).toEqual({
      required: true,
      schema: {
        type: 'integer',
      },
    });
  });

  describe('should validate herency class', () => {
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

    const errorData = {
      isInt: 'ChildClass must be an integer number',
      isNumber: 'ChildClass must be a number conforming to the specified constraints',
      max: 'ChildClass must not be greater than 20',
      min: 'ChildClass must not be less than 10',
    };

    it('should validate ChildClass documentation', () => {
      expect(Reflect.getMetadata('type:doc', ChildClass)).toEqual({
        required: true,
        schema: {
          type: 'number',
          minimum: 10,
          maximum: 20,
        },
      });
    });

    it.each([
      [10, 10],
      [15, 15],
      [20, 20],
    ])('ChildClass(%p).value toEqual %p and validates', (input, expected) => {
      const type = new ChildClass(input);
      expect(type.value).toEqual(expected);
      expect(validateType(type)).toEqual([]);
    });

    it.each(skipByType(PrimitivesKeys.NUMBER).map((v) => [v]))(
      'ChildClass(%p) fails with isInt + isNumber + max + min errors',
      (value) => {
        let errors: any[] = [];
        try {
          const type = new ChildClass(value);
          errors = validateType(type);
        } catch (e) {
          if (!(e instanceof TypePrimitiveException)) throw e;
          errors = [{ property: 'value', constraints: { typePrimitive: (e as any)?.message ?? '' } }];
        }
        expect(errors[0]).toBeDefined();
        expect(errors[0].constraints).toBeDefined();
        expect(errors[0].constraints).toEqual({
          isInt: errorData.isInt,
          isNumber: errorData.isNumber,
          max: errorData.max,
          min: errorData.min,
        });
      },
    );

    it('ChildClass(11.1) fails with isInt error', () => {
      const type = new ChildClass(11.1);
      const errors = validateType(type);
      expect(errors[0]).toBeDefined();
      expect(errors[0].constraints).toBeDefined();
      expect(errors[0].constraints).toEqual({ isInt: errorData.isInt });
    });

    it.each([[50], [50.0]])('ChildClass(%p) fails with max error', (value) => {
      const type = new ChildClass(value);
      const errors = validateType(type);
      expect(errors[0]).toBeDefined();
      expect(errors[0].constraints).toBeDefined();
      expect(errors[0].constraints).toEqual({ max: errorData.max });
    });
  });
});
