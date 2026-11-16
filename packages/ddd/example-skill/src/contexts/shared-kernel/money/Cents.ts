import { Required } from '@archi-code/ddd/domain';
import { CentsAmount } from './CentsAmount';

export class Cents extends Required(CentsAmount) {}
