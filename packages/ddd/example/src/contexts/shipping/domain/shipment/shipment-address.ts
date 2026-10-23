import { Validations } from '@archi-code/validation';
import { Composite, Required, StringType } from '../../../../ddd/domain';

export class RecipientName extends Required(StringType) {}
export class Phone extends Required(StringType) {}
export class AddressLine extends Required(StringType) {}
export class Town extends Required(StringType) {}
export class PostCode extends Required(StringType) {}

@Validations([{ validator: 'isISO31661Alpha2' }])
export class Country extends Required(StringType) {}

export class Recipient extends Composite({ name: RecipientName, phone: Phone }) {}

export class ShipmentAddress extends Composite({
  recipient: Recipient,
  street: AddressLine,
  city: Town,
  postalCode: PostCode,
  country: Country,
}) {}
