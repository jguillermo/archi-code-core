import { describe, expect, it } from '@jest/globals';
import { AddValidate } from '../validator/decorator/type-validator';
import { AbstractArrayType } from './abstract-array-type';
import { NumberTypeRequired } from './index';
import { PrimitiveType } from '../primitive/primitive-type';
import { expectTypeOf } from 'expect-type';

@AddValidate([{ validator: 'Max', value: 100 }])
class Age extends NumberTypeRequired {}

@AddValidate([{ validator: 'IsOptional' }, { validator: 'ArrayMinSize', value: 1 }])
class ArrayTypeOptional extends AbstractArrayType<Age, null> {
  constructor(value: number[] | null = null) {
    super(value);
  }

  getItemClass(value: PrimitiveType<Age>): Age {
    return new Age(value);
  }
}

@AddValidate([{ validator: 'IsNotEmpty' }, { validator: 'ArrayMinSize', value: 1 }])
class ArrayTypeRequired extends AbstractArrayType<Age> {
  getItemClass(value: PrimitiveType<Age>): Age {
    return new Age(value);
  }
}

describe('AbstractArrayType', () => {
  describe('ArrayTypeRequired', () => {
    describe('Valid Values', () => {
      [[1], [1, 2]].forEach((value) => {
        it(`Valid type: AbstractArrayType`, async () => {
          const type = new ArrayTypeRequired(value);
          expect(type.isValid()).toEqual(true);
          expect(type.validatorMessageStr()).toEqual('');
        });
      });
    });
    describe('Invalid Values', () => {
      [
        [[101], 'Item 1: must not be greater than 100'],
        [[101, 105], 'Item 1: must not be greater than 100, Item 2: must not be greater than 100'],
        [[1, 105], 'Item 2: must not be greater than 100'],
        [[], 'must contain at least 1 elements'],
        [null, 'Value mas be to array'],
        [undefined, 'Value mas be to array'],
        // [undefined, 'must be an array, should not be empty, must contain at least 1 elements'],
        // [null, 'must be an array, should not be empty, must contain at least 1 elements'],
      ].forEach((value) => {
        it(`Valid type: AbstractArrayType`, async () => {
          const type = new ArrayTypeRequired(value[0] as any);
          expect(type.isValid()).toEqual(false);
          expect(type.validatorMessageStr()).toEqual(value[1]);
        });
      });
    });

    describe('Invalid Values', () => {
      [
        [['a'], 'Validation Error: Expected a valid Number, but received "a".'],
        [[true], 'Validation Error: Expected a valid Number, but received true.'],
        [[1, 'a', true], 'Validation Error: Expected a valid Number, but received "a".'],
        [1, 'value 1 is not a Array.'],
        ['1', 'value 1 is not a Array.'],
        ['abc', 'value abc is not a Array.'],
        [true, 'value true is not a Array.'],
        [{ a: 1 }, 'value [object Object] is not a Array.'],
      ].forEach((value) => {
        it(`Valid type: AbstractArrayType`, async () => {
          expect(() => new ArrayTypeRequired(value[0] as any)).toThrowError(value[1] as string);
        });
      });
    });

    describe('Compare values', () => {
      [
        [[1], [1]],
        [['1'], [1]],
        [
          [1, 2],
          [1, 2],
        ],
        [
          ['1', '2'],
          [1, 2],
        ],
      ].forEach((value) => {
        it(`compare vales`, async () => {
          const type = new ArrayTypeRequired(value[0] as any);
          expect(type.value).toEqual(value[1]);
        });
      });
    });

    describe('Compare items', () => {
      [
        [[1], [new Age(1)]],
        [['1'], [new Age(1)]],
        [
          [1, 2],
          [new Age(1), new Age(2)],
        ],
      ].forEach((value) => {
        it(`compare vales`, async () => {
          const type = new ArrayTypeRequired(value[0] as any);
          expect(type.items).toEqual(value[1]);
        });
      });
    });

    describe('Array get items', () => {
      [
        [[1], [new Age(1)]],
        [['1'], [new Age(1)]],
        [
          [1, 2],
          [new Age(1), new Age(2)],
        ],
      ].forEach((value) => {
        it(`compare vales`, async () => {
          const type = new ArrayTypeRequired(value[0] as any);
          expect(type.items).toEqual(value[1]);
        });
      });
    });
  });
  describe('ArrayTypeOptional', () => {
    describe('Valid Values', () => {
      [[1], [1, 2]].forEach((value) => {
        it(`Valid type: AbstractArrayType`, async () => {
          const type = new ArrayTypeOptional(value);
          expect(type.isValid()).toEqual(true);
          expect(type.validatorMessageStr()).toEqual('');
        });
      });
    });
    describe('Invalid Values', () => {
      [
        [[], 'must contain at least 1 elements'],
        [undefined, 'Value mas be to array'],
        [null, 'Value mas be to array'],
      ].forEach((value) => {
        it(`Valid type: AbstractArrayType`, async () => {
          const type = new ArrayTypeOptional(value[0] as any);
          expect(type.isValid()).toEqual(false);
          expect(type.validatorMessageStr()).toEqual(value[1]);
        });
      });
    });
    describe('Invalid Values', () => {
      [
        [['a'], 'Validation Error: Expected a valid Number, but received "a".'],
        [[true], 'Validation Error: Expected a valid Number, but received true.'],
        [[1, 'a', true], 'Validation Error: Expected a valid Number, but received "a".'],
        [1, 'value 1 is not a Array.'],
        ['1', 'value 1 is not a Array.'],
        ['abc', 'value abc is not a Array.'],
        [true, 'value true is not a Array.'],
        [{ a: 1 }, 'value [object Object] is not a Array.'],
      ].forEach((value) => {
        it(`Valid type: AbstractArrayType`, async () => {
          expect(() => new ArrayTypeOptional(value[0] as any)).toThrowError(value[1] as string);
        });
      });
    });

    describe('Compare values', () => {
      [
        [[1], [1]],
        [['1'], [1]],
        [
          [1, 2],
          [1, 2],
        ],
        [
          ['1', '2'],
          [1, 2],
        ],
        [null, null],
        [undefined, null],
      ].forEach((value) => {
        it(`compare vales`, async () => {
          const type = new ArrayTypeOptional(value[0] as any);
          expect(type.value).toEqual(value[1]);
        });
      });
    });

    describe('Compare items', () => {
      [
        [null, null],
        [undefined, null],
        [[1], [new Age(1)]],
        [['1'], [new Age(1)]],
        [
          [1, 2],
          [new Age(1), new Age(2)],
        ],
      ].forEach((value) => {
        it(`compare vales`, async () => {
          const type = new ArrayTypeOptional(value[0] as any);
          expect(type.items).toEqual(value[1]);
        });
      });
    });

    describe('Array items', () => {
      [
        [null, null],
        [undefined, null],
        [[1], [new Age(1)]],
        [['1'], [new Age(1)]],
        [
          [1, 2],
          [new Age(1), new Age(2)],
        ],
      ].forEach((value) => {
        it(`compare vales`, async () => {
          const type = new ArrayTypeOptional(value[0] as any);
          expect(type.items).toEqual(value[1]);
        });
      });
    });
  });

  describe('Expect Type', () => {
    type ExpectType = number[];
    it('Expect Type array optional - null', () => {
      const instance1 = new ArrayTypeOptional([5]);
      const instance2 = new ArrayTypeOptional();
      const instance3 = new ArrayTypeOptional(null);

      expectTypeOf<ArrayTypeOptional['value']>().toMatchTypeOf<ExpectType | null>();
      expectTypeOf<ExpectType | null>().toMatchTypeOf<ArrayTypeOptional['value']>();
      expectTypeOf(instance1.value).toMatchTypeOf<ExpectType | null>();
      expectTypeOf(instance2.value).toMatchTypeOf<ExpectType | null>();
      expectTypeOf(instance3.value).toMatchTypeOf<ExpectType | null>();
    });

    it('Expect Type array required', () => {
      const instance1 = new ArrayTypeRequired([5]);
      expectTypeOf<ArrayTypeRequired['value']>().toMatchTypeOf<ExpectType>();
      expectTypeOf<ExpectType>().toMatchTypeOf<ArrayTypeRequired['value']>();
      expectTypeOf(instance1.value).toMatchTypeOf<ExpectType>();
    });
  });
  describe('Array management item', () => {
    describe('ArrayRequired', () => {
      it('add', () => {
        const type = new ArrayTypeRequired([]);
        type.addItem(1);
        expect(type.items).toEqual([new Age(1)]);
        type.addItem(2);
        expect(type.items).toEqual([new Age(1), new Age(2)]);
      });
      it('add string ', () => {
        const type = new ArrayTypeRequired([]);
        type.addItem('1' as any);
        expect(type.items).toEqual([new Age(1)]);
        type.addItem('2' as any);
        expect(type.items).toEqual([new Age(1), new Age(2)]);
      });
      it('add exception ', () => {
        const type = new ArrayTypeRequired([]);
        expect(() => type.addItem('a' as any)).toThrowError('Validation Error: Expected a valid Number, but received "a".');
      });
      it('hasItem', () => {
        const type = new ArrayTypeRequired([1, 2]);
        expect(type.hasItem(1)).toEqual(true);
        expect(type.hasItem(2)).toEqual(true);
        expect(type.hasItem(1.0)).toEqual(true);
        expect(type.hasItem(3)).toEqual(false);
        expect(type.hasItem(1.1)).toEqual(false);
        expect(type.hasItem('1' as any)).toEqual(true);
      });

      it('hasItem exception ', () => {
        const type = new ArrayTypeRequired([1]);
        expect(() => type.addItem('a' as any)).toThrowError('Validation Error: Expected a valid Number, but received "a".');
      });

      it('remove item', () => {
        const type = new ArrayTypeRequired([1, 2]);
        type.removeItem(1);
        expect(type.items).toEqual([new Age(2)]);
        type.removeItem(2);
        expect(type.items).toEqual([]);
        type.removeItem(3);
        expect(type.items).toEqual([]);
      });
      it('remove item', () => {
        const type = new ArrayTypeRequired([3]);
        type.removeItem(1);
        expect(type.items).toEqual([new Age(3)]);
      });

      it('remove item string', () => {
        const type = new ArrayTypeRequired([1]);
        type.removeItem('1' as any);
        expect(type.items).toEqual([]);
      });

      it('remove exception ', () => {
        const type = new ArrayTypeRequired([1]);
        expect(() => type.addItem('a' as any)).toThrowError('Validation Error: Expected a valid Number, but received "a".');
      });

      it('set item', () => {
        const type = new ArrayTypeRequired([1]);
        type.setItem(1);
        expect(type.items).toEqual([new Age(1)]);
        type.setItem(2);
        expect(type.items).toEqual([new Age(1), new Age(2)]);
        type.setItem(2);
        expect(type.items).toEqual([new Age(1), new Age(2)]);
      });
    });

    describe('ArrayOptional', () => {
      it('add', () => {
        const type = new ArrayTypeOptional();
        type.addItem(1);
        expect(type.items).toEqual([new Age(1)]);
        type.addItem(2);
        expect(type.items).toEqual([new Age(1), new Age(2)]);
      });
      it('add string ', () => {
        const type = new ArrayTypeOptional();
        type.addItem('1' as any);
        expect(type.items).toEqual([new Age(1)]);
        type.addItem('2' as any);
        expect(type.items).toEqual([new Age(1), new Age(2)]);
      });
      it('add exception ', () => {
        const type = new ArrayTypeOptional();
        expect(() => type.addItem('a' as any)).toThrowError('Validation Error: Expected a valid Number, but received "a".');
      });
      it('hasItem', () => {
        const type = new ArrayTypeOptional([1, 2]);
        expect(type.hasItem(1)).toEqual(true);
        expect(type.hasItem(2)).toEqual(true);
        expect(type.hasItem(1.0)).toEqual(true);
        expect(type.hasItem(3)).toEqual(false);
        expect(type.hasItem(1.1)).toEqual(false);
        expect(type.hasItem('1' as any)).toEqual(true);
      });

      it('hasItem in null', () => {
        const type = new ArrayTypeOptional();
        expect(type.hasItem(1)).toEqual(false);
      });

      it('hasItem exception ', () => {
        const type = new ArrayTypeOptional();
        expect(() => type.addItem('a' as any)).toThrowError('Validation Error: Expected a valid Number, but received "a".');
      });

      it('remove item', () => {
        const type = new ArrayTypeOptional([1, 2]);
        type.removeItem(1);
        expect(type.items).toEqual([new Age(2)]);
        type.removeItem(2);
        expect(type.items).toEqual([]);
        type.removeItem(3);
        expect(type.items).toEqual([]);
      });
      it('remove item', () => {
        const type = new ArrayTypeOptional();
        type.removeItem(1);
        expect(type.items).toEqual(null);
      });

      it('remove item string', () => {
        const type = new ArrayTypeOptional([1]);
        type.removeItem('1' as any);
        expect(type.items).toEqual([]);
      });

      it('remove item string empty', () => {
        const type = new ArrayTypeOptional();
        type.removeItem('1' as any);
        expect(type.items).toEqual(null);
      });

      it('remove exception ', () => {
        const type = new ArrayTypeOptional();
        expect(() => type.addItem('a' as any)).toThrowError('Validation Error: Expected a valid Number, but received "a".');
      });

      it('set item', () => {
        const type = new ArrayTypeOptional();
        type.setItem(1);
        expect(type.items).toEqual([new Age(1)]);
        type.setItem(2);
        expect(type.items).toEqual([new Age(1), new Age(2)]);
        type.setItem(2);
        expect(type.items).toEqual([new Age(1), new Age(2)]);
      });
    });
  });
});
