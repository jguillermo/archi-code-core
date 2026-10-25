import { Validations } from '@archi-code/validation';
import { Required, StringType } from '../../../../ddd/domain';

@Validations([
  {
    validator: 'matches',
    properties: { pattern: /^[A-Z0-9]{4,12}$/ },
    message: 'A coupon code has 4 to 12 capital letters or digits',
  },
])
export class CouponCode extends Required(StringType) {}
