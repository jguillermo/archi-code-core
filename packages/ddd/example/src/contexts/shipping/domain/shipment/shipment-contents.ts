import { Validations } from '@archi-code/validation';
import { Composite, NumberType, Required, StringType } from '../../../../ddd/domain';

export class ItemSku extends Required(StringType) {}

@Validations([{ validator: 'isInt', properties: { min: 1 } }])
export class ItemQuantity extends Required(NumberType) {}

export class ShipmentItem extends Composite({ sku: ItemSku, quantity: ItemQuantity }) {}

@Validations([
  {
    custom: 'atLeastOneItem',
    fn: (contents) => (contents as ShipmentContents).items.length > 0,
    message: 'A shipment carries at least one item',
  },
])
export class ShipmentContents extends Composite({ items: [ShipmentItem] }) {
  units(): number {
    return this.items.reduce((units, item) => units + item.quantity.value, 0);
  }
}
