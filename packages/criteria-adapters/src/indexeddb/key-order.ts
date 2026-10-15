const FROM_D800 = /[\uD800-￿]/;

export function ordersLikeCriteria(value: unknown): boolean {
  return typeof value !== 'string' || !FROM_D800.test(value);
}
