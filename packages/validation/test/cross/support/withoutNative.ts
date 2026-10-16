import { beforeAll, vi } from 'vitest';

type StringMethod = 'trim' | 'trimStart' | 'trimEnd';
type LoadedModule = Record<string, (...args: unknown[]) => unknown>;

export function loadWithoutNative<T>(modulePath: string, methods: StringMethod[]): T {
  let loaded: LoadedModule | undefined;
  beforeAll(async () => {
    const proto = String.prototype as unknown as Record<string, unknown>;
    const saved = methods.map((m) => [m, proto[m]] as const);
    try {
      for (const m of methods) Reflect.deleteProperty(proto, m);
      vi.resetModules();
      loaded = (await import(/* @vite-ignore */ modulePath)) as LoadedModule;
    } finally {
      for (const [m, fn] of saved) proto[m] = fn;
      vi.resetModules();
    }
  });
  return new Proxy(
    {},
    {
      get:
        (_target, name: string) =>
        (...args: unknown[]) =>
          (loaded as LoadedModule)[name](...args),
    },
  ) as T;
}

export const WHITESPACE_SAMPLES: string[] = (() => {
  const ws: string[] = [];
  for (let c = 0; c <= 0xffff; c++) {
    const ch = String.fromCharCode(c);
    if (/\s/.test(ch)) ws.push(ch);
  }
  const all = ws.join('');
  return [
    '',
    'x',
    ' x ',
    `${all}x${all}`,
    `${all}`,
    `x${all}y`,
    '​x​',
    ...ws.map((w) => `${w}a${w}b${w}`),
  ];
})();
