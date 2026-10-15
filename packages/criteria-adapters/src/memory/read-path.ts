const ARRAY_INDEX = /^(0|[1-9]\d*)$/;

function readable(container: object, segment: string): boolean {
  if (Array.isArray(container) && !ARRAY_INDEX.test(segment)) {
    return false;
  }
  return Object.prototype.hasOwnProperty.call(container, segment);
}

export function readPath(item: unknown, field: string): unknown {
  let current: unknown = item;
  for (const segment of field.split('.')) {
    if (current === null || typeof current !== 'object' || !readable(current, segment)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}
