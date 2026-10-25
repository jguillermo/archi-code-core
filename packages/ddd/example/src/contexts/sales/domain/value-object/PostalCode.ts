import { Validations } from '@archi-code/validation';
import { Required, StringType } from '../../../../ddd/domain';

@Validations([
  {
    validator: 'matches',
    properties: { pattern: /^[0-9A-Z -]{3,10}$/ },
    message: 'A postal code has 3 to 10 capital letters or digits',
  },
])
export class PostalCode extends Required(StringType) {}
