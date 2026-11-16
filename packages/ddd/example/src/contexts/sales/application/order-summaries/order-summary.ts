import type { MoneyData } from '../place-order/money-data';

export interface OrderSummary {
  orderId: string;
  customerId: string | null;
  paid: boolean;
  shipped: boolean;
  delivered: boolean;
  cancelled: boolean;
  total: MoneyData | null;
  items: number;
  trackingNumber: string | null;
  lastEventAt: string;
}

export type OrderSummaryChanges = Partial<
  Pick<
    OrderSummary,
    | 'customerId'
    | 'total'
    | 'items'
    | 'paid'
    | 'shipped'
    | 'delivered'
    | 'cancelled'
    | 'trackingNumber'
  >
>;
