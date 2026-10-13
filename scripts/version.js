#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { CHANNELS } = require('./lib/versions');
const { currentBranch } = require('./lib/release-git');
const { loadPlan } = require('./lib/load-plan');
const { lastDeploy } = require('./lib/release-state');
const { planMarkdown, renderLastDeploy, renderPlan } = require('./lib/release-report');

const ROOT = path.join(__dirname, '..');
const PLAN_FILE = path.join(ROOT, 'release-plan.json');

function branchArgument() {
  const index = process.argv.indexOf('--branch');
  return index === -1 ? null : process.argv[index + 1];
}

const branch = currentBranch(ROOT);
const target = branchArgument() ?? (CHANNELS[branch] ? branch : 'main');
const { state, plan, errors } = loadPlan(ROOT, target);

console.log(`\nCurrent branch: ${branch}`);
if (target !== branch)
  console.log(`(simulation: on ${branch} it is computed as if it were ${target})`);
renderLastDeploy(lastDeploy(state)).forEach((line) => console.log(line));
console.log('');

if (plan) {
  renderPlan(plan).forEach((line) => console.log(line));
  fs.writeFileSync(PLAN_FILE, `${JSON.stringify(plan, null, 2)}\n`);
  console.log(`Plan in ${path.relative(ROOT, PLAN_FILE)}`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, planMarkdown(plan));
  }
}

if (errors.length) {
  console.error('\nErrors (the deploy would publish nothing):');
  errors.forEach((error) => console.error(`  ✘ ${error}`));
  process.exit(1);
}
