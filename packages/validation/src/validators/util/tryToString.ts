import { toString } from '../../convert';

export default function tryToString(input: unknown): string | false {
  try {
    return toString(input);
  } catch {
    return false;
  }
}
