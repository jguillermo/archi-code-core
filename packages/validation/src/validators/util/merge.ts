export default function merge<T extends object, D extends object>(
  obj: T | null | undefined,
  defaults: D,
): T & D {
  const result: Record<string, unknown> = typeof obj === 'object' && obj !== null ? { ...obj } : {};
  for (const key in defaults) {
    if (typeof result[key] === 'undefined') {
      result[key] = (defaults as Record<string, unknown>)[key];
    }
  }
  return result as T & D;
}
