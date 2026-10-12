#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { CHANNELS } = require('./lib/release-plan');
const { currentBranch } = require('./lib/release-git');
const { loadPlan } = require('./lib/load-plan');
const { planMarkdown, renderPlan } = require('./lib/release-report');

const ROOT = path.join(__dirname, '..');
const PLAN_FILE = path.join(ROOT, 'release-plan.json');

function branchArgument() {
  const index = process.argv.indexOf('--branch');
  return index === -1 ? null : process.argv[index + 1];
}

const branch = currentBranch(ROOT);
const target = branchArgument() ?? (CHANNELS[branch] ? branch : 'main');
const { plan } = loadPlan(ROOT, target);

console.log(`\nRama actual: ${branch}`);
if (target !== branch) console.log(`(simulación: en ${branch} se calcula como si fuera ${target})`);
renderPlan(plan).forEach((line) => console.log(line));

fs.writeFileSync(PLAN_FILE, `${JSON.stringify(plan, null, 2)}\n`);
console.log(`Plan en ${path.relative(ROOT, PLAN_FILE)}`);
if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, planMarkdown(plan));
}

if (plan.errors.length) {
  console.error('\nErrores (el deploy no publicaría nada):');
  plan.errors.forEach((error) => console.error(`  ✘ ${error}`));
  process.exit(1);
}
