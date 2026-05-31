export default function toString(input: unknown): string {
  if (input === null || input === undefined) return '';
  if (typeof input === 'number' && isNaN(input)) return '';
  if (typeof input === 'object') {
    const obj = input as { toString?: unknown };
    return typeof obj.toString === 'function' ? (obj.toString as () => string)() : '[object Object]';
  }
  return String(input);
}
