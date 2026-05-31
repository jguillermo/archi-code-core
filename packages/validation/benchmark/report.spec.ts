import { formatTable, type Row } from './report';

const rows: Row[] = [
  { name: 'isEmail', ops: 1_000_000, msPerCall: 0.001000, rme: 1.2 },
  { name: 'isUUID',  ops: 4_000_000, msPerCall: 0.000250, rme: 0.8 },
];

describe('report.formatTable', () => {
  it('includes a header row and one line per result', () => {
    const out = formatTable(rows);
    expect(out).toContain('isEmail');
    expect(out).toContain('isUUID');
    expect(out).toContain('ops/seg');
  });

  it('sorts rows slowest first (ascending ops/sec)', () => {
    const out = formatTable(rows);
    // isEmail (1M ops) is slower → must appear before isUUID (4M ops)
    expect(out.indexOf('isEmail')).toBeLessThan(out.indexOf('isUUID'));
  });

  it('shows ns/llamada column and legend for ±%', () => {
    const out = formatTable(rows);
    expect(out).toContain('ns/llamada');
    expect(out).toContain('margen de error');
  });
});
