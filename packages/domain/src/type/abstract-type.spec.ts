import { describe, expect, it } from '@jest/globals';
import { AbstractType } from './abstract-type';
import { expectTypeOf } from 'expect-type';

export class ValueGenerator {
  static valueString(value: string): any {
    return value;
  }

  static valueBoolean(value: boolean): any {
    return value;
  }

  static valueNumber(value: number): any {
    return value;
  }

  static array(value: any[]): any {
    return value;
  }
}

describe('Abstract Type', () => {
  describe('Validation abstract Type', () => {
    it('should be required number type', () => {
      class A {
        constructor(public value: number) {}
      }

      expectTypeOf<A['value']>().toEqualTypeOf<number>();
      expectTypeOf<number>().toEqualTypeOf<A['value']>();
    });

    it('should correctly handle type validation for value with null and number ', () => {
      class B extends AbstractType<number, null> {
        constructor(value: number | null = null) {
          super(value);
        }

        protected filter(value: number | null): number | null {
          return value;
        }
      }

      expectTypeOf<B['value']>().toEqualTypeOf<number | null>();
      expectTypeOf<number | null>().toEqualTypeOf<B['value']>();

      const instance1 = new B();
      expectTypeOf(instance1.value).toEqualTypeOf<number | null>();

      const instance2 = new B(42);
      expectTypeOf(instance2.value).toEqualTypeOf<number | null>();

      const instance3 = new B(null);
      expectTypeOf(instance3.value).toEqualTypeOf<number | null>();
    });

    it('should correctly handle type validation for strict value number ', () => {
      class C extends AbstractType<number> {
        constructor(value = 0) {
          super(value);
        }

        protected filter(value: number): number {
          return value;
        }
      }

      expectTypeOf<C['value']>().toEqualTypeOf<number>();
      expectTypeOf<number>().toEqualTypeOf<C['value']>();

      const instance1 = new C();
      expectTypeOf(instance1.value).toEqualTypeOf<number>();

      const instance2 = new C(42);
      expectTypeOf(instance2.value).toEqualTypeOf<number>();
    });
  });

  describe('String Type', () => {
    it('should be', () => {
      expect(ValueGenerator.valueString('string')).toEqual('string');
      expect(ValueGenerator.valueBoolean(true)).toEqual(true);
      expect(ValueGenerator.valueBoolean(false)).toEqual(false);
      expect(ValueGenerator.valueNumber(0)).toEqual(0);
      expect(ValueGenerator.valueNumber(1)).toEqual(1);
    });
  });

  describe('TestBaseType', () => {
    class TestBaseType extends AbstractType<string, null> {
      constructor(value: string | null = null) {
        super(value);
      }

      get toString(): string {
        if (this.isNull) {
          return '';
        }
        return this.value as string;
      }

      protected filter(value: string): string {
        return value;
      }
    }

    it('is null', () => {
      const object = new TestBaseType();
      expect(object.isNull).toEqual(true);
    });

    it('is not null', () => {
      const object = new TestBaseType();
      expect(object.isNotNull).toEqual(false);
    });

    // it('valid', () => {
    //   const object = new TestBaseType();
    //   expect(object.isValid()).toEqual(false);
    // });
    //
    // it('valid default message', () => {
    //   const object = new TestBaseType();
    //   expect(object.validatorMessageStr()).toEqual('an unknown value was passed to the validate function');
    // });
  });
});
