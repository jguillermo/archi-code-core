import { jest } from '@jest/globals';

type StringMethod = 'trim' | 'trimStart' | 'trimEnd';

/**
 * Loads `modulePath` in an isolated module registry while the given String.prototype methods are
 * missing, as on an engine without them, so the programmed fallback of a sanitizer can be tested.
 * The methods are restored before returning.
 */
export function loadWithoutNative<T>(modulePath: string, methods: StringMethod[]): T {
  const proto = String.prototype as unknown as Record<string, unknown>;
  const saved = methods.map((m) => [m, proto[m]] as const);
  let loaded: T | undefined;
  try {
    for (const m of methods) Reflect.deleteProperty(proto, m);
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      loaded = require(modulePath) as T;
    });
  } finally {
    for (const [m, fn] of saved) proto[m] = fn;
  }
  return loaded as T;
}

/** Inputs covering every whitespace code unit plus non-whitespace edges. */
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
