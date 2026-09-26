import { assertString } from '../helpers/assertString';
import { ltrim } from './ltrim';
import { rtrim } from './rtrim';

// Native since ES2019 (same whitespace set as /\s/). Detected once: older engines use ltrim + rtrim.
const hasNativeTrim = typeof String.prototype.trim === 'function';

export function trim(str: string, chars?: string): string {
  if (!chars && hasNativeTrim) {
    assertString(str);
    return str.trim();
  }
  return rtrim(ltrim(str, chars), chars);
}
