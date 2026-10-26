import { Validations } from '@archi-code/validation';
import { Composite } from '../../../../ddd/domain';
import { ShipmentItem } from './ShipmentItem';

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
