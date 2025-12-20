import { describe, expect, it, jest } from '@jest/globals';
import { CompositeFilterDto } from './composite-filter.dto';
import { SimpleFilterDto } from './simple-filter.dto';
import { FilterOperator } from './filter-operator';

describe('CompositeFilterDto', () => {
  describe('Valid cases', () => {
    it('should create a composite filter with logical operator "and" and a non-empty filters array', () => {
      const simpleFilter = new SimpleFilterDto('name', FilterOperator.EQ, 'Alice');
      const compositeFilter = new CompositeFilterDto('and', [simpleFilter]);
      expect(compositeFilter.logicalOperator).toBe('and');
      expect(compositeFilter.filters).toHaveLength(1);
    });

    it('should create a composite filter with logical operator "or" and multiple filters', () => {
      const filter1 = new SimpleFilterDto('name', FilterOperator.EQ, 'Alice');
      const filter2 = new SimpleFilterDto('age', FilterOperator.GT, 30);
      const compositeFilter = new CompositeFilterDto('or', [filter1, filter2]);
      expect(compositeFilter.logicalOperator).toBe('or');
      expect(compositeFilter.filters).toHaveLength(2);
    });

    it('should support nested composite filters', () => {
      const filter1 = new SimpleFilterDto('name', FilterOperator.EQ, 'Alice');
      const innerComposite = new CompositeFilterDto('or', [filter1]);
      const outerComposite = new CompositeFilterDto('and', [innerComposite]);
      expect(outerComposite.logicalOperator).toBe('and');
      expect(outerComposite.filters[0]).toBe(innerComposite);
    });
  });

  describe('Invalid cases', () => {
    it('should throw an error if the logical operator is not "and" or "or"', () => {
      const simpleFilter = new SimpleFilterDto('name', FilterOperator.EQ, 'Alice');
      expect(() => new CompositeFilterDto('invalid' as any, [simpleFilter])).toThrow('CompositeFilterDto: logicalOperator must be "and" or "or"');
    });

    it('should throw an error if the filters array is empty', () => {
      expect(() => new CompositeFilterDto('and', [])).toThrow('CompositeFilterDto: "filters" must be a non-empty array');
    });

    it('should throw an error if filters is not an array', () => {
      expect(() => new CompositeFilterDto('and', null as any)).toThrow('CompositeFilterDto: "filters" must be a non-empty array');
    });

    it('should call validate on each nested filter', () => {
      const fakeFilter = { validate: jest.fn() };
      new CompositeFilterDto('and', [fakeFilter as any]);
      expect(fakeFilter.validate).toHaveBeenCalled();
    });
  });
});
