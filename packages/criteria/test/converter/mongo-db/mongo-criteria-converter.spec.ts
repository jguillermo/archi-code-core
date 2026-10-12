import { describe, expect, it } from '@jest/globals';
import { SimpleFilterDto } from '../../../src/simple-filter.dto';
import { FilterOperator } from '../../../src/filter-operator';
import { SearchCriteriaDto } from '../../../src/search-criteria.dto';
import { MongoCriteriaConverter } from '../../../src/converter/mongo-db/mongo-criteria-converter';
import { CompositeFilterDto } from '../../../src/composite-filter.dto';
import { SearchOrderDto } from '../../../src/search-order.dto';
import { SearchPaginatorDto } from '../../../src/search-paginator.dto';
import { SearchGroupByDto } from '../../../src/search-group-by.dto';
import { SearchOrderItemDto } from '../../../src/search-order-item.dto';

describe('MongoCriteriaConverter', () => {
  describe('Filtros simples', () => {
    it('debe convertir un filtro simple con operador "eq"', () => {
      const filter = new SimpleFilterDto('name', FilterOperator.EQ, 'Alice');
      const criteria = new SearchCriteriaDto(filter);
      const mongoQuery = new MongoCriteriaConverter().convert(criteria);

      expect(mongoQuery.filter).toEqual({ name: 'Alice' });
    });

    it('debe convertir un filtro simple con operador "gt"', () => {
      const filter = new SimpleFilterDto('age', FilterOperator.GT, 30);
      const criteria = new SearchCriteriaDto(filter);
      const mongoQuery = new MongoCriteriaConverter().convert(criteria);

      expect(mongoQuery.filter).toEqual({ age: { $gt: 30 } });
    });

    it('debe convertir un filtro simple con operador "between"', () => {
      const filter = new SimpleFilterDto('price', FilterOperator.BETWEEN, [10, 20]);
      const criteria = new SearchCriteriaDto(filter);
      const mongoQuery = new MongoCriteriaConverter().convert(criteria);

      expect(mongoQuery.filter).toEqual({ price: { $gte: 10, $lte: 20 } });
    });

    it('debe convertir un filtro simple con operador "like"', () => {
      const filter = new SimpleFilterDto('description', FilterOperator.LIKE, 'book');
      const criteria = new SearchCriteriaDto(filter);
      const mongoQuery = new MongoCriteriaConverter().convert(criteria);

      expect(mongoQuery.filter).toEqual({ description: { $regex: 'book' } });
    });

    it('debe convertir un filtro simple con operador "ilike"', () => {
      const filter = new SimpleFilterDto('description', FilterOperator.ILIKE, 'BOOK');
      const criteria = new SearchCriteriaDto(filter);
      const mongoQuery = new MongoCriteriaConverter().convert(criteria);

      expect(mongoQuery.filter).toEqual({ description: { $regex: 'BOOK', $options: 'i' } });
    });
  });

  describe('Filtros compuestos', () => {
    it('debe convertir un filtro compuesto (and) con filtros simples', () => {
      const filter1 = new SimpleFilterDto('status', FilterOperator.EQ, 'active');
      const filter2 = new SimpleFilterDto('score', FilterOperator.GTE, 50);
      const compositeFilter = new CompositeFilterDto('and', [filter1, filter2]);
      const criteria = new SearchCriteriaDto(compositeFilter);
      const mongoQuery = new MongoCriteriaConverter().convert(criteria);

      expect(mongoQuery.filter).toEqual({
        $and: [{ status: 'active' }, { score: { $gte: 50 } }],
      });
    });

    it('debe convertir un filtro compuesto (or) con filtros simples', () => {
      const filter1 = new SimpleFilterDto('category', FilterOperator.EQ, 'books');
      const filter2 = new SimpleFilterDto('category', FilterOperator.EQ, 'electronics');
      const compositeFilter = new CompositeFilterDto('or', [filter1, filter2]);
      const criteria = new SearchCriteriaDto(compositeFilter);
      const mongoQuery = new MongoCriteriaConverter().convert(criteria);

      expect(mongoQuery.filter).toEqual({
        $or: [{ category: 'books' }, { category: 'electronics' }],
      });
    });

    it('debe convertir filtros compuestos anidados', () => {
      const simpleFilter = new SimpleFilterDto('price', FilterOperator.LT, 100);
      const innerComposite = new CompositeFilterDto('or', [simpleFilter]);
      const outerComposite = new CompositeFilterDto('and', [innerComposite]);
      const criteria = new SearchCriteriaDto(outerComposite);
      const mongoQuery = new MongoCriteriaConverter().convert(criteria);

      expect(mongoQuery.filter).toEqual({
        $and: [
          {
            $or: [{ price: { $lt: 100 } }],
          },
        ],
      });
    });
  });

  describe('Ordenamiento', () => {
    it('debe convertir el ordenamiento a un objeto de sort de MongoDB', () => {
      const orders: SearchOrderItemDto[] = [
        { field: 'name', direction: 'asc' },
        { field: 'age', direction: 'desc' },
      ];
      const orderDto = new SearchOrderDto(orders);
      const criteria = new SearchCriteriaDto(undefined, orderDto);
      const mongoQuery = new MongoCriteriaConverter().convert(criteria);

      expect(mongoQuery.sort).toEqual({ name: 1, age: -1 });
    });
  });

  describe('Paginación', () => {
    it('debe convertir el paginador a skip y limit', () => {
      const paginator = new SearchPaginatorDto(3, 10);
      const criteria = new SearchCriteriaDto(undefined, undefined, paginator);
      const mongoQuery = new MongoCriteriaConverter().convert(criteria);

      expect(mongoQuery.skip).toBe(20);
      expect(mongoQuery.limit).toBe(10);
    });
  });

  describe('Conversión completa', () => {
    it('debe convertir una SearchCriteriaDto completa', () => {
      const filter1 = new SimpleFilterDto('status', FilterOperator.EQ, 'active');
      const filter2 = new SimpleFilterDto('score', FilterOperator.GTE, 50);
      const compositeFilter = new CompositeFilterDto('or', [filter1, filter2]);

      const orders: SearchOrderItemDto[] = [
        { field: 'createdAt', direction: 'desc' },
        { field: 'score', direction: 'asc' },
      ];
      const orderDto = new SearchOrderDto(orders);

      const paginator = new SearchPaginatorDto(2, 20);

      const groupBy = new SearchGroupByDto('category');

      const criteria = new SearchCriteriaDto(compositeFilter, orderDto, paginator, groupBy);
      const mongoQuery = new MongoCriteriaConverter().convert(criteria);

      expect(mongoQuery.filter).toEqual({
        $or: [{ status: 'active' }, { score: { $gte: 50 } }],
      });
      expect(mongoQuery.sort).toEqual({ createdAt: -1, score: 1 });
      expect(mongoQuery.skip).toBe(20);
      expect(mongoQuery.limit).toBe(20);
    });
  });

  describe('Casos sin criterios', () => {
    it('debe retornar un objeto vacío si no se provee ningún criterio', () => {
      const criteria = new SearchCriteriaDto();
      const mongoQuery = new MongoCriteriaConverter().convert(criteria);

      expect(mongoQuery).toEqual({
        filter: {},
        sort: {},
        skip: 0,
        limit: 0,
      });
    });
  });
});

describe('MongoCriteriaConverter edge cases', () => {
  const convertFilter = (filter: SimpleFilterDto) =>
    new MongoCriteriaConverter().convert(new SearchCriteriaDto(filter)).filter;

  it('converts "ne", "gte", "lt" and "lte" to their Mongo operators', () => {
    expect(convertFilter(new SimpleFilterDto('a', FilterOperator.NE, 'x'))).toEqual({
      a: { $ne: 'x' },
    });
    expect(convertFilter(new SimpleFilterDto('a', FilterOperator.GTE, 1))).toEqual({
      a: { $gte: 1 },
    });
    expect(convertFilter(new SimpleFilterDto('a', FilterOperator.LT, 1))).toEqual({
      a: { $lt: 1 },
    });
    expect(convertFilter(new SimpleFilterDto('a', FilterOperator.LTE, 1))).toEqual({
      a: { $lte: 1 },
    });
  });

  it('converts "in" and "nin" keeping an array value', () => {
    expect(convertFilter(new SimpleFilterDto('a', FilterOperator.IN, ['x', 'y']))).toEqual({
      a: { $in: ['x', 'y'] },
    });
    expect(convertFilter(new SimpleFilterDto('a', FilterOperator.NIN, ['x', 'y']))).toEqual({
      a: { $nin: ['x', 'y'] },
    });
  });

  it('wraps a single "in" and "nin" value in an array', () => {
    expect(convertFilter(new SimpleFilterDto('a', FilterOperator.IN, 'x'))).toEqual({
      a: { $in: ['x'] },
    });
    expect(convertFilter(new SimpleFilterDto('a', FilterOperator.NIN, 'x'))).toEqual({
      a: { $nin: ['x'] },
    });
  });

  it('rejects "between" without exactly two values', () => {
    expect(() => convertFilter(new SimpleFilterDto('a', FilterOperator.BETWEEN, 5))).toThrow(
      'BETWEEN operator requires an array of two values for field a',
    );
    expect(() =>
      convertFilter(new SimpleFilterDto('a', FilterOperator.BETWEEN, [1, 2, 3])),
    ).toThrow('BETWEEN operator requires an array of two values for field a');
  });

  it('rejects an operator without a Mongo equivalent', () => {
    expect(() => convertFilter(new SimpleFilterDto('a', FilterOperator.INARRAY, 'x'))).toThrow(
      'Operator inarray is not supported for Mongo conversion',
    );
  });

  it('rejects a filter that is neither simple nor composite', () => {
    const criteria = new SearchCriteriaDto({} as SimpleFilterDto);
    expect(() => new MongoCriteriaConverter().convert(criteria)).toThrow('Unsupported filter type');
  });

  it('sorts by "_id" when ordering by "id"', () => {
    const criteria = new SearchCriteriaDto(
      undefined,
      new SearchOrderDto([{ field: 'id', direction: 'desc' }]),
    );
    expect(new MongoCriteriaConverter().convert(criteria).sort).toEqual({ _id: -1 });
  });
});
