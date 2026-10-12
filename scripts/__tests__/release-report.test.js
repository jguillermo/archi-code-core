'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { formatDate, planMarkdown, renderLastDeploy, renderPlan } = require('../lib/release-report');

const domain = {
  name: '@archi-code/domain',
  current: '1.0.0-alpha.3',
  next: '1.0.0-alpha.4',
  baseCommit: '4d9d7891d7a0aa42bee70222ebc0867dc124925e',
  reasons: ['commits (minor)', 'cascada: @archi-code/validation → 1.0.0-alpha.1'],
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

const plan = { branch: 'main', distTag: 'main', packages: [criteria, domain], errors: [] };

describe('release report', () => {
  test('dates are shown as DD/MM/AAAA HH:MM in UTC', () => {
    assert.equal(formatDate('2026-03-08T08:05:45.908Z'), '08/03/2026 08:05 UTC');
  });

  test('renders the table and the detail of each released package', () => {
    const lines = renderPlan(plan);
    assert.ok(
      lines.some((line) =>
        /^@archi-code\/criteria\s+1\.0\.0-alpha\.1\s+\(sin cambios\)/.test(line),
      ),
    );
    assert.ok(lines.includes('@archi-code/domain  1.0.0-alpha.3 → 1.0.0-alpha.4'));
    assert.ok(lines.includes('  desde 4d9d789'));
    assert.ok(lines.includes('  dep  @archi-code/validation: 1.0.0-alpha.1'));
    assert.ok(lines.includes('  abc1234 minor feat: x | y'));
    assert.equal(lines.at(-1), '1 paquete(s) subirían de versión.');
  });

  test('a package never published starts from the beginning of the history', () => {
    const lines = renderPlan({
      ...plan,
      packages: [{ ...domain, current: null, baseCommit: null }],
    });
    assert.ok(lines.includes('  desde el inicio de la historia'));
  });

  test('a reset says the whole set starts a new major', () => {
    const lines = renderPlan({ ...plan, packages: [{ ...domain, reset: true, commits: [] }] });
    assert.ok(
      lines.includes(
        '  reinicio del conjunto: nueva major para todos los paquetes, sin mirar commits',
      ),
    );
  });

  test('renders the last deploy with every package it published', () => {
    assert.deepEqual(
      renderLastDeploy({
        date: '2026-10-12T19:01:19.443Z',
        commit: '34013dd6bb9b438f4d72dc2941970df226224fb9',
        channel: 'main',
        packages: [
          { name: '@archi-code/validation', previous: null, version: '1.0.0-alpha.1' },
          { name: '@archi-code/domain', previous: '1.0.0-alpha.3', version: '1.0.0-alpha.4' },
        ],
      }),
      [
        'Último deploy: 12/10/2026 19:01 UTC  |  canal main  |  commit 34013dd',
        '  @archi-code/validation  — → 1.0.0-alpha.1',
        '  @archi-code/domain  1.0.0-alpha.3 → 1.0.0-alpha.4',
      ],
    );
    assert.deepEqual(renderLastDeploy(null), ['Último deploy: ninguno registrado']);
  });

  test('markdown lists the summary row of each package and the errors', () => {
    const markdown = planMarkdown({ ...plan, errors: ['algo falla'] });
    assert.match(
      markdown,
      /\| @archi-code\/domain \| 1\.0\.0-alpha\.3 \| 1\.0\.0-alpha\.4 \| 1 \|/,
    );
    assert.match(markdown, /- algo falla/);
  });
});
