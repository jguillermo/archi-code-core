import { describe, expect, it } from 'vitest';
import { workerSource } from '../../src/worker/worker-source';

describe('workerSource', () => {
  it('appends a message handler for Web Workers and worker_threads to the glue', () => {
    const source = workerSource('let wasm_bindgen = 1;');
    expect(source.startsWith('let wasm_bindgen = 1;\n')).toBe(true);
    expect(source).toContain("getBuiltinModule?.('node:worker_threads')");
    expect(source).toContain('self.onmessage');
    expect(source).not.toMatch(/\bprocess\.|\brequire\s*\(/);
  });
});
