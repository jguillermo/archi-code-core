import { Required } from '../../../ddd/domain';
import { CentsAmount } from './CentsAmount';

export class Cents extends Required(CentsAmount) {}
