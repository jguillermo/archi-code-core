import { Validations } from '@archi-code/validation';
import { StringType } from '../../../../ddd/domain';

@Validations([
  {
    validator: 'matches',
    properties: { pattern: /^[A-Z]{2}\d{9}[A-Z]{2}$/ },
    message: 'A tracking number looks like AB123456789ES',
  },
])
export class TrackingNumber extends StringType {}
