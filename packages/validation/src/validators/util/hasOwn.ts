/**
 * Own-property lookup for locale/option tables. Unlike `key in table` it ignores the prototype
 * chain, so keys such as `'toString'`, `'constructor'` or `'__proto__'` are never matched.
 */
export function hasOwn<T extends object>(table: T, key: unknown): key is keyof T {
  return typeof key === 'string' && Object.prototype.hasOwnProperty.call(table, key);
}
