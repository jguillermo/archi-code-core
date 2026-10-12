'use strict';

const HEADER = ['PAQUETE', 'ACTUAL', 'NUEVA', 'COMMITS', 'MOTIVO'];

function releasing(plan) {
  return plan.packages.filter((pkg) => pkg.next);
}

function formatDate(iso) {
  const date = new Date(iso);
  const pad = (value) => String(value).padStart(2, '0');
  return (
    `${pad(date.getUTCDate())}/${pad(date.getUTCMonth() + 1)}/${date.getUTCFullYear()} ` +
    `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())} UTC`
  );
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
    pkg.reset
      ? 'reinicio del conjunto: nueva major para todos los paquetes, sin mirar commits'
      : `desde ${pkg.baseCommit ? pkg.baseCommit.slice(0, 7) : 'el inicio de la historia'}`,
    ...Object.entries(pkg.dependencies).map(
      ([dep, version]) => `dep  ${dep}: ${version ?? '(sin versión publicada)'}`,
    ),
    ...pkg.commits.map(
      (commit) => `${commit.hash} ${(commit.bump ?? '-').padEnd(5)} ${commit.subject}`,
    ),
    ...pkg.warnings.map((warning) => `⚠ ${warning}`),
  ];
}

function renderLastDeploy(deploy) {
  if (!deploy) return ['Último deploy: ninguno registrado'];
  return [
    `Último deploy: ${formatDate(deploy.date)}  |  canal ${deploy.channel}  |  ` +
      `commit ${deploy.commit.slice(0, 7)}`,
    ...deploy.packages.map((pkg) => `  ${pkg.name}  ${pkg.previous ?? '—'} → ${pkg.version}`),
  ];
}

function renderPlan(plan) {
  const lines = [`canal: ${plan.branch}  |  dist-tag npm: ${plan.distTag}`, ''];
  lines.push(...table([HEADER, ...summaryRows(plan)]));
  for (const pkg of releasing(plan)) {
    lines.push('', `${pkg.name}  ${pkg.current ?? '—'} → ${pkg.next}`);
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

module.exports = { formatDate, planMarkdown, releasing, renderLastDeploy, renderPlan };
