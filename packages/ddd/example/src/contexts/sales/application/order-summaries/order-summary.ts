import type { MoneyData } from '../../domain/order/order-events';

export interface OrderSummary {
  orderId: string;
  customerId: string | null;
  status: string;
  total: MoneyData | null;
  items: number;
  trackingNumber: string | null;
  lastEventAt: string;
}

export type OrderSummaryChanges = Partial<
  Pick<OrderSummary, 'customerId' | 'status' | 'total' | 'items' | 'trackingNumber'>
>;
