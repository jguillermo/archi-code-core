import { createRequire } from 'node:module';
import { describe, expect, test } from 'vitest';

const require = createRequire(import.meta.url);
const { formatDate, planMarkdown, renderLastDeploy, renderPlan } = require('../lib/release-report');

const domain = {
  name: '@archi-code/domain',
  current: '1.0.0-alpha.3',
  next: '1.0.0-alpha.4',
  baseCommit: '4d9d7891d7a0aa42bee70222ebc0867dc124925e',
  reasons: ['commits (minor)', 'cascade: @archi-code/validation → 1.0.0-alpha.1'],
  dependencies: { '@archi-code/validation': '1.0.0-alpha.1' },
  commits: [{ hash: 'abc1234', subject: 'feat: x | y', bump: 'minor', conventional: true }],
  warnings: [],
};

const criteria = {
  name: '@archi-code/criteria',
  current: '1.0.0-alpha.1',
  next: null,
  baseCommit: null,
  reasons: [],
  dependencies: {},
  commits: [],
  warnings: [],
};

const plan = {
  branch: 'main',
  distTags: ['latest', 'main'],
  packages: [criteria, domain],
  errors: [],
};

describe('release report', () => {
  test('dates are shown as DD/MM/YYYY HH:MM in UTC', () => {
    expect(formatDate('2026-03-08T08:05:45.908Z')).toBe('08/03/2026 08:05 UTC');
  });

  test('renders the table and the detail of each released package', () => {
    const lines = renderPlan(plan);
    expect(
      lines.some((line) => /^@archi-code\/criteria\s+1\.0\.0-alpha\.1\s+\(no changes\)/.test(line)),
    ).toBeTruthy();
    expect(lines.includes('@archi-code/domain  1.0.0-alpha.3 → 1.0.0-alpha.4')).toBeTruthy();
    expect(lines.includes('  since 4d9d789')).toBeTruthy();
    expect(lines.includes('  dep  @archi-code/validation: 1.0.0-alpha.1')).toBeTruthy();
    expect(lines.includes('  abc1234 minor feat: x | y')).toBeTruthy();
    expect(lines.at(-1)).toBe('1 package(s) would get a new version.');
  });

  test('a package never published starts from the beginning of the history', () => {
    const lines = renderPlan({
      ...plan,
      packages: [{ ...domain, current: null, baseCommit: null }],
    });
    expect(lines.includes('  since the beginning of the history')).toBeTruthy();
  });

  test('a reset says the whole set starts a new major', () => {
    const lines = renderPlan({ ...plan, packages: [{ ...domain, reset: true, commits: [] }] });
    expect(
      lines.includes(
        '  reset of the whole set: new major for every package, without looking at commits',
      ),
    ).toBeTruthy();
  });

  test('renders the last deploy with every package it published', () => {
    expect(
      renderLastDeploy({
        date: '2026-10-12T19:01:19.443Z',
        commit: '34013dd6bb9b438f4d72dc2941970df226224fb9',
        channel: 'main',
        packages: [
          { name: '@archi-code/validation', previous: null, version: '1.0.0-alpha.1' },
          { name: '@archi-code/domain', previous: '1.0.0-alpha.3', version: '1.0.0-alpha.4' },
        ],
      }),
    ).toStrictEqual([
      'Last deploy: 12/10/2026 19:01 UTC  |  channel main  |  commit 34013dd',
      '  @archi-code/validation  — → 1.0.0-alpha.1',
      '  @archi-code/domain  1.0.0-alpha.3 → 1.0.0-alpha.4',
    ]);
    expect(renderLastDeploy(null)).toStrictEqual(['Last deploy: none recorded']);
  });

  test('markdown lists the summary row of each package and the errors', () => {
    const markdown = planMarkdown({ ...plan, errors: ['something fails'] });
    expect(markdown).toMatch(
      /\| @archi-code\/domain \| 1\.0\.0-alpha\.3 \| 1\.0\.0-alpha\.4 \| 1 \|/,
    );
    expect(markdown).toMatch(/- something fails/);
  });
});
