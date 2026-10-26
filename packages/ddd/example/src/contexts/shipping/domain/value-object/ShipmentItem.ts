import { Composite } from '../../../../ddd/domain';
import { ItemQuantity } from './ItemQuantity';
import { ItemSku } from './ItemSku';

export class ShipmentItem extends Composite({ sku: ItemSku, quantity: ItemQuantity }) {}
