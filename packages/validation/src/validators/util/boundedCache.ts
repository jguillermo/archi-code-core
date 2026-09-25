/**
 * Small LRU cache with a hard size limit. Used for regexes compiled from caller-supplied
 * options: an unbounded Map would grow forever if those options vary per request.
 */
export class BoundedCache<V> {
  private readonly map = new Map<string, V>();

  constructor(private readonly maxSize = 256) {}

  get size(): number {
    return this.map.size;
  }

  getOrCreate(key: string, create: () => V): V {
    const hit = this.map.get(key);
    if (hit !== undefined) {
      // refresh recency
      this.map.delete(key);
      this.map.set(key, hit);
      return hit;
    }
    const value = create();
    if (this.map.size >= this.maxSize) {
      // evict least recently used (first inserted)
      this.map.delete(this.map.keys().next().value as string);
    }
    this.map.set(key, value);
    return value;
  }
}
