import { IndexedDbSchema } from '../../../../src/infrastructure/index';

export interface OrderRow {
  readonly id: string;
  readonly customerId: string;
  readonly lines: string[];
  readonly status: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export class OrderSchema extends IndexedDbSchema<OrderRow> {
  constructor() {
    super({ name: 'orders', indexes: { byCustomer: 'customerId' } });
  }
}
