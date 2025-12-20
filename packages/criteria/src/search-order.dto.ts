import { SearchOrderItemDto } from './search-order-item.dto';

/**
 * DTO for managing multiple order criteria.
 */
export class SearchOrderDto {
  public readonly orders: SearchOrderItemDto[];

  constructor(orders: SearchOrderItemDto[]) {
    if (!Array.isArray(orders)) {
      throw new Error('SearchOrderDto: orders must be an array');
    }
    orders.forEach((o) => {
      if (!o.field || typeof o.field !== 'string') {
        throw new Error('SearchOrderDto: Each order must have a non-empty string as field');
      }
      if (o.direction !== 'asc' && o.direction !== 'desc') {
        throw new Error('SearchOrderDto: Each order must have direction "asc" or "desc"');
      }
    });
    this.orders = orders;
  }
}
