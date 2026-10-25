import { Validations } from '@archi-code/validation';
import { Required, StringType } from '../../../../ddd/domain';

@Validations([{ validator: 'isLength', properties: { min: 3, max: 120 } }])
export class Street extends Required(StringType) {}
