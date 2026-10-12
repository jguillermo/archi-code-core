// Bounded because keys come from caller-supplied options: an unbounded Map could grow forever.
export class BoundedCache<V> {
  private readonly map = new Map<string, V>();

  constructor(private readonly maxSize = 256) {}

  get size(): number {
    return this.map.size;
  }

  getOrCreate(key: string, create: () => V): V {
    const hit = this.map.get(key);
    if (hit !== undefined) {
      this.markMostRecentlyUsed(key, hit);
      return hit;
    }
    const value = create();
    if (this.map.size >= this.maxSize) {
      this.evictLeastRecentlyUsed();
    }
    this.map.set(key, value);
    return value;
  }

  private markMostRecentlyUsed(key: string, value: V): void {
    this.map.delete(key);
    this.map.set(key, value);
  }

  private evictLeastRecentlyUsed(): void {
    this.map.delete(this.map.keys().next().value as string);
  }
}
