import { Validations } from '@archi-code/validation';
import { NumberType, Required } from '../../../../ddd/domain';

@Validations([
  { validator: 'isInt', properties: { min: 0, max: 50 }, message: 'A discount goes from 0 to 50%' },
])
export class DiscountPercent extends Required(NumberType) {}
