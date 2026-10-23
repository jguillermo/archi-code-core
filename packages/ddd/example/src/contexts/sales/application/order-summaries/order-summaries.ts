import type { OrderSummary } from './order-summary';

export interface OrderSummaries {
  byId(orderId: string): Promise<OrderSummary | null>;
  ofCustomer(customerId: string): Promise<OrderSummary[]>;
}
