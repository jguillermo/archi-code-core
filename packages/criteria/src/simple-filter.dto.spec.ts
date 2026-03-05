import { describe, expect, it } from '@jest/globals';
import { SimpleFilterDto } from './simple-filter.dto';
import { FilterOperator } from './filter-operator';

describe('SimpleFilterDto', () => {
  describe('Valid Cases', () => {
    it('should create a simple filter with a non-numeric operator', () => {
      const filter = new SimpleFilterDto('name', FilterOperator.EQ, 'Alice');
      expect(filter.field).toBe('name');
      expect(filter.operator).toBe(FilterOperator.EQ);
      expect(filter.value).toBe('Alice');
    });

    it('should create a simple filter with a numeric operator and an integer value as a number', () => {
      const filter = new SimpleFilterDto('age', FilterOperator.GT, 30);
      expect(filter.field).toBe('age');
      expect(filter.operator).toBe(FilterOperator.GT);
      expect(filter.value).toBe(30);
    });

    it('should create a simple filter with a numeric operator and an integer value as a string', () => {
      const filter = new SimpleFilterDto('age', FilterOperator.GT, '30');
      expect(filter.field).toBe('age');
      expect(filter.operator).toBe(FilterOperator.GT);
      expect(filter.value).toBe(30);
    });

    it('should create a simple filter with a numeric operator and an array of integers', () => {
      const filter = new SimpleFilterDto('ids', FilterOperator.IN, [1, 2, 3]);
      expect(filter.field).toBe('ids');
      expect(filter.operator).toBe(FilterOperator.IN);
      expect(filter.value).toEqual([1, 2, 3]);
    });
  });

  describe('Error Cases', () => {
    it('should throw an error if the field is empty', () => {
      expect(() => new SimpleFilterDto('', FilterOperator.EQ, 'Alice')).toThrow(
        'SimpleFilterDto: "field" must be a non-empty string',
      );
    });

    it('should throw an error if the operator is invalid', () => {
      // Cast an invalid string to FilterOperator to simulate an invalid operator.
      expect(
        () => new SimpleFilterDto('name', 'invalid_operator' as FilterOperator, 'Alice'),
      ).toThrow('SimpleFilterDto: Invalid operator "invalid_operator"');
    });

    it('should throw an error if the value is missing', () => {
      expect(() => new SimpleFilterDto('quantity', FilterOperator.EQ, undefined as any)).toThrow(
        'SimpleFilterDto: "value" is required',
      );
    });

    it('should accept a float value for a numeric operator (number)', () => {
      const filter = new SimpleFilterDto('price', FilterOperator.GT, 30.5);
      expect(filter.value).toBe(30.5);
    });

    it('should accept a float value for a numeric operator (string)', () => {
      const filter = new SimpleFilterDto('price', FilterOperator.GT, '30.5');
      expect(filter.value).toBe(30.5);
    });

    it('should accept an array containing floats for BETWEEN', () => {
      const filter = new SimpleFilterDto('price', FilterOperator.BETWEEN, [1.5, 2.5]);
      expect(filter.value).toEqual([1.5, 2.5]);
    });

    it('should throw an error if a numeric operator receives a non-numeric value', () => {
      expect(() => new SimpleFilterDto('age', FilterOperator.GT, 'abc')).toThrow(
        'SimpleFilterDto: Value "abc" must be a number',
      );
    });
  });
});
