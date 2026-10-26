import type { Money } from '../../../shared-kernel/money/Money';
import type { Quantity } from '../value-object/Quantity';
import type { Sku } from '../value-object/Sku';

export interface NewOrderLine {
  sku: Sku;
  quantity: Quantity;
  unitPrice: Money;
}
