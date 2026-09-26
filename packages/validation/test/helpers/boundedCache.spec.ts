import { BoundedCache } from '../../src/helpers/boundedCache';

describe('B.3 hostile options', () => {
  it('BoundedCache evicts the least recently used entry at its limit', () => {
    const cache = new BoundedCache<number>(2);
    cache.getOrCreate('a', () => 1);
    cache.getOrCreate('b', () => 2);
    cache.getOrCreate('a', () => -1); // hit → 'a' becomes most recent
    cache.getOrCreate('c', () => 3); // evicts 'b'
    expect(cache.size).toBe(2);
    expect(cache.getOrCreate('a', () => -1)).toBe(1);
    expect(cache.getOrCreate('b', () => 22)).toBe(22); // was evicted → recreated
  });
});
