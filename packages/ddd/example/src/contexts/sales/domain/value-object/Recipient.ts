import { Composite } from '../../../../ddd/domain';
import { Phone } from './Phone';
import { RecipientName } from './RecipientName';

export class Recipient extends Composite({ name: RecipientName, phone: Phone }) {}
