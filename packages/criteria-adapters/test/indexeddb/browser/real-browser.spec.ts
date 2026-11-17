import { describe, expect, it } from 'vitest';

describe('the browser specs run in a real browser, on its own IndexedDB', () => {
  it('runs inside a Chromium page, not in Node', () => {
    expect(typeof window).toBe('object');
    expect(typeof document).toBe('object');
    expect(navigator.userAgent).toContain('Chrome');
  });

  it('uses the native IndexedDB of the browser, not a library that imitates it', () => {
    expect(Object.prototype.toString.call(indexedDB)).toBe('[object IDBFactory]');
    expect(indexedDB).toBeInstanceOf(IDBFactory);
    expect(Function.prototype.toString.call(IDBFactory)).toContain('[native code]');
    expect(Function.prototype.toString.call(indexedDB.open)).toContain('[native code]');
    expect(Function.prototype.toString.call(IDBKeyRange.bound)).toContain('[native code]');
  });
});
