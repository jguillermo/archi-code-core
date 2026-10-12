'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { planMarkdown, releaseNotes, renderPlan, tagName } = require('../lib/release-report');

const domain = {
  name: '@archi-code/domain',
  current: '1.0.0-alpha.3',
  next: '1.0.0-alpha.4',
  reasons: ['commits (minor)', 'cascada: @archi-code/validation → 1.0.0-alpha.1'],
  dependencies: { '@archi-code/validation': '1.0.0-alpha.1' },
  commits: [{ hash: 'abc1234', subject: 'feat: x | y', bump: 'minor', conventional: true }],
  warnings: [],
};

const criteria = {
  name: '@archi-code/criteria',
  current: '1.0.0-alpha.1',
  next: null,
  reasons: [],
  dependencies: {},
  commits: [],
  warnings: [],
};

const plan = { branch: 'main', distTag: 'main', packages: [criteria, domain], errors: [] };

describe('release report', () => {
  test('tag name follows <name>-v<version>', () => {
    assert.equal(tagName(domain), '@archi-code/domain-v1.0.0-alpha.4');
  });

  test('renders the table and the detail of each released package', () => {
    const lines = renderPlan(plan);
    assert.ok(
      lines.some((line) =>
        /^@archi-code\/criteria\s+1\.0\.0-alpha\.1\s+\(sin cambios\)/.test(line),
      ),
    );
    assert.ok(
      lines.includes(
        '@archi-code/domain  1.0.0-alpha.3 → 1.0.0-alpha.4  (tag @archi-code/domain-v1.0.0-alpha.4)',
      ),
    );
    assert.ok(lines.includes('  dep  @archi-code/validation: 1.0.0-alpha.1'));
    assert.ok(lines.includes('  abc1234 minor feat: x | y'));
    assert.equal(lines.at(-1), '1 paquete(s) subirían de versión.');
  });

  test('markdown lists the summary row of each package and the errors', () => {
    const markdown = planMarkdown({ ...plan, errors: ['algo falla'] });
    assert.match(
      markdown,
      /\| @archi-code\/domain \| 1\.0\.0-alpha\.3 \| 1\.0\.0-alpha\.4 \| 1 \|/,
    );
    assert.match(markdown, /- algo falla/);
  });

  test('release notes carry the reason, the pinned deps and the commits', () => {
    assert.equal(
      releaseNotes(domain),
      [
        'Motivo: commits (minor), cascada: @archi-code/validation → 1.0.0-alpha.1',
        '',
        'Dependencias internas:',
        '- @archi-code/validation@1.0.0-alpha.1',
        '',
        'Commits:',
        '- abc1234 feat: x | y',
      ].join('\n'),
    );
  });
});
