'use strict';

const { tagPrefix } = require('./release-git');

function releasing(plan) {
  return plan.packages.filter((pkg) => pkg.next);
}

function tagName(pkg) {
  return `${tagPrefix(pkg.name)}${pkg.next}`;
}

function summaryRows(plan) {
  return plan.packages.map((pkg) => [
    pkg.name,
    pkg.current ?? '—',
    pkg.next ?? '(sin cambios)',
    String(pkg.commits.length),
    pkg.reasons.join(', ') || '—',
  ]);
}

const HEADER = ['PAQUETE', 'ACTUAL', 'NUEVA', 'COMMITS', 'MOTIVO'];

function table(rows) {
  const widths = rows[0].map((_, column) => Math.max(...rows.map((row) => row[column].length)));
  return rows.map((row) =>
    row
      .map((cell, column) => cell.padEnd(widths[column]))
      .join('  ')
      .trimEnd(),
  );
}

function packageDetail(pkg) {
  return [
    ...Object.entries(pkg.dependencies).map(
      ([dep, version]) => `dep  ${dep}: ${version ?? '(sin versión publicada)'}`,
    ),
    ...pkg.commits.map(
      (commit) => `${commit.hash} ${(commit.bump ?? '-').padEnd(5)} ${commit.subject}`,
    ),
    ...pkg.warnings.map((warning) => `⚠ ${warning}`),
  ];
}

function renderPlan(plan) {
  const lines = [`canal: ${plan.branch}  |  dist-tag npm: ${plan.distTag}`, ''];
  lines.push(...table([HEADER, ...summaryRows(plan)]));
  for (const pkg of releasing(plan)) {
    lines.push('', `${pkg.name}  ${pkg.current ?? '—'} → ${pkg.next}  (tag ${tagName(pkg)})`);
    lines.push(...packageDetail(pkg).map((line) => `  ${line}`));
  }
  lines.push('', `${releasing(plan).length} paquete(s) subirían de versión.`);
  return lines;
}

function escapeCell(text) {
  return text.replace(/\|/g, '\\|');
}

function planMarkdown(plan) {
  const lines = [
    `### Plan de release — canal \`${plan.branch}\`, dist-tag \`${plan.distTag}\``,
    '',
    `| ${HEADER.join(' | ')} |`,
    `|${HEADER.map(() => ' --- ').join('|')}|`,
    ...summaryRows(plan).map((row) => `| ${row.map(escapeCell).join(' | ')} |`),
  ];
  if (plan.errors.length) {
    lines.push('', '**Errores:**', ...plan.errors.map((error) => `- ${error}`));
  }
  return `${lines.join('\n')}\n`;
}

function releaseNotes(pkg) {
  const lines = [];
  if (pkg.reasons.length) lines.push(`Motivo: ${pkg.reasons.join(', ')}`, '');
  const dependencies = Object.entries(pkg.dependencies);
  if (dependencies.length) {
    lines.push('Dependencias internas:', ...dependencies.map(([dep, v]) => `- ${dep}@${v}`), '');
  }
  if (pkg.commits.length) {
    lines.push('Commits:', ...pkg.commits.map((commit) => `- ${commit.hash} ${commit.subject}`));
  }
  return lines.join('\n');
}

module.exports = { planMarkdown, releaseNotes, releasing, renderPlan, tagName };
