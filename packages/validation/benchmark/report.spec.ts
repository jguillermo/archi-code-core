import { formatTable, type Row } from './report';

const rows: Row[] = [
  { name: 'isEmail', mineOps: 1_000_000, mineNs: 1000, mineRme: 1.2, cvOps: 500_000, cvNs: 2000, ratio: 2.0 },
  { name: 'isUUID', mineOps: 4_000_000, mineNs: 250, mineRme: 0.8, cvOps: null, cvNs: null, ratio: null },
];

describe('report.formatTable', () => {
  it('includes a header row and one line per result', () => {
    const out = formatTable(rows);
    expect(out).toContain('isEmail');
    expect(out).toContain('isUUID');
    expect(out).toContain('ops/sec');
  });

  it('sorts rows by mine ops/sec descending', () => {
    const out = formatTable(rows);
    expect(out.indexOf('isUUID')).toBeLessThan(out.indexOf('isEmail'));
  });

  it('renders "—" when there is no class-validator comparison', () => {
    const out = formatTable([rows[1]]);
    expect(out).toContain('—');
  });
});
