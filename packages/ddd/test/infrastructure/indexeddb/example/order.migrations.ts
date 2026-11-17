import { OrderStatus } from './order';
import type { OrderRow } from './order.schema';

export interface OrderRowV1 {
  readonly id: string;
  readonly customerId: string;
  readonly lines: string[];
  readonly status: 'new' | 'shipped' | 'cancelled';
  readonly createdAt: Date;
}

export interface OrderRowV2 {
  readonly id: string;
  readonly customerId: string;
  readonly lines: string[];
  readonly status: OrderStatus;
  readonly createdAt: Date;
  readonly updatedAt?: Date;
}

export function renameNewStatusAndDropCancelled(row: OrderRowV1): OrderRowV2 | null {
  if (row.status === 'cancelled') {
    return null;
  }
  return { ...row, status: row.status === 'new' ? OrderStatus.PLACED : OrderStatus.SHIPPED };
}

export function stampMissingUpdatedAt(row: OrderRowV2): OrderRow {
  return { ...row, updatedAt: row.updatedAt ?? row.createdAt };
}
