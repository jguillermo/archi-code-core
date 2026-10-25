import { Validations } from '@archi-code/validation';
import { Required, StringType } from '../../../../ddd/domain';

@Validations([
  {
    validator: 'matches',
    properties: { pattern: /^[A-Z0-9-]{3,20}$/ },
    message: 'A SKU has 3 to 20 capital letters, digits or dashes',
  },
])
export class Sku extends Required(StringType) {}
