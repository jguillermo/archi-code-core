import { describe, expect, it } from '@jest/globals';
// packages/criteria/src/search-query-serializer.spec.ts
import { SearchQuerySerializer } from './search-query-serializer';
import { SearchCriteriaDto } from './search-criteria.dto';
import { SimpleFilterDto } from './simple-filter.dto';
import { CompositeFilterDto } from './composite-filter.dto';
import { FilterOperator } from './filter-operator';
import { SearchOrderDto } from './search-order.dto';
import { SearchPaginatorDto } from './search-paginator.dto';
import { SearchGroupByDto } from './search-group-by.dto';
import { SearchOrderItemDto } from './search-order-item.dto';

describe('SearchQuerySerializer', () => {
  // Casos básicos
  describe('Casos básicos', () => {
    it('debería serializar y deserializar una SearchCriteriaDto vacía', () => {
      const criteria = new SearchCriteriaDto();
      const serialized = SearchQuerySerializer.serialize(criteria);

      // Al no haber filtros, orders, paginator ni groupBy se serializa como null
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

  // Tests para filtros simples
  describe('Filtros simples', () => {
    it('debería serializar y deserializar un filtro simple', () => {
      const simpleFilter = new SimpleFilterDto('age', FilterOperator.GT, 18);
      const criteria = new SearchCriteriaDto(simpleFilter);
      const serialized = SearchQuerySerializer.serialize(criteria);

      // Se espera que el filtro simple se serialice con la propiedad "type" = "simple"
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

  // Tests para filtros compuestos
  describe('Filtros compuestos', () => {
    it('debería serializar y deserializar un filtro compuesto con filtros simples', () => {
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

    it('debería serializar y deserializar un filtro compuesto anidado', () => {
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

  // Tests para ordenamiento
  describe('Ordenamiento', () => {
    it('debería serializar y deserializar órdenes de búsqueda', () => {
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

    it('debería lanzar error si el orden tiene dirección inválida', () => {
      const orders = [{ field: 'name', direction: 'ascending' }]; // dirección inválida
      expect(() => new SearchOrderDto(orders as any)).toThrowError('SearchOrderDto: Each order must have direction "asc" or "desc"');
    });
  });

  // Tests para paginador
  describe('Paginador', () => {
    it('debería serializar y deserializar un paginador válido', () => {
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

    it('debería lanzar error si el paginador tiene valores no enteros o negativos', () => {
      expect(() => new SearchPaginatorDto(0, 10)).toThrowError('SearchPaginatorDto: "page" and "perPage" must be positive integers');
      expect(() => new SearchPaginatorDto(2, 0)).toThrowError('SearchPaginatorDto: "page" and "perPage" must be positive integers');
      expect(() => new SearchPaginatorDto('abc' as any, 10)).toThrowError('SearchPaginatorDto: "page" and "perPage" must be integers');
    });
  });

  // Tests para groupBy
  describe('Group By', () => {
    it('debería serializar y deserializar un groupBy con un string', () => {
      const groupBy = new SearchGroupByDto('country');
      const criteria = new SearchCriteriaDto(undefined, undefined, undefined, groupBy);
      const serialized = SearchQuerySerializer.serialize(criteria);
      const parsed = JSON.parse(serialized);
      expect(parsed.groupBy).toEqual(['country']);

      const deserialized = SearchQuerySerializer.deserialize(serialized);
      expect(deserialized.groupBy).toBeInstanceOf(SearchGroupByDto);
      expect(deserialized.groupBy?.fields).toEqual(['country']);
    });

    it('debería serializar y deserializar un groupBy con un array de strings', () => {
      const groupBy = new SearchGroupByDto(['country', 'city']);
      const criteria = new SearchCriteriaDto(undefined, undefined, undefined, groupBy);
      const serialized = SearchQuerySerializer.serialize(criteria);
      const parsed = JSON.parse(serialized);
      expect(parsed.groupBy).toEqual(['country', 'city']);

      const deserialized = SearchQuerySerializer.deserialize(serialized);
      expect(deserialized.groupBy).toBeInstanceOf(SearchGroupByDto);
      expect(deserialized.groupBy?.fields).toEqual(['country', 'city']);
    });

    it('debería lanzar error si groupBy no es un string o array de strings', () => {
      expect(() => new SearchGroupByDto(123 as any)).toThrowError('SearchGroupByDto: groupBy must be a string or an array of strings');
    });
  });

  // Tests combinados: utilizando filtros, órdenes, paginador y groupBy
  describe('Casos combinados', () => {
    it('debería serializar y deserializar un SearchCriteriaDto completo', () => {
      // Crear filtros compuestos con filtros simples
      const simpleFilter1 = new SimpleFilterDto('status', FilterOperator.EQ, 'active');
      const simpleFilter2 = new SimpleFilterDto('score', FilterOperator.GTE, 50);
      const compositeFilter = new CompositeFilterDto('or', [simpleFilter1, simpleFilter2]);

      // Definir órdenes de búsqueda
      const orders: SearchOrderItemDto[] = [
        { field: 'createdAt', direction: 'desc' },
        { field: 'score', direction: 'asc' },
      ];
      const orderDto = new SearchOrderDto(orders);

      // Crear un paginador
      const paginator = new SearchPaginatorDto(1, 20);

      // Crear groupBy
      const groupBy = new SearchGroupByDto(['status', 'category']);

      // Construir la criteria completa
      const criteria = new SearchCriteriaDto(compositeFilter, orderDto, paginator, groupBy);
      const serialized = SearchQuerySerializer.serialize(criteria);
      const deserialized = SearchQuerySerializer.deserialize(serialized);

      // Verificar filtros
      expect(deserialized.filters).toBeInstanceOf(CompositeFilterDto);
      const dsComposite = deserialized.filters as CompositeFilterDto;
      expect(dsComposite.logicalOperator).toBe('or');
      expect(dsComposite.filters).toHaveLength(2);

      // Verificar órdenes
      expect(deserialized.orders).toBeInstanceOf(SearchOrderDto);
      expect(deserialized.orders?.orders).toEqual(orders);

      // Verificar paginador
      expect(deserialized.paginator).toBeInstanceOf(SearchPaginatorDto);
      expect(deserialized.paginator?.page).toBe(1);
      expect(deserialized.paginator?.perPage).toBe(20);

      // Verificar groupBy
      expect(deserialized.groupBy).toBeInstanceOf(SearchGroupByDto);
      expect(deserialized.groupBy?.fields).toEqual(['status', 'category']);
    });
  });

  // Casos de error en la deserialización
  describe('Casos de error', () => {
    it('debería lanzar error al deserializar un JSON inválido', () => {
      expect(() => SearchQuerySerializer.deserialize('invalid json')).toThrowError('Invalid JSON string');
    });

    it('debería lanzar error al deserializar un filtro con tipo desconocido', () => {
      const invalidFilterJson = JSON.stringify({
        filters: { type: 'unknown', field: 'dummy', operator: 'eq', value: 'test' },
        orders: null,
        paginator: null,
        groupBy: null,
      });
      expect(() => SearchQuerySerializer.deserialize(invalidFilterJson)).toThrowError('Unknown filter format');
    });
  });
});
