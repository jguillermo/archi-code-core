import { Validations } from '@archi-code/validation';
import { Required, StringType } from '../../../../ddd/domain';

@Validations([{ validator: 'isLength', properties: { min: 1, max: 60 } }])
export class RejectionReason extends Required(StringType) {}
