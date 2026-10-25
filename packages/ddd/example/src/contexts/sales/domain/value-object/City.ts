import { Validations } from '@archi-code/validation';
import { Required, StringType } from '../../../../ddd/domain';

@Validations([{ validator: 'isLength', properties: { min: 2, max: 60 } }])
export class City extends Required(StringType) {}
