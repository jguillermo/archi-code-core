#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const { CHANNELS } = require('./lib/versions');
const { currentBranch, headCommit, isAncestorOfHead } = require('./lib/release-git');
const { loadPlan } = require('./lib/load-plan');
const { manifestErrors, publishManifest } = require('./lib/publish-manifest');
const {
  STATE_FILE,
  lastDeploy,
  openDeploy,
  recordPublication,
  writeState,
} = require('./lib/release-state');
const { planMarkdown, releasing, renderLastDeploy, renderPlan } = require('./lib/release-report');
const { findVersionErrors } = require('./check-versions');

const ROOT = path.join(__dirname, '..');
const PACK_ONLY = process.argv.includes('--pack');
const REGISTRY = 'https://registry.npmjs.org';
const MAX_RECONCILE_ROUNDS = 10;
const RECORD_MESSAGE = 'chore(release): record published versions [skip ci]';

function run(command, args, options = {}) {
  console.log(`$ ${command} ${args.join(' ')}`);
  const output = execFileSync(command, args, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
    ...options,
  });
  return (output ?? '').trim();
}

function quiet(command, args) {
  return spawnSync(command, args, { cwd: ROOT, encoding: 'utf8' });
}

// Reads the version document (only metadata, nothing is downloaded). Right after a publish npm can
// take minutes to serve it, so the release never waits for it: `npm publish` succeeding is enough.
function npmVersionDocument(name, version) {
  const url = `${REGISTRY}/${name.replace('/', '%2F')}/${version}`;
  const result = quiet('curl', [
    '-s',
    '--max-time',
    '20',
    '-H',
    'Cache-Control: no-cache',
    '-w',
    '\n%{http_code}',
    url,
  ]);
  const split = result.stdout.lastIndexOf('\n');
  const status = result.stdout.slice(split + 1);
  if (status === '200') return JSON.parse(result.stdout.slice(0, split));
  if (status === '404') return null;
  throw new Error(`no se pudo consultar ${url} (HTTP ${status || result.stderr.trim()})`);
}

function targetBranch() {
  const branch = currentBranch(ROOT);
  if (!PACK_ONLY) return branch;
  const index = process.argv.indexOf('--branch');
  if (index !== -1) return process.argv[index + 1];
  return CHANNELS[branch] ? branch : 'main';
}

function checkRepository(branch) {
  if (!CHANNELS[branch]) {
    return [`la rama "${branch}" no publica: solo ${Object.keys(CHANNELS).join(' y ')}`];
  }
  if (PACK_ONLY) return [];
  const problems = [];
  if (run('git', ['status', '--porcelain'])) problems.push('el árbol de trabajo no está limpio');
  run('git', ['fetch', 'origin', branch]);
  const head = headCommit(ROOT);
  const remote = run('git', ['rev-parse', `origin/${branch}`]);
  if (head !== remote) problems.push(`HEAD (${head}) no es origin/${branch} (${remote})`);
  return problems;
}

function checkPinnedDependencies(plan) {
  const releasedNames = new Set(releasing(plan).map((pkg) => pkg.name));
  const problems = [];
  for (const pkg of releasing(plan)) {
    for (const [dep, version] of Object.entries(pkg.dependencies)) {
      if (!releasedNames.has(dep) && !npmVersionDocument(dep, version)) {
        problems.push(`${pkg.name} depende de ${dep}@${version}, que no está en npm`);
      }
    }
  }
  return problems;
}

function deployEntry(pkg, extra = {}) {
  return {
    name: pkg.name,
    previous: pkg.current,
    version: pkg.next,
    bump: pkg.bump,
    reasons: pkg.reasons,
    dependencies: pkg.dependencies,
    ...extra,
  };
}

// Every publication of this run goes into one deploy entry, opened with the first of them.
function recorder(branch, head) {
  let opened = false;
  return (state, entry, reset) => {
    const base = opened
      ? state
      : openDeploy(state, { date: new Date().toISOString(), commit: head, channel: branch, reset });
    opened = true;
    return recordPublication(base, { channel: branch, entry });
  };
}

// A planned version already on npm means a previous run published it and could not record it
// (for example the push of releases.json failed). It is recorded from the commit stored in the
// published package.json, and the plan is computed again from there.
function reconcileWithNpm(branch, loaded, record) {
  let { state, plan } = loaded;
  const reconciled = [];
  for (let round = 0; round < MAX_RECONCILE_ROUNDS; round += 1) {
    const found = releasing(plan)
      .map((pkg) => ({ pkg, document: npmVersionDocument(pkg.name, pkg.next) }))
      .filter(({ document }) => document);
    if (!found.length) return { state, plan, reconciled };
    for (const { pkg, document } of found) {
      const commit = document.releaseCommit;
      if (!/^[0-9a-f]{40}$/.test(commit ?? '') || !isAncestorOfHead(ROOT, commit)) {
        throw new Error(
          `${pkg.name}@${pkg.next} ya está en npm pero no la publicó esta herramienta desde ` +
            `la historia de ${branch} (releaseCommit "${commit}"); hay que revisarlo a mano`,
        );
      }
      console.log(`↺ ${pkg.name}@${pkg.next} ya estaba en npm (desde ${commit.slice(0, 7)})`);
      const entry = deployEntry(pkg, {
        dependencies: Object.fromEntries(
          Object.entries(document.dependencies ?? {}).filter(([dep]) => dep in pkg.dependencies),
        ),
        reconciled: true,
        commit,
      });
      state = record(state, entry, plan.reset);
      reconciled.push(entry);
    }
    const reloaded = loadPlan(ROOT, branch, state);
    if (reloaded.errors.length) throw new Error(reloaded.errors.join('\n  '));
    plan = reloaded.plan;
  }
  throw new Error(`la reconciliación con npm no terminó en ${MAX_RECONCILE_ROUNDS} rondas`);
}

function packVerified(pkg, destination, commit) {
  const manifestPath = path.join(ROOT, pkg.dir, 'package.json');
  const original = fs.readFileSync(manifestPath, 'utf8');
  try {
    const manifest = publishManifest(JSON.parse(original), pkg, commit);
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    run('npm', ['run', 'build', '-w', pkg.name], { stdio: ['ignore', 'inherit', 'inherit'] });
    const [packed] = JSON.parse(
      run('npm', ['pack', '--json', '--pack-destination', destination], {
        cwd: path.join(ROOT, pkg.dir),
      }),
    );
    const tarball = path.join(destination, packed.filename);
    const published = JSON.parse(
      execFileSync('tar', ['-xzOf', tarball, 'package/package.json'], { encoding: 'utf8' }),
    );
    const errors = manifestErrors(published, pkg, commit);
    if (errors.length) {
      throw new Error(`el tarball de ${pkg.name} no es válido:\n  ${errors.join('\n  ')}`);
    }
    return tarball;
  } finally {
    fs.writeFileSync(manifestPath, original);
    if (fs.readFileSync(manifestPath, 'utf8') !== original) {
      throw new Error(`${pkg.dir}/package.json no quedó restaurado`);
    }
  }
}

// A version that npm already has but does not serve yet (a previous run published it moments ago)
// is not recorded here: the release stops and the next run records it from npm.
function publishTarball(plan, pkg, tarball) {
  console.log(`$ npm publish ${tarball} --tag ${plan.distTag} --access public`);
  const result = spawnSync(
    'npm',
    ['publish', tarball, '--tag', plan.distTag, '--access', 'public'],
    { cwd: ROOT, encoding: 'utf8' },
  );
  process.stdout.write(result.stdout ?? '');
  process.stderr.write(result.stderr ?? '');
  if (result.status === 0) return;
  if (/EPUBLISHCONFLICT|cannot publish over|previously published/i.test(result.stderr ?? '')) {
    throw new Error(
      `${pkg.name}@${pkg.next} ya existe en npm aunque todavía no lo muestra (lo publicó otra ` +
        'run hace poco); no se pisa: la próxima run lo registrará desde npm',
    );
  }
  throw new Error(`npm publish de ${pkg.name}@${pkg.next} falló (código ${result.status})`);
}

function pushRecord(branch) {
  run('git', ['add', STATE_FILE]);
  run('git', ['commit', '-m', RECORD_MESSAGE]);
  try {
    run('git', ['push', 'origin', `HEAD:refs/heads/${branch}`]);
  } catch {
    run('git', ['pull', '--rebase', 'origin', branch]);
    run('git', ['push', 'origin', `HEAD:refs/heads/${branch}`]);
  }
}

function abort(problems) {
  console.error('\nrelease: no se publica nada:');
  problems.forEach((problem) => console.error(`  ✘ ${problem}`));
  process.exit(1);
}

function summary(lines) {
  lines.forEach((line) => console.log(line));
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${lines.join('\n')}\n`);
  }
}

function main() {
  const branch = targetBranch();
  const repositoryProblems = checkRepository(branch);
  if (repositoryProblems.length) abort(repositoryProblems);

  const head = headCommit(ROOT);
  const loaded = loadPlan(ROOT, branch);
  console.log(`\nRelease${PACK_ONLY ? ' (solo pack, sin publicar)' : ''} — rama ${branch}`);
  renderLastDeploy(lastDeploy(loaded.state)).forEach((line) => console.log(line));
  if (loaded.errors.length) abort(loaded.errors);

  const problems = findVersionErrors(loaded.packages);
  if (!PACK_ONLY && quiet('npm', ['whoami']).status !== 0) {
    problems.push('npm no está autenticado (npm whoami)');
  }
  if (problems.length) abort(problems);

  let { state, plan } = loaded;
  let reconciled = [];
  const record = recorder(branch, head);
  if (!PACK_ONLY) {
    try {
      ({ state, plan, reconciled } = reconcileWithNpm(branch, loaded, record));
    } catch (error) {
      abort([error.message]);
    }
    const pinned = checkPinnedDependencies(plan);
    if (pinned.length) abort(pinned);
  }

  console.log('');
  renderPlan(plan).forEach((line) => console.log(line));
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, planMarkdown(plan));
  }

  const destination = fs.mkdtempSync(path.join(os.tmpdir(), 'archi-code-release-'));
  const published = [];
  try {
    for (const pkg of releasing(plan)) {
      console.log(`\n── ${pkg.name}@${pkg.next}`);
      const tarball = packVerified(pkg, destination, head);
      if (PACK_ONLY) {
        console.log(`✔ ${pkg.name}@${pkg.next} empaquetado y verificado`);
        continue;
      }
      publishTarball(plan, pkg, tarball);
      const entry = deployEntry(pkg);
      state = record(state, entry, plan.reset);
      writeState(ROOT, state);
      published.push(entry);
      console.log(`✔ ${pkg.name}@${pkg.next} publicado`);
    }
  } catch (error) {
    console.error(`\nrelease: se detiene en error: ${error.message}`);
    process.exitCode = 1;
  } finally {
    fs.rmSync(destination, { recursive: true, force: true });
  }

  if (PACK_ONLY) return;
  const recorded = [...reconciled, ...published];
  if (!recorded.length) {
    summary(['', 'Nada que publicar.']);
    return;
  }

  writeState(ROOT, state);
  try {
    pushRecord(branch);
  } catch (error) {
    console.error(
      `\nrelease: no se pudo guardar ${STATE_FILE} en ${branch}: ${error.message}\n` +
        'Las versiones ya están en npm; la próxima run las reconciliará desde su releaseCommit.',
    );
    process.exitCode = 1;
  }
  summary([
    '',
    `${published.length} publicado(s), ${reconciled.length} reconciliado(s) desde npm:`,
    ...recorded.map((pkg) => `- ${pkg.name} ${pkg.previous ?? '—'} → ${pkg.version}`),
  ]);
}

main();
