import { Validations } from '@archi-code/validation';
import { Required, StringType } from '../../../../ddd/domain';

@Validations([
  {
    validator: 'matches',
    properties: { pattern: /^\+?[0-9 ]{7,15}$/ },
    message: 'A phone has 7 to 15 digits',
  },
])
export class Phone extends Required(StringType) {}
