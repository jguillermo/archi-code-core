import { Composite } from '../../../../ddd/domain';
import { AddressLine } from './AddressLine';
import { Country } from './Country';
import { PostCode } from './PostCode';
import { Recipient } from './Recipient';
import { Town } from './Town';

export class ShipmentAddress extends Composite({
  recipient: Recipient,
  street: AddressLine,
  city: Town,
  postalCode: PostCode,
  country: Country,
}) {}
