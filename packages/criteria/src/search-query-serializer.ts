import { SearchCriteriaDto } from './search-criteria.dto';
import { SearchOrderDto } from './search-order.dto';
import { SearchPaginatorDto } from './search-paginator.dto';
import { SearchFilterDto } from './search-filter.dto';
import { CompositeFilterDto } from './composite-filter.dto';
import { SimpleFilterDto } from './simple-filter.dto';
import { SearchGroupByDto } from './search-group-by.dto';
import { SearchOrderItemDto } from './search-order-item.dto';

/**
 * Class responsible for serializing and deserializing SearchCriteriaDto instances
 * into a custom JSON object.
 *
 * The JSON format:
 * {
 *   "filters": <custom filters object>,
 *   "orders": <array of orders>,
 *   "paginator": <paginator object>,
 *   "groupBy": <array of groupBy fields>
 * }
 */
export class SearchQuerySerializer {
  public static serialize(query: SearchCriteriaDto): string {
    const obj: any = {};
    obj.filters = query.filters ? this.serializeFilter(query.filters) : null;
    obj.orders = query.orders ? query.orders.orders.map((o: SearchOrderItemDto) => ({ field: o.field, direction: o.direction })) : null;
    obj.paginator = query.paginator ? { page: query.paginator.page, perPage: query.paginator.perPage } : null;
    obj.groupBy = query.groupBy ? query.groupBy.fields : null;
    return JSON.stringify(obj);
  }

  public static deserialize(serialized: string): SearchCriteriaDto {
    let obj: any;
    try {
      obj = JSON.parse(serialized);
    } catch (error) {
      throw new Error('Invalid JSON string');
    }
    const filters = obj.filters ? this.deserializeFilter(obj.filters) : undefined;
    const orders = obj.orders ? new SearchOrderDto(obj.orders) : undefined;
    const paginator = obj.paginator ? new SearchPaginatorDto(obj.paginator.page, obj.paginator.perPage) : undefined;
    const groupBy = obj.groupBy ? new SearchGroupByDto(obj.groupBy) : undefined;
    return new SearchCriteriaDto(filters, orders, paginator, groupBy);
  }

  private static serializeFilter(filter: SearchFilterDto): any {
    if (filter instanceof SimpleFilterDto) {
      return {
        type: 'simple',
        field: filter.field,
        operator: filter.operator,
        value: filter.value,
      };
    } else if (filter instanceof CompositeFilterDto) {
      return {
        type: 'composite',
        logicalOperator: filter.logicalOperator,
        filters: filter.filters.map((f) => this.serializeFilter(f)),
      };
    }
    throw new Error('Unknown filter type');
  }

  private static deserializeFilter(obj: any): SearchFilterDto {
    if (obj.type === 'simple') {
      return new SimpleFilterDto(obj.field, obj.operator, obj.value);
    } else if (obj.type === 'composite') {
      const subFilters = Array.isArray(obj.filters) ? obj.filters.map((sub: any) => this.deserializeFilter(sub)) : [];
      return new CompositeFilterDto(obj.logicalOperator, subFilters);
    }
    throw new Error('Unknown filter format');
  }
}
