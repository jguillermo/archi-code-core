import { toDate } from '../convert/date';
import { optionsOf } from '../helpers/config';

export interface IsDateOptions {
  format?: string;
  strictMode?: boolean;
  delimiters?: string[];
  twoDigitYearPivot?: number;
}

export function isDate(value: unknown, options?: IsDateOptions): boolean {
  return toDate(value, optionsOf(options)).ok;
}
