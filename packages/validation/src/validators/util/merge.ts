export default function merge<T extends object, D extends object>(
  obj: T | null | undefined,
  defaults: D,
): T & D {
  // Fast path: no caller-supplied object — the result is just a copy of the defaults.
  if (obj === null || typeof obj !== 'object') {
    return { ...defaults } as T & D;
  }
  const result: Record<string, unknown> = { ...(obj as Record<string, unknown>) };
  for (const key in defaults) {
    if (typeof result[key] === 'undefined') {
      result[key] = (defaults as Record<string, unknown>)[key];
    }
  }
  return result as T & D;
}
