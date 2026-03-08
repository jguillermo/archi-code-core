import { describe, expect, it } from '@jest/globals';
import { SearchCriteriaDto } from './search-criteria.dto';
import { SimpleFilterDto } from './simple-filter.dto';
import { FilterOperator } from './filter-operator';
import { SearchOrderDto } from './search-order.dto';
import { SearchPaginatorDto } from './search-paginator.dto';
import { SearchGroupByDto } from './search-group-by.dto';
import { SearchOrderItemDto } from './search-order-item.dto';

describe('SearchCriteriaDto', () => {
  describe('Valid Cases', () => {
    it('should create a SearchCriteriaDto with no parameters', () => {
      const criteria = new SearchCriteriaDto();
      expect(criteria.filters).toBeUndefined();
      expect(criteria.orders).toBeUndefined();
      expect(criteria.paginator).toBeUndefined();
      expect(criteria.groupBy).toBeUndefined();
    });

    it('should create a SearchCriteriaDto with a valid filter', () => {
      const filter = new SimpleFilterDto('name', FilterOperator.EQ, 'Alice');
      const criteria = new SearchCriteriaDto(filter);
      expect(criteria.filters).toBe(filter);
    });

    it('should create a SearchCriteriaDto with valid orders', () => {
      const orderItems: SearchOrderItemDto[] = [
        { field: 'age', direction: 'asc' },
        { field: 'name', direction: 'desc' },
      ];
      const orders = new SearchOrderDto(orderItems);
      const criteria = new SearchCriteriaDto(undefined, orders);
      expect(criteria.orders).toBe(orders);
      expect(orders.orders).toHaveLength(2);
      expect(orders.orders[0]).toEqual({ field: 'age', direction: 'asc' });
      expect(orders.orders[1]).toEqual({ field: 'name', direction: 'desc' });
    });

    it('should create a SearchCriteriaDto with a valid paginator', () => {
      const paginator = new SearchPaginatorDto(1, 10);
      const criteria = new SearchCriteriaDto(undefined, undefined, paginator);
      expect(criteria.paginator).toBe(paginator);
    });

    it('should create a SearchCriteriaDto with a valid groupBy', () => {
      const groupBy = new SearchGroupByDto(['department']);
      const criteria = new SearchCriteriaDto(undefined, undefined, undefined, groupBy);
      expect(criteria.groupBy).toBe(groupBy);
      expect(groupBy.fields).toEqual(['department']);
    });

    it('should create a SearchCriteriaDto with all valid properties', () => {
      const filter = new SimpleFilterDto('age', FilterOperator.GT, 30);
      const orders = new SearchOrderDto([{ field: 'age', direction: 'desc' }]);
      const paginator = new SearchPaginatorDto(2, 20);
      const groupBy = new SearchGroupByDto(['department', 'role']);
      const criteria = new SearchCriteriaDto(filter, orders, paginator, groupBy);
      expect(criteria.filters).toBe(filter);
      expect(criteria.orders).toBe(orders);
      expect(criteria.paginator).toBe(paginator);
      expect(criteria.groupBy).toBe(groupBy);
    });
  });

  describe('Invalid Cases', () => {
    it('should throw an error if an invalid SearchGroupByDto is provided', () => {
      expect(() => new SearchGroupByDto({ key: 'department' } as any)).toThrow();
      expect(() => new SearchGroupByDto(42 as any)).toThrow();
    });

    it('should throw an error if invalid orders are provided', () => {
      // Orders array with an invalid item: empty field
      expect(() => new SearchOrderDto([{ field: '', direction: 'asc' }])).toThrow(
        'SearchOrderDto: Each order must have a non-empty string as field',
      );

      // Orders array with an invalid direction
      expect(() => new SearchOrderDto([{ field: 'name', direction: 'up' as any }])).toThrow(
        'SearchOrderDto: Each order must have direction "asc" or "desc"',
      );
    });

    it('should throw an error if invalid paginator values are provided', () => {
      // Negative values
      expect(() => new SearchPaginatorDto(0, 10)).toThrow(
        'SearchPaginatorDto: "page" and "perPage" must be positive integers',
      );
      expect(() => new SearchPaginatorDto(1, -5)).toThrow(
        'SearchPaginatorDto: "page" and "perPage" must be positive integers',
      );

      // Non-numeric values (simulate with type casting)
      expect(() => new SearchPaginatorDto('a' as any, 10)).toThrow(
        'SearchPaginatorDto: "page" and "perPage" must be integers',
      );
    });

    it('should propagate errors from invalid filter DTOs', () => {
      // Empty field
      expect(() => new SimpleFilterDto('', FilterOperator.EQ, 'Alice')).toThrow(
        'SimpleFilterDto: "field" must be a non-empty string',
      );
      // Non-numeric value for a numeric operator
      expect(() => new SimpleFilterDto('age', FilterOperator.GT, 'notanumber')).toThrow(
        'SimpleFilterDto: Value "notanumber" must be a number',
      );
    });
  });
});
