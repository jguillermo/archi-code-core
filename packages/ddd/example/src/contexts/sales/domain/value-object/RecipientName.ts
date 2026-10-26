import { Validations } from '@archi-code/validation';
import { Required, StringType } from '../../../../ddd/domain';

@Validations([{ validator: 'isLength', properties: { min: 2, max: 80 } }])
export class RecipientName extends Required(StringType) {}
