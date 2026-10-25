import { Validations } from '@archi-code/validation';
import { NumberType, Required } from '../../../../ddd/domain';

@Validations([
  { validator: 'isInt', properties: { min: 1, max: 99 }, message: 'From 1 to 99 units' },
])
export class Quantity extends Required(NumberType) {}
