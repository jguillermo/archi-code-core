import type { OrderSummary } from './order-summary';

export interface OrderSummaryStore {
  find(orderId: string): Promise<OrderSummary | null>;
  hasApplied(eventId: string): Promise<boolean>;
  save(summary: OrderSummary, eventId: string): Promise<void>;
}
