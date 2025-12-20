import { FilterOperator } from '../../filter-operator';
import { SearchCriteriaDto } from '../../search-criteria.dto';
import { SearchFilterDto } from '../../search-filter.dto';
import { SimpleFilterDto } from '../../simple-filter.dto';
import { CompositeFilterDto } from '../../composite-filter.dto';
import { SearchOrderDto } from '../../search-order.dto';
import { SearchPaginatorDto } from '../../search-paginator.dto';
import { MongoFilter, MongoFilterOperator, MongoQuery, MongoSort } from './mongo-query';

export class MongoCriteriaConverter {
  // Map our FilterOperator to MongoDB operator strings
  private operatorMap: { [key in FilterOperator]?: MongoFilterOperator } = {
    [FilterOperator.EQ]: '$eq',
    [FilterOperator.NE]: '$ne',
    [FilterOperator.GT]: '$gt',
    [FilterOperator.GTE]: '$gte',
    [FilterOperator.LT]: '$lt',
    [FilterOperator.LTE]: '$lte',
    [FilterOperator.LIKE]: '$regex',
    [FilterOperator.ILIKE]: '$regex',
    // For IN, NIN and BETWEEN, we'll handle them specially
  };

  public convert(criteria: SearchCriteriaDto): MongoQuery {
    const filter = criteria.filters ? this.generateFilter(criteria.filters) : {};
    const sort = criteria.orders ? this.generateSort(criteria.orders) : {};
    const { skip, limit } = this.generatePagination(criteria.paginator);
    // GroupBy is not directly applied to a MongoDB query (it would be used in an aggregation pipeline),
    // so we ignore it here.
    return { filter, sort, skip, limit };
  }

  private generateFilter(filterDto: SearchFilterDto): MongoFilter {
    if (filterDto instanceof SimpleFilterDto) {
      return this.generateSimpleFilter(filterDto);
    } else if (filterDto instanceof CompositeFilterDto) {
      // Recursively convert each nested filter
      const nestedFilters = filterDto.filters.map((f) => this.generateFilter(f));
      // Combine using $and or $or depending on the logical operator.
      if (filterDto.logicalOperator === 'or') {
        return { $or: nestedFilters };
      } else {
        return { $and: nestedFilters };
      }
    }
    throw new Error('Unsupported filter type');
  }

  private generateSimpleFilter(filter: SimpleFilterDto): MongoFilter {
    const field = filter.field;
    const value = filter.value;

    // Si el operador es EQ, devolvemos directamente el valor
    if (filter.operator === FilterOperator.EQ) {
      return { [field]: value } as unknown as MongoFilter;
    }

    const op: MongoFilterOperator | undefined = this.operatorMap[filter.operator];

    // Handle special operators:
    if (filter.operator === FilterOperator.IN) {
      return { [field]: { $in: Array.isArray(value) ? value : [value] } };
    }
    if (filter.operator === FilterOperator.NIN) {
      return { [field]: { $nin: Array.isArray(value) ? value : [value] } };
    }
    if (filter.operator === FilterOperator.BETWEEN) {
      if (!Array.isArray(value) || value.length !== 2) {
        throw new Error(`BETWEEN operator requires an array of two values for field ${field}`);
      }
      return { [field]: { $gte: value[0], $lte: value[1] } };
    }
    if (filter.operator === FilterOperator.LIKE || filter.operator === FilterOperator.ILIKE) {
      const regexOptions = filter.operator === FilterOperator.ILIKE ? 'i' : '';
      const regexFilter = regexOptions ? { $regex: value, $options: regexOptions } : { $regex: value };
      return { [field]: regexFilter } as unknown as MongoFilter;
    }
    if (op) {
      return { [field]: { [op]: value } };
    }
    throw new Error(`Operator ${filter.operator} is not supported for Mongo conversion`);
  }

  private generateSort(orders: SearchOrderDto): MongoSort {
    const sort: MongoSort = {};
    orders.orders.forEach((orderItem) => {
      // If ordering by "id", we assume Mongo's _id field.
      const field = orderItem.field === 'id' ? '_id' : orderItem.field;
      sort[field] = orderItem.direction === 'asc' ? 1 : -1;
    });
    return sort;
  }

  private generatePagination(paginator?: SearchPaginatorDto): { skip: number; limit: number } {
    if (!paginator) {
      return { skip: 0, limit: 0 };
    }
    const skip = (paginator.page - 1) * paginator.perPage;
    const limit = paginator.perPage;
    return { skip, limit };
  }
}
