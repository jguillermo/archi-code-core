import { Entity } from '../../../../ddd/domain';
import type { Money } from '../../../shared-kernel/money/Money';
import type { LineNumber } from '../value-object/LineNumber';
import type { Quantity } from '../value-object/Quantity';
import type { Sku } from '../value-object/Sku';

export class OrderLine extends Entity<LineNumber> {
  readonly sku: Sku;
  private _quantity: Quantity;
  readonly unitPrice: Money;

  constructor(id: LineNumber, sku: Sku, quantity: Quantity, unitPrice: Money) {
    super(id);
    this.sku = sku;
    this._quantity = quantity;
    this.unitPrice = unitPrice;
  }

  get quantity(): Quantity {
    return this._quantity;
  }

  subtotal(): Money {
    return this.unitPrice.times(this._quantity.value);
  }

  changeQuantity(quantity: Quantity): void {
    this._quantity = quantity;
  }
}
