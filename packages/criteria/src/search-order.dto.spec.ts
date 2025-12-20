import { describe, expect, it } from '@jest/globals';
import { SearchOrderDto } from './search-order.dto';
import { SearchOrderItemDto } from './search-order-item.dto';

describe('SearchOrderDto', () => {
  describe('Valid cases', () => {
    it('should create a SearchOrderDto with a single order', () => {
      const orderItem: SearchOrderItemDto = { field: 'name', direction: 'asc' };
      const dto = new SearchOrderDto([orderItem]);
      expect(dto.orders).toHaveLength(1);
      expect(dto.orders[0]).toEqual(orderItem);
    });

    it('should create a SearchOrderDto with multiple orders', () => {
      const orders: SearchOrderItemDto[] = [
        { field: 'age', direction: 'desc' },
        { field: 'name', direction: 'asc' },
      ];
      const dto = new SearchOrderDto(orders);
      expect(dto.orders).toHaveLength(2);
      expect(dto.orders[0]).toEqual(orders[0]);
      expect(dto.orders[1]).toEqual(orders[1]);
    });
  });

  describe('Invalid cases', () => {
    it('should throw an error if orders is not an array', () => {
      expect(() => new SearchOrderDto(null as any)).toThrow('SearchOrderDto: orders must be an array');
      expect(() => new SearchOrderDto({ field: 'name', direction: 'asc' } as any)).toThrow('SearchOrderDto: orders must be an array');
    });

    it('should throw an error if an order item has an empty field', () => {
      const orders: SearchOrderItemDto[] = [{ field: '', direction: 'asc' }];
      expect(() => new SearchOrderDto(orders)).toThrow('SearchOrderDto: Each order must have a non-empty string as field');
    });

    it('should throw an error if an order item has a non-string field', () => {
      const orders: SearchOrderItemDto[] = [{ field: 123 as any, direction: 'asc' }];
      expect(() => new SearchOrderDto(orders)).toThrow('SearchOrderDto: Each order must have a non-empty string as field');
    });

    it('should throw an error if an order item has an invalid direction', () => {
      const orders: SearchOrderItemDto[] = [{ field: 'name', direction: 'up' as any }];
      expect(() => new SearchOrderDto(orders)).toThrow('SearchOrderDto: Each order must have direction "asc" or "desc"');
    });

    it('should throw an error if one order item in multiple orders is invalid', () => {
      const orders: SearchOrderItemDto[] = [
        { field: 'name', direction: 'asc' },
        { field: 'age', direction: 'invalid' as any },
      ];
      expect(() => new SearchOrderDto(orders)).toThrow('SearchOrderDto: Each order must have direction "asc" or "desc"');
    });
  });
});
