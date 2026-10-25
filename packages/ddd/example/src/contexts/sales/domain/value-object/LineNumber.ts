import { Validations } from '@archi-code/validation';
import { NumberType, Required } from '../../../../ddd/domain';

@Validations([{ validator: 'isInt', properties: { min: 1, max: 20 } }])
export class LineNumber extends Required(NumberType) {}
