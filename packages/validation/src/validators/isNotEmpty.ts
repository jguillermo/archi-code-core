import { toString } from '../convert/string';

export function isNotEmpty(value: unknown): boolean {
  if (typeof value === 'boolean') return false;
  const text = toString(value);
  return text.ok && text.value.trim() !== '';
}
