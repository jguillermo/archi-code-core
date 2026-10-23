import { Validations } from '@archi-code/validation';
import { Composite, Required, StringType } from '../../../../ddd/domain';

@Validations([{ validator: 'isLength', properties: { min: 2, max: 80 } }])
export class RecipientName extends Required(StringType) {}

@Validations([
  {
    validator: 'matches',
    properties: { pattern: /^\+?[0-9 ]{7,15}$/ },
    message: 'A phone has 7 to 15 digits',
  },
])
export class Phone extends Required(StringType) {}

@Validations([{ validator: 'isLength', properties: { min: 3, max: 120 } }])
export class Street extends Required(StringType) {}

@Validations([{ validator: 'isLength', properties: { min: 2, max: 60 } }])
export class City extends Required(StringType) {}

@Validations([
  {
    validator: 'matches',
    properties: { pattern: /^[0-9A-Z -]{3,10}$/ },
    message: 'A postal code has 3 to 10 capital letters or digits',
  },
])
export class PostalCode extends Required(StringType) {}

@Validations([{ validator: 'isISO31661Alpha2' }])
export class CountryCode extends Required(StringType) {}

export class Recipient extends Composite({ name: RecipientName, phone: Phone }) {}

export class ShippingAddress extends Composite({
  recipient: Recipient,
  street: Street,
  city: City,
  postalCode: PostalCode,
  country: CountryCode,
}) {}
