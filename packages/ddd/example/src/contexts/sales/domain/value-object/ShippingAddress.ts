import { Composite } from '../../../../ddd/domain';
import { City } from './City';
import { CountryCode } from './CountryCode';
import { PostalCode } from './PostalCode';
import { Recipient } from './Recipient';
import { Street } from './Street';

export class ShippingAddress extends Composite({
  recipient: Recipient,
  street: Street,
  city: City,
  postalCode: PostalCode,
  country: CountryCode,
}) {}
