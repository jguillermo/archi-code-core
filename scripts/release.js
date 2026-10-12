#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const { CHANNELS } = require('./lib/release-plan');
const { currentBranch } = require('./lib/release-git');
const { loadPlan } = require('./lib/load-plan');
const { manifestErrors, publishManifest } = require('./lib/publish-manifest');
const {
  planMarkdown,
  releaseNotes,
  releasing,
  renderPlan,
  tagName,
} = require('./lib/release-report');
const { findVersionErrors } = require('./check-versions');

const ROOT = path.join(__dirname, '..');
const PACK_ONLY = process.argv.includes('--pack');
const NPM_VIEW_RETRIES = 10;
const NPM_VIEW_DELAY_MS = 3000;

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

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function publishedOnNpm(name, version) {
  const result = quiet('npm', ['view', `${name}@${version}`, 'version']);
  if (result.status === 0) return result.stdout.trim() === version;
  if (/E404/.test(result.stderr)) return false;
  throw new Error(`npm view ${name}@${version} falló:\n${result.stderr.trim()}`);
}

function localTagExists(tag) {
  return quiet('git', ['rev-parse', '-q', '--verify', `refs/tags/${tag}`]).status === 0;
}

function remoteTagExists(tag) {
  return run('git', ['ls-remote', '--tags', 'origin', `refs/tags/${tag}`]) !== '';
}

function targetBranch() {
  const branch = currentBranch(ROOT);
  if (!PACK_ONLY) return branch;
  const index = process.argv.indexOf('--branch');
  if (index !== -1) return process.argv[index + 1];
  return CHANNELS[branch] ? branch : 'main';
}

function checkRepository(branch) {
  const problems = [];
  if (!CHANNELS[branch]) {
    problems.push(`la rama "${branch}" no publica: solo ${Object.keys(CHANNELS).join(' y ')}`);
    return problems;
  }
  if (PACK_ONLY) return problems;
  if (run('git', ['status', '--porcelain'])) problems.push('el árbol de trabajo no está limpio');
  run('git', ['fetch', 'origin', branch, '--tags']);
  const head = run('git', ['rev-parse', 'HEAD']);
  const remote = run('git', ['rev-parse', `origin/${branch}`]);
  if (head !== remote) problems.push(`HEAD (${head}) no es origin/${branch} (${remote})`);
  return problems;
}

function checkCredentials() {
  const problems = [];
  if (quiet('npm', ['whoami']).status !== 0) problems.push('npm no está autenticado (npm whoami)');
  if (quiet('gh', ['auth', 'status']).status !== 0) {
    problems.push('gh no está autenticado (gh auth status)');
  }
  return problems;
}

function checkTargets(plan) {
  const problems = [];
  const releasedNames = new Set(releasing(plan).map((pkg) => pkg.name));
  for (const pkg of releasing(plan)) {
    const tag = tagName(pkg);
    if (localTagExists(tag)) problems.push(`el tag ${tag} ya existe en local`);
    if (PACK_ONLY) continue;
    if (remoteTagExists(tag)) problems.push(`el tag ${tag} ya existe en origin`);
    if (publishedOnNpm(pkg.name, pkg.next)) {
      problems.push(
        `${pkg.name}@${pkg.next} ya está en npm pero falta su tag: créalo con ` +
          `git tag -a ${tag} -m ${tag} <commit publicado> && git push origin ${tag}`,
      );
    }
    for (const [dep, version] of Object.entries(pkg.dependencies)) {
      if (!releasedNames.has(dep) && !publishedOnNpm(dep, version)) {
        problems.push(`${pkg.name} depende de ${dep}@${version}, que no está en npm`);
      }
    }
  }
  return problems;
}

function packVerified(pkg, destination) {
  const manifestPath = path.join(ROOT, pkg.dir, 'package.json');
  const original = fs.readFileSync(manifestPath, 'utf8');
  try {
    const manifest = publishManifest(JSON.parse(original), pkg);
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
    const errors = manifestErrors(published, pkg);
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

function waitForNpm(pkg) {
  for (let attempt = 1; attempt <= NPM_VIEW_RETRIES; attempt += 1) {
    if (publishedOnNpm(pkg.name, pkg.next)) return;
    sleep(NPM_VIEW_DELAY_MS);
  }
  throw new Error(`${pkg.name}@${pkg.next} no aparece en npm tras publicarlo`);
}

function publish(plan, pkg, tarball) {
  run('npm', ['publish', tarball, '--tag', plan.distTag, '--access', 'public'], {
    stdio: ['ignore', 'inherit', 'inherit'],
  });
  waitForNpm(pkg);
  const tag = tagName(pkg);
  run('git', ['tag', '-a', tag, '-m', tag]);
  run('git', ['push', 'origin', `refs/tags/${tag}`]);
  run('gh', [
    'release',
    'create',
    tag,
    '--verify-tag',
    '--title',
    tag,
    '--notes',
    releaseNotes(pkg),
    ...(plan.prerelease ? ['--prerelease'] : []),
  ]);
}

function abort(problems) {
  console.error('\nrelease: no se publica nada:');
  problems.forEach((problem) => console.error(`  ✘ ${problem}`));
  process.exit(1);
}

function main() {
  const branch = targetBranch();
  const repositoryProblems = checkRepository(branch);
  if (repositoryProblems.length) abort(repositoryProblems);

  const { packages, plan } = loadPlan(ROOT, branch);
  console.log(`\nRelease${PACK_ONLY ? ' (solo pack, sin publicar)' : ''} — rama ${branch}`);
  renderPlan(plan).forEach((line) => console.log(line));
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, planMarkdown(plan));
  }

  const problems = [...findVersionErrors(packages), ...plan.errors];
  if (!PACK_ONLY) problems.push(...checkCredentials());
  if (!problems.length) problems.push(...checkTargets(plan));
  if (problems.length) abort(problems);

  if (!releasing(plan).length) {
    console.log('\nNada que publicar.');
    return;
  }

  const destination = fs.mkdtempSync(path.join(os.tmpdir(), 'archi-code-release-'));
  const done = [];
  try {
    for (const pkg of releasing(plan)) {
      console.log(`\n── ${pkg.name}@${pkg.next}`);
      const tarball = packVerified(pkg, destination);
      if (!PACK_ONLY) publish(plan, pkg, tarball);
      done.push(`${pkg.name}@${pkg.next}`);
      console.log(
        `✔ ${pkg.name}@${pkg.next} ${PACK_ONLY ? 'empaquetado y verificado' : 'publicado'}`,
      );
    }
  } catch (error) {
    console.error(`\nrelease: se detiene en error: ${error.message}`);
    console.error(
      `Ya ${PACK_ONLY ? 'verificados' : 'publicados'}: ${done.join(', ') || 'ninguno'}`,
    );
    process.exitCode = 1;
    return;
  } finally {
    fs.rmSync(destination, { recursive: true, force: true });
  }

  const summary = `\n${done.length} paquete(s) ${PACK_ONLY ? 'verificados' : 'publicados'}: ${done.join(', ')}`;
  console.log(summary);
  if (process.env.GITHUB_STEP_SUMMARY)
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`);
}

main();
