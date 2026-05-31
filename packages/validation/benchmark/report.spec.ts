import { formatTable, type Row } from './report';

const rows: Row[] = [
  { name: 'isEmail', okOps: 1_000_000, okNs: 0.001, okRme: 1.2, errOps: 1_200_000, errNs: 0.0009, errRme: 0.8 },
  { name: 'isUUID',  okOps: 4_000_000, okNs: 0.00025, okRme: 0.5, errOps: 5_000_000, errNs: 0.0002, errRme: 0.4 },
];

describe('report.formatTable', () => {
  it('includes a header row and one line per result', () => {
    const out = formatTable(rows);
    expect(out).toContain('isEmail');
    expect(out).toContain('isUUID');
    expect(out).toContain('ops/seg');
  });

  it('sorts rows slowest first (ascending ok ops/seg)', () => {
    const out = formatTable(rows);
    expect(out.indexOf('isEmail')).toBeLessThan(out.indexOf('isUUID'));
  });

  it('shows success and error columns', () => {
    const out = formatTable(rows);
    expect(out).toContain('✓ ops/seg');
    expect(out).toContain('✗ ops/seg');
  });

  it('shows legend explaining the symbols', () => {
    const out = formatTable(rows);
    expect(out).toContain('input válido');
    expect(out).toContain('input inválido');
  });
});
