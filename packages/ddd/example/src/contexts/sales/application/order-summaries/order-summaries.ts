import type { OrderSummary } from './order-summary';

export interface OrderSummaries {
  byIdOfCustomer(orderId: string, customerId: string): Promise<OrderSummary | null>;
  ofCustomer(customerId: string): Promise<OrderSummary[]>;
}
