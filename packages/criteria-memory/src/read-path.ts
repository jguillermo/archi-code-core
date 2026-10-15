export function readPath(item: unknown, field: string): unknown {
  let current: unknown = item;
  for (const segment of field.split('.')) {
    if (current === null || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}
