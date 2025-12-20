import { describe, expect, it } from '@jest/globals';
import { SimpleFilterDto } from '../../simple-filter.dto';
import { FilterOperator } from '../../filter-operator';
import { SearchCriteriaDto } from '../../search-criteria.dto';
import { MongoCriteriaConverter } from './mongo-criteria-converter';
import { CompositeFilterDto } from '../../composite-filter.dto';
import { SearchOrderDto } from '../../search-order.dto';
import { SearchPaginatorDto } from '../../search-paginator.dto';
import { SearchGroupByDto } from '../../search-group-by.dto';
import { SearchOrderItemDto } from '../../search-order-item.dto';

describe('MongoCriteriaConverter', () => {
  describe('Filtros simples', () => {
    it('debe convertir un filtro simple con operador "eq"', () => {
      const filter = new SimpleFilterDto('name', FilterOperator.EQ, 'Alice');
      const criteria = new SearchCriteriaDto(filter);
      const mongoQuery = new MongoCriteriaConverter().convert(criteria);

      // Se espera que el filtro se convierta en: { name: 'Alice' }
      expect(mongoQuery.filter).toEqual({ name: 'Alice' });
    });

    it('debe convertir un filtro simple con operador "gt"', () => {
      const filter = new SimpleFilterDto('age', FilterOperator.GT, 30);
      const criteria = new SearchCriteriaDto(filter);
      const mongoQuery = new MongoCriteriaConverter().convert(criteria);

      // Se espera: { age: { $gt: 30 } }
      expect(mongoQuery.filter).toEqual({ age: { $gt: 30 } });
    });

    it('debe convertir un filtro simple con operador "between"', () => {
      const filter = new SimpleFilterDto('price', FilterOperator.BETWEEN, [10, 20]);
      const criteria = new SearchCriteriaDto(filter);
      const mongoQuery = new MongoCriteriaConverter().convert(criteria);

      // Se espera: { price: { $gte: 10, $lte: 20 } }
      expect(mongoQuery.filter).toEqual({ price: { $gte: 10, $lte: 20 } });
    });

    it('debe convertir un filtro simple con operador "like"', () => {
      const filter = new SimpleFilterDto('description', FilterOperator.LIKE, 'book');
      const criteria = new SearchCriteriaDto(filter);
      const mongoQuery = new MongoCriteriaConverter().convert(criteria);

      // Se espera que se utilice $regex para búsquedas LIKE
      expect(mongoQuery.filter).toEqual({ description: { $regex: 'book' } });
    });

    it('debe convertir un filtro simple con operador "ilike"', () => {
      const filter = new SimpleFilterDto('description', FilterOperator.ILIKE, 'BOOK');
      const criteria = new SearchCriteriaDto(filter);
      const mongoQuery = new MongoCriteriaConverter().convert(criteria);

      // Se espera: regex con opción "i" para insensibilidad a mayúsculas/minúsculas
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

      // Se espera que el filtro compuesto se convierta en un $and con cada subfiltro
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

      // Se espera: { $or: [ { category: 'books' }, { category: 'electronics' } ] }
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

      // Se espera que se respeten los anidados:
      // { $and: [ { $or: [ { price: { $lt: 100 } } ] } ] }
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

      // Se espera: sort: { name: 1, age: -1 }
      expect(mongoQuery.sort).toEqual({ name: 1, age: -1 });
    });
  });

  describe('Paginación', () => {
    it('debe convertir el paginador a skip y limit', () => {
      const paginator = new SearchPaginatorDto(3, 10); // page 3, 10 elementos por página
      const criteria = new SearchCriteriaDto(undefined, undefined, paginator);
      const mongoQuery = new MongoCriteriaConverter().convert(criteria);

      // Se espera que skip sea (3-1)*10 = 20 y limit 10
      expect(mongoQuery.skip).toBe(20);
      expect(mongoQuery.limit).toBe(10);
    });
  });

  // Todo: group by no es posible implemnetar en un search, seberia ser un pipe, pero se deja por si se implementa en el futuro
  // describe('Group By', () => {
  //   it('debe convertir el groupBy a un arreglo de campos', () => {
  //     const groupBy = new SearchGroupByDto(['department', 'role']);
  //     const criteria = new SearchCriteriaDto(undefined, undefined, undefined, groupBy);
  //     const mongoQuery = new MongoCriteriaConverter().convert(criteria);
  //
  //     // Se espera que group sea igual al array de campos
  //     expect(mongoQuery.group).toEqual(['department', 'role']);
  //   });
  // });

  describe('Conversión completa', () => {
    it('debe convertir una SearchCriteriaDto completa', () => {
      // Filtros compuestos
      const filter1 = new SimpleFilterDto('status', FilterOperator.EQ, 'active');
      const filter2 = new SimpleFilterDto('score', FilterOperator.GTE, 50);
      const compositeFilter = new CompositeFilterDto('or', [filter1, filter2]);

      // Ordenamiento
      const orders: SearchOrderItemDto[] = [
        { field: 'createdAt', direction: 'desc' },
        { field: 'score', direction: 'asc' },
      ];
      const orderDto = new SearchOrderDto(orders);

      // Paginador
      const paginator = new SearchPaginatorDto(2, 20); // page 2, 20 elementos por página

      // GroupBy
      const groupBy = new SearchGroupByDto('category');

      const criteria = new SearchCriteriaDto(compositeFilter, orderDto, paginator, groupBy);
      const mongoQuery = new MongoCriteriaConverter().convert(criteria);

      // Validamos el filtro
      expect(mongoQuery.filter).toEqual({
        $or: [{ status: 'active' }, { score: { $gte: 50 } }],
      });
      // Validamos el sort
      expect(mongoQuery.sort).toEqual({ createdAt: -1, score: 1 });
      // Validamos la paginación: page 2 => skip = 20, limit = 20
      expect(mongoQuery.skip).toBe(20);
      expect(mongoQuery.limit).toBe(20);
      // Validamos el groupBy
      // todo: implementar en el futuro
      // expect(mongoQuery.group).toEqual(['category']);
    });
  });

  describe('Casos sin criterios', () => {
    it('debe retornar un objeto vacío si no se provee ningún criterio', () => {
      const criteria = new SearchCriteriaDto();
      const mongoQuery = new MongoCriteriaConverter().convert(criteria);

      // Suponiendo que al no haber criterios se retorna un objeto con propiedades vacías o nulas.
      expect(mongoQuery).toEqual({
        filter: {},
        sort: {},
        skip: 0,
        limit: 0,
        // group: [],
      });
    });
  });
});
