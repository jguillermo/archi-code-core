import type { PrimitiveTypes } from '@archi-code/ddd/domain';
import { IndexedDbSchema } from '@archi-code/ddd/infrastructure';
import type { Order } from './order';

export type OrderRow = PrimitiveTypes<Order>;

export class OrderSchema extends IndexedDbSchema<OrderRow> {
  constructor() {
    super({
      name: 'orders',
      indexes: { byCustomer: 'customerId', byCreatedAt: 'createdAt' },
    });
  }
}
