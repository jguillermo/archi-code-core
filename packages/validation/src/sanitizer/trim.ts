import { ltrim } from './ltrim';
import { rtrim } from './rtrim';

export function trim(str: string, chars?: string): string {
  return rtrim(ltrim(str, chars), chars);
}
