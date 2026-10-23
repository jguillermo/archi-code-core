import { Validations } from '@archi-code/validation';
import { Entity, NumberType, Required, StringType } from '../../../../ddd/domain';
import { Money } from '../../../shared-kernel/money/money';

@Validations([{ validator: 'isInt', properties: { min: 1, max: 20 } }])
export class LineNumber extends Required(NumberType) {}

@Validations([
  {
    validator: 'matches',
    properties: { pattern: /^[A-Z0-9-]{3,20}$/ },
    message: 'A SKU has 3 to 20 capital letters, digits or dashes',
  },
])
export class Sku extends Required(StringType) {}

@Validations([
  { validator: 'isInt', properties: { min: 1, max: 99 }, message: 'From 1 to 99 units' },
])
export class Quantity extends Required(NumberType) {}

export class OrderLine extends Entity<LineNumber> {
  constructor(
    id: LineNumber,
    readonly sku: Sku,
    private _quantity: Quantity,
    readonly unitPrice: Money,
  ) {
    super(id);
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
