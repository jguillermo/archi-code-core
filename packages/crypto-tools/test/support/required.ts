export function required<T>(value: T | undefined): T {
  if (value === undefined) {
    throw new Error('Expected a value.');
  }
  return value;
}
