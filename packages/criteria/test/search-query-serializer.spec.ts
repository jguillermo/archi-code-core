import { describe, expect, it } from '@jest/globals';
import { SearchQuerySerializer } from '../src/search-query-serializer';
import { SearchCriteriaDto } from '../src/search-criteria.dto';
import { SimpleFilterDto } from '../src/simple-filter.dto';
import { CompositeFilterDto } from '../src/composite-filter.dto';
import { FilterOperator } from '../src/filter-operator';
import { SearchOrderDto } from '../src/search-order.dto';
import { SearchPaginatorDto } from '../src/search-paginator.dto';
import { SearchGroupByDto } from '../src/search-group-by.dto';
import { SearchOrderItemDto } from '../src/search-order-item.dto';

describe('SearchQuerySerializer', () => {
  describe('Basic cases', () => {
    it('serializes and deserializes an empty SearchCriteriaDto', () => {
      const criteria = new SearchCriteriaDto();
      const serialized = SearchQuerySerializer.serialize(criteria);

      expect(serialized).toBe(
        JSON.stringify({
          filters: null,
          orders: null,
          paginator: null,
          groupBy: null,
        }),
      );

      const deserialized = SearchQuerySerializer.deserialize(serialized);
      expect(deserialized.filters).toBeUndefined();
      expect(deserialized.orders).toBeUndefined();
      expect(deserialized.paginator).toBeUndefined();
      expect(deserialized.groupBy).toBeUndefined();
    });
  });

  describe('Simple filters', () => {
    it('serializes and deserializes a simple filter', () => {
      const simpleFilter = new SimpleFilterDto('age', FilterOperator.GT, 18);
      const criteria = new SearchCriteriaDto(simpleFilter);
      const serialized = SearchQuerySerializer.serialize(criteria);

      const expectedFilterObj = {
        type: 'simple',
        field: 'age',
        operator: 'gt',
        value: 18,
      };
      const parsed = JSON.parse(serialized);
      expect(parsed.filters).toEqual(expectedFilterObj);

      const deserialized = SearchQuerySerializer.deserialize(serialized);
      expect(deserialized.filters).toBeInstanceOf(SimpleFilterDto);
      const dsFilter = deserialized.filters as SimpleFilterDto;
      expect(dsFilter.field).toBe('age');
      expect(dsFilter.operator).toBe('gt');
      expect(dsFilter.value).toBe(18);
    });
  });

  describe('Composite filters', () => {
    it('serializes and deserializes a composite filter of simple filters', () => {
      const simpleFilter1 = new SimpleFilterDto('age', FilterOperator.GTE, 21);
      const simpleFilter2 = new SimpleFilterDto('name', FilterOperator.LIKE, 'John');
      const compositeFilter = new CompositeFilterDto('and', [simpleFilter1, simpleFilter2]);
      const criteria = new SearchCriteriaDto(compositeFilter);
      const serialized = SearchQuerySerializer.serialize(criteria);
      const parsed = JSON.parse(serialized);

      expect(parsed.filters.type).toBe('composite');
      expect(parsed.filters.logicalOperator).toBe('and');
      expect(parsed.filters.filters).toHaveLength(2);

      const deserialized = SearchQuerySerializer.deserialize(serialized);
      expect(deserialized.filters).toBeInstanceOf(CompositeFilterDto);
      const dsComposite = deserialized.filters as CompositeFilterDto;
      expect(dsComposite.logicalOperator).toBe('and');
      expect(dsComposite.filters).toHaveLength(2);
      dsComposite.filters.forEach((f) => {
        expect(f).toBeInstanceOf(SimpleFilterDto);
      });
    });

    it('serializes and deserializes a nested composite filter', () => {
      const simpleFilter = new SimpleFilterDto('price', FilterOperator.LT, 100);
      const innerComposite = new CompositeFilterDto('or', [simpleFilter]);
      const outerComposite = new CompositeFilterDto('and', [innerComposite]);
      const criteria = new SearchCriteriaDto(outerComposite);
      const serialized = SearchQuerySerializer.serialize(criteria);
      const deserialized = SearchQuerySerializer.deserialize(serialized);

      expect(deserialized.filters).toBeInstanceOf(CompositeFilterDto);
      const outer = deserialized.filters as CompositeFilterDto;
      expect(outer.logicalOperator).toBe('and');
      expect(outer.filters[0]).toBeInstanceOf(CompositeFilterDto);

      const inner = outer.filters[0] as CompositeFilterDto;
      expect(inner.logicalOperator).toBe('or');
      expect(inner.filters).toHaveLength(1);
      expect(inner.filters[0]).toBeInstanceOf(SimpleFilterDto);
    });
  });

  describe('Ordering', () => {
    it('serializes and deserializes search orders', () => {
      const orders: SearchOrderItemDto[] = [
        { field: 'name', direction: 'asc' },
        { field: 'age', direction: 'desc' },
      ];
      const orderDto = new SearchOrderDto(orders);
      const criteria = new SearchCriteriaDto(undefined, orderDto);
      const serialized = SearchQuerySerializer.serialize(criteria);
      const parsed = JSON.parse(serialized);
      expect(parsed.orders).toEqual(orders);

      const deserialized = SearchQuerySerializer.deserialize(serialized);
      expect(deserialized.orders).toBeInstanceOf(SearchOrderDto);
      expect(deserialized.orders?.orders).toEqual(orders);
    });

    it('throws when an order has an invalid direction', () => {
      const orders = [{ field: 'name', direction: 'ascending' }];
      expect(() => new SearchOrderDto(orders as any)).toThrow(
        'SearchOrderDto: Each order must have direction "asc" or "desc"',
      );
    });
  });

  describe('Paginator', () => {
    it('serializes and deserializes a valid paginator', () => {
      const paginator = new SearchPaginatorDto(2, 10);
      const criteria = new SearchCriteriaDto(undefined, undefined, paginator);
      const serialized = SearchQuerySerializer.serialize(criteria);
      const parsed = JSON.parse(serialized);
      expect(parsed.paginator).toEqual({ page: 2, perPage: 10 });

      const deserialized = SearchQuerySerializer.deserialize(serialized);
      expect(deserialized.paginator).toBeInstanceOf(SearchPaginatorDto);
      expect(deserialized.paginator?.page).toBe(2);
      expect(deserialized.paginator?.perPage).toBe(10);
    });

    it('throws when the paginator has non-integer or negative values', () => {
      expect(() => new SearchPaginatorDto(0, 10)).toThrow(
        'SearchPaginatorDto: "page" and "perPage" must be positive integers',
      );
      expect(() => new SearchPaginatorDto(2, 0)).toThrow(
        'SearchPaginatorDto: "page" and "perPage" must be positive integers',
      );
      expect(() => new SearchPaginatorDto('abc' as any, 10)).toThrow(
        'SearchPaginatorDto: "page" and "perPage" must be integers',
      );
    });
  });

  describe('Group By', () => {
    it('serializes and deserializes a groupBy with a string', () => {
      const groupBy = new SearchGroupByDto('country');
      const criteria = new SearchCriteriaDto(undefined, undefined, undefined, groupBy);
      const serialized = SearchQuerySerializer.serialize(criteria);
      const parsed = JSON.parse(serialized);
      expect(parsed.groupBy).toEqual(['country']);

      const deserialized = SearchQuerySerializer.deserialize(serialized);
      expect(deserialized.groupBy).toBeInstanceOf(SearchGroupByDto);
      expect(deserialized.groupBy?.fields).toEqual(['country']);
    });

    it('serializes and deserializes a groupBy with an array of strings', () => {
      const groupBy = new SearchGroupByDto(['country', 'city']);
      const criteria = new SearchCriteriaDto(undefined, undefined, undefined, groupBy);
      const serialized = SearchQuerySerializer.serialize(criteria);
      const parsed = JSON.parse(serialized);
      expect(parsed.groupBy).toEqual(['country', 'city']);

      const deserialized = SearchQuerySerializer.deserialize(serialized);
      expect(deserialized.groupBy).toBeInstanceOf(SearchGroupByDto);
      expect(deserialized.groupBy?.fields).toEqual(['country', 'city']);
    });

    it('throws when groupBy is neither a string nor an array of strings', () => {
      expect(() => new SearchGroupByDto(123 as any)).toThrow(
        'SearchGroupByDto: groupBy must be a string or an array of strings',
      );
    });
  });

  describe('Combined cases', () => {
    it('serializes and deserializes a full SearchCriteriaDto', () => {
      const simpleFilter1 = new SimpleFilterDto('status', FilterOperator.EQ, 'active');
      const simpleFilter2 = new SimpleFilterDto('score', FilterOperator.GTE, 50);
      const compositeFilter = new CompositeFilterDto('or', [simpleFilter1, simpleFilter2]);

      const orders: SearchOrderItemDto[] = [
        { field: 'createdAt', direction: 'desc' },
        { field: 'score', direction: 'asc' },
      ];
      const orderDto = new SearchOrderDto(orders);

      const paginator = new SearchPaginatorDto(1, 20);

      const groupBy = new SearchGroupByDto(['status', 'category']);

      const criteria = new SearchCriteriaDto(compositeFilter, orderDto, paginator, groupBy);
      const serialized = SearchQuerySerializer.serialize(criteria);
      const deserialized = SearchQuerySerializer.deserialize(serialized);

      expect(deserialized.filters).toBeInstanceOf(CompositeFilterDto);
      const dsComposite = deserialized.filters as CompositeFilterDto;
      expect(dsComposite.logicalOperator).toBe('or');
      expect(dsComposite.filters).toHaveLength(2);

      expect(deserialized.orders).toBeInstanceOf(SearchOrderDto);
      expect(deserialized.orders?.orders).toEqual(orders);

      expect(deserialized.paginator).toBeInstanceOf(SearchPaginatorDto);
      expect(deserialized.paginator?.page).toBe(1);
      expect(deserialized.paginator?.perPage).toBe(20);

      expect(deserialized.groupBy).toBeInstanceOf(SearchGroupByDto);
      expect(deserialized.groupBy?.fields).toEqual(['status', 'category']);
    });
  });

  describe('Error cases', () => {
    it('throws when deserializing invalid JSON', () => {
      expect(() => SearchQuerySerializer.deserialize('invalid json')).toThrow(
        'Invalid JSON string',
      );
    });

    it('throws when deserializing a filter of unknown type', () => {
      const invalidFilterJson = JSON.stringify({
        filters: { type: 'unknown', field: 'dummy', operator: 'eq', value: 'test' },
        orders: null,
        paginator: null,
        groupBy: null,
      });
      expect(() => SearchQuerySerializer.deserialize(invalidFilterJson)).toThrow(
        'Unknown filter format',
      );
    });
  });
});

describe('SearchQuerySerializer invalid filters', () => {
  it('rejects serializing a filter that is neither simple nor composite', () => {
    const criteria = new SearchCriteriaDto({} as SimpleFilterDto);
    expect(() => SearchQuerySerializer.serialize(criteria)).toThrow('Unknown filter type');
  });

  it('rejects a composite filter without a filters array', () => {
    const json = JSON.stringify({ filters: { type: 'composite', logicalOperator: 'and' } });
    expect(() => SearchQuerySerializer.deserialize(json)).toThrow(
      'CompositeFilterDto: "filters" must be a non-empty array',
    );
  });
});
