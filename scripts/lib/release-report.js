'use strict';

const HEADER = ['PACKAGE', 'CURRENT', 'NEXT', 'COMMITS', 'REASON'];

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
    pkg.next ?? '(no changes)',
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
      ? 'reset of the whole set: new major for every package, without looking at commits'
      : `since ${pkg.baseCommit ? pkg.baseCommit.slice(0, 7) : 'the beginning of the history'}`,
    ...Object.entries(pkg.dependencies).map(
      ([dep, version]) => `dep  ${dep}: ${version ?? '(no published version)'}`,
    ),
    ...pkg.commits.map(
      (commit) => `${commit.hash} ${(commit.bump ?? '-').padEnd(5)} ${commit.subject}`,
    ),
    ...pkg.warnings.map((warning) => `⚠ ${warning}`),
  ];
}

function renderLastDeploy(deploy) {
  if (!deploy) return ['Last deploy: none recorded'];
  return [
    `Last deploy: ${formatDate(deploy.date)}  |  channel ${deploy.channel}  |  ` +
      `commit ${deploy.commit.slice(0, 7)}`,
    ...deploy.packages.map((pkg) => `  ${pkg.name}  ${pkg.previous ?? '—'} → ${pkg.version}`),
  ];
}

function renderPlan(plan) {
  const lines = [`channel: ${plan.branch}  |  npm dist-tags: ${plan.distTags.join(', ')}`, ''];
  lines.push(...table([HEADER, ...summaryRows(plan)]));
  for (const pkg of releasing(plan)) {
    lines.push('', `${pkg.name}  ${pkg.current ?? '—'} → ${pkg.next}`);
    lines.push(...packageDetail(pkg).map((line) => `  ${line}`));
  }
  lines.push('', `${releasing(plan).length} package(s) would get a new version.`);
  return lines;
}

function escapeCell(text) {
  return text.replace(/\|/g, '\\|');
}

function planMarkdown(plan) {
  const lines = [
    `### Release plan — channel \`${plan.branch}\`, dist-tags \`${plan.distTags.join(', ')}\``,
    '',
    `| ${HEADER.join(' | ')} |`,
    `|${HEADER.map(() => ' --- ').join('|')}|`,
    ...summaryRows(plan).map((row) => `| ${row.map(escapeCell).join(' | ')} |`),
  ];
  if (plan.errors.length) {
    lines.push('', '**Errors:**', ...plan.errors.map((error) => `- ${error}`));
  }
  return `${lines.join('\n')}\n`;
}

module.exports = { formatDate, planMarkdown, releasing, renderLastDeploy, renderPlan };
