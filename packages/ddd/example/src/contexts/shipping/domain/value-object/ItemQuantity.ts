import { Validations } from '@archi-code/validation';
import { NumberType, Required } from '../../../../ddd/domain';

@Validations([{ validator: 'isInt', properties: { min: 1 } }])
export class ItemQuantity extends Required(NumberType) {}
