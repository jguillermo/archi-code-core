import type { PrimitiveTypes } from '../../../../src/domain/index';
import { IndexedDbSchema } from '../../../../src/infrastructure/index';
import type { Order } from './order';

export type OrderRow = PrimitiveTypes<Order>;

export class OrderSchema extends IndexedDbSchema<OrderRow> {
  constructor() {
    super({ name: 'orders', indexes: { byCustomer: 'customerId' } });
  }
}
