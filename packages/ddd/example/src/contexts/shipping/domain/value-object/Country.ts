import { Validations } from '@archi-code/validation';
import { Required, StringType } from '../../../../ddd/domain';

@Validations([{ validator: 'isISO31661Alpha2' }])
export class Country extends Required(StringType) {}
