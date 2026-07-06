import { readFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { formatTable, writeMarkdown, compareNs, colorEnabled, type Row } from './report';
import { readBaseline, writeBaseline, type Baseline } from './baseline';

// Tiempos en nanosegundos ENTEROS (igual que en producción).
const rows: Row[] = [
  {
    name: 'isEmail',
    okOps: 1_000_000,
    okNs: 1000,
    okRme: 1.2,
    errOps: 1_200_000,
    errNs: 900,
    errRme: 0.8,
  },
  {
    name: 'isUUID',
    okOps: 4_000_000,
    okNs: 250,
    okRme: 0.5,
    errOps: 5_000_000,
    errNs: 200,
    errRme: 0.4,
  },
];

describe('report.formatTable', () => {
  it('includes a header row and one line per result', () => {
    const out = formatTable(rows, { color: false });
    expect(out).toContain('isEmail');
    expect(out).toContain('isUUID');
    expect(out).toContain('validador');
  });

  it('sorts rows slowest first (ascending ok ops/seg)', () => {
    const out = formatTable(rows, { color: false });
    expect(out.indexOf('isEmail')).toBeLessThan(out.indexOf('isUUID'));
  });

  it('shows only success/error time and Δ columns', () => {
    const out = formatTable(rows, { color: false });
    expect(out).toContain('éxito (ns)');
    expect(out).toContain('éxito Δ');
    expect(out).toContain('error (ns)');
    expect(out).toContain('error Δ');
    // Las columnas eliminadas ya no aparecen.
    expect(out).not.toContain('best');
    expect(out).not.toContain('±%');
  });

  it('shows a Spanish header explaining the columns', () => {
    const out = formatTable(rows, { color: false });
    expect(out).toContain('menos ns = más rápido');
    expect(out).toContain('rojo = más lento');
  });

  it('shows "base" for Δ when there is no baseline', () => {
    const out = formatTable(rows, { color: false });
    expect(out).toContain('base');
  });

  it('paints a regression in red and a real improvement in green when color is on', () => {
    const regressed: Row[] = [{ ...rows[0], bestOkNs: 500 }]; // now 1000, +100% → regression
    const improved: Row[] = [{ ...rows[0], bestOkNs: 2000 }]; // now 1000, -50% → improved
    expect(formatTable(regressed, { color: true, tolerance: 0.1 })).toContain('\x1b[31m'); // red
    expect(formatTable(improved, { color: true, tolerance: 0.1 })).toContain('\x1b[32m'); // green
  });

  it('never emits ANSI codes when color is off', () => {
    const out = formatTable([{ ...rows[0], bestOkNs: 500 }], { color: false });
    expect(out).not.toContain('\x1b[');
  });
});

describe('report.compareNs', () => {
  it('returns "first" when there is no previous reference', () => {
    expect(compareNs(10, undefined, 0.1)).toBe('first');
  });
  it('returns "improved" when faster beyond the band', () => {
    expect(compareNs(8, 10, 0.1, 0)).toBe('improved'); // -20% < -10%
  });
  it('returns "regression" when slower beyond tolerance and noise', () => {
    expect(compareNs(12, 10, 0.1, 1)).toBe('regression'); // +20% > max(10%, 1%)
  });
  it('returns "neutral" for a small change within the tolerance (both directions)', () => {
    expect(compareNs(10.5, 10, 0.1, 0)).toBe('neutral'); // +5%
    expect(compareNs(9.5, 10, 0.1, 0)).toBe('neutral'); // -5%
  });
  it('returns "neutral" when the change is within the measurement noise (rme)', () => {
    // ±20% supera la tolerancia del 10%, pero el ±% de la medición es 50% → es ruido.
    expect(compareNs(12, 10, 0.1, 50)).toBe('neutral');
    expect(compareNs(8, 10, 0.1, 50)).toBe('neutral');
  });
});

describe('report.colorEnabled', () => {
  it('is disabled under NO_COLOR', () => {
    const prev = process.env['NO_COLOR'];
    process.env['NO_COLOR'] = '1';
    expect(colorEnabled()).toBe(false);
    if (prev === undefined) delete process.env['NO_COLOR'];
    else process.env['NO_COLOR'] = prev;
  });
});

describe('report.writeMarkdown', () => {
  const tmpPath = join(tmpdir(), 'archi-validation-report.spec.md');
  afterEach(() => {
    try {
      unlinkSync(tmpPath);
    } catch {
      /* noop */
    }
  });

  it('renders 🔴 for a regression and 🟢 for a record', () => {
    const path = writeMarkdown(
      [
        { ...rows[0], bestOkNs: 500 }, // regression on ✓ (now 1000)
        { ...rows[1], bestOkNs: 2000 }, // improvement on ✓ (now 250)
      ],
      { node: 'v22' },
      { tolerance: 0.1, path: tmpPath },
    );
    const md = readFileSync(path, 'utf8');
    expect(md).toContain('🔴');
    expect(md).toContain('🟢');
    expect(md).toContain('éxito (ns)');
  });
});

describe('baseline round-trip', () => {
  // Ruta temporal para NO tocar el best-scores.json real del benchmark.
  const tmpPath = join(tmpdir(), 'archi-validation-baseline.spec.json');
  afterEach(() => {
    try {
      unlinkSync(tmpPath);
    } catch {
      /* noop */
    }
  });

  it('returns {} when no baseline file exists', () => {
    const prev = process.env['BENCH_RESET'];
    delete process.env['BENCH_RESET'];
    expect(readBaseline(tmpPath)).toEqual({});
    if (prev !== undefined) process.env['BENCH_RESET'] = prev;
  });

  it('writes and reads back the same data', () => {
    const b: Baseline = { isEmail: { okNs: 1000, errNs: 900 } };
    writeBaseline(b, tmpPath);
    const prev = process.env['BENCH_RESET'];
    delete process.env['BENCH_RESET'];
    expect(readBaseline(tmpPath)).toEqual(b);
    if (prev !== undefined) process.env['BENCH_RESET'] = prev;
  });

  it('ignores the stored baseline when BENCH_RESET is set', () => {
    writeBaseline({ isEmail: { okNs: 1000, errNs: 900 } }, tmpPath);
    const prev = process.env['BENCH_RESET'];
    process.env['BENCH_RESET'] = '1';
    expect(readBaseline(tmpPath)).toEqual({});
    if (prev === undefined) delete process.env['BENCH_RESET'];
    else process.env['BENCH_RESET'] = prev;
  });
});
