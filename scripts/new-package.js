#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const REPO = path.resolve(__dirname, '..');
const SCOPE = '@archi-code';
const AUTHOR = 'Jose Guillermo';
const NAME_RE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

function fail(message) {
  console.error(`new-package: ${message}`);
  process.exit(1);
}

function json(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function packageJson(folder) {
  const esm = { types: './dist/esm/index.d.ts', default: './dist/esm/index.js' };
  const cjs = { types: './dist/cjs/index.d.ts', default: './dist/cjs/index.js' };
  return {
    name: `${SCOPE}/${folder}`,
    version: '0.0.0-development',
    keywords: ['DDD', 'node'],
    author: AUTHOR,
    license: 'MIT',
    repository: { type: 'git', url: 'https://github.com/jguillermo/archi-code-core' },
    engines: { node: '>=24' },
    publishConfig: { access: 'public' },
    main: './dist/cjs/index.js',
    module: './dist/esm/index.js',
    types: './dist/cjs/index.d.ts',
    exports: { '.': { import: esm, require: cjs }, './package.json': './package.json' },
    files: ['dist/', 'SKILL.md'],
    scripts: {
      prebuild: 'rm -rf dist || true',
      'build:cjs': 'tsc -p tsconfig.cjs.json',
      'build:esm': 'tsc -p tsconfig.esm.json && node ../../scripts/fix-esm.js',
      build: 'npm run build:cjs && npm run build:esm',
      test: 'vitest run',
      'test:coverage': 'vitest run --coverage',
      'check:types': 'tsc -p tsconfig.json --noEmit --incremental false',
      'check:dist': 'node ../../scripts/check-dist.js && node ../../scripts/check-types.js',
      'check:all':
        'npm run check:types && npm run test:coverage && npm run build && npm run check:dist',
    },
  };
}

function skillName(name) {
  return name.replace(`${SCOPE}/`, 'archi-code-');
}

function readme(name, description) {
  const skillDir = `.claude/skills/${skillName(name)}`;
  return [
    `# ${name}`,
    '',
    description,
    '',
    '## Installation',
    '',
    '```bash',
    `npm install ${name}`,
    '```',
    '',
    '## Import',
    '',
    '```ts',
    `import { PACKAGE_NAME } from '${name}';`,
    '```',
    '',
    '## AI assistant skill',
    '',
    'The package ships `SKILL.md`, a Claude Code skill with the rules, recommended patterns and common mistakes. For the full API it points to this README inside `node_modules`, so it stays valid when the package is updated. To install it in your project:',
    '',
    '```bash',
    `mkdir -p ${skillDir} && cp node_modules/${name}/SKILL.md ${skillDir}/SKILL.md`,
    '```',
    '',
    '### How to use',
    '',
    'Invoke it with a request:',
    '',
    '```text',
    `/${skillName(name)} <task that uses ${name}>`,
    '```',
    '',
    'Or ask for the task without naming it and Claude loads it on its own because it matches its description:',
    '',
    '```text',
    "<task that matches the skill's description>",
    '```',
    '',
    'It also reviews code that already uses the package:',
    '',
    '```text',
    `/${skillName(name)} review src/ and fix whatever breaks the package rules`,
    '```',
    '',
    'With the skill loaded, Claude follows its rules, avoids the mistakes in its "What not to do" list and, before using anything the skill does not show, reads this README in `node_modules`.',
    '',
    '### Keeping it up to date',
    '',
    `- The copy does not update itself: after updating \`${name}\`, run the command above again.`,
    `- Commit \`${skillDir}/\` so the whole team uses it.`,
    '',
    '## License',
    '',
    'MIT',
    '',
  ].join('\n');
}

function skill(name, description) {
  return [
    '---',
    `name: ${skillName(name)}`,
    `description: ${description} Use it whenever the code imports ${name} or the task needs what it offers.`,
    '---',
    '',
    `# ${skillName(name)}`,
    '',
    description,
    '',
    '## Full API',
    '',
    `Before using anything this skill does not show, read \`node_modules/${name}/README.md\`: it matches the installed version. Do not guess signatures or options. If the package is not installed: \`npm install ${name}\`.`,
    '',
    `If that path does not exist (workspaces, pnpm…), locate the package with \`node -p "require.resolve('${name}/package.json')"\` and read the \`README.md\` in that folder.`,
    '',
    '## Related skills',
    '',
    '## Import',
    '',
    '```ts',
    `import { PACKAGE_NAME } from '${name}';`,
    '```',
    '',
    '## Rules',
    '',
    '## Recommended patterns',
    '',
    '## What not to do',
    '',
  ].join('\n');
}

function templates(folder, description) {
  const name = `${SCOPE}/${folder}`;
  const exclude = ['../../node_modules', 'node_modules', 'dist', 'coverage'];
  return {
    'package.json': json(packageJson(folder)),
    'tsconfig.json': json({
      extends: '../../tsconfig.base.json',
      include: ['src/**/*', 'test/**/*'],
      exclude,
    }),
    'tsconfig.build.json': json({
      extends: './tsconfig.json',
      compilerOptions: { rootDir: './src', sourceMap: false, incremental: false },
      include: ['src/**/*'],
      exclude: [...exclude, 'test'],
    }),
    'tsconfig.cjs.json': json({
      extends: './tsconfig.build.json',
      compilerOptions: { module: 'CommonJS', target: 'ES2020', outDir: './dist/cjs' },
    }),
    'tsconfig.esm.json': json({
      extends: './tsconfig.build.json',
      compilerOptions: { module: 'ES2020', target: 'ES2020', outDir: './dist/esm' },
    }),
    '.gitignore': [
      '/dist',
      '/node_modules',
      '/coverage',
      '*.tsbuildinfo',
      '*.log',
      '.DS_Store',
      '',
    ].join('\n'),
    LICENSE: fs.readFileSync(path.join(REPO, 'packages', 'domain', 'LICENSE'), 'utf8'),
    'README.md': readme(name, description),
    'SKILL.md': skill(name, description),
    'vitest.config.mts': [
      "import { defineConfig } from 'vitest/config';",
      '',
      'export default defineConfig({',
      '  test: {',
      "    environment: 'node',",
      "    include: ['test/**/*.spec.ts'],",
      '    globals: false,',
      '    coverage: {',
      "      provider: 'v8',",
      "      include: ['src/**/*.ts'],",
      "      reportsDirectory: './coverage',",
      '      thresholds: { 100: true },',
      '    },',
      '  },',
      '});',
      '',
    ].join('\n'),
    'src/index.ts': `export const PACKAGE_NAME = '${name}';\n`,
    'test/index.spec.ts': [
      "import { describe, expect, it } from 'vitest';",
      "import * as api from '../src/index';",
      '',
      "const PUBLIC_API = ['PACKAGE_NAME'];",
      '',
      `describe('${name}', () => {`,
      "  it('exports exactly the public API', () => {",
      '    expect(Object.keys(api).sort()).toEqual(PUBLIC_API);',
      '  });',
      '',
      "  it('exposes the package name', () => {",
      `    expect(api.PACKAGE_NAME).toBe('${name}');`,
      '  });',
      '});',
      '',
    ].join('\n'),
    'test/dist/dist.check.js': [
      "'use strict';",
      '',
      'function smoke(m) {',
      `  return [['PACKAGE_NAME', () => m.PACKAGE_NAME === '${name}']];`,
      '}',
      '',
      'module.exports = { smoke };',
      '',
    ].join('\n'),
  };
}

function addRootCheckScript(folder) {
  const file = path.join(REPO, 'package.json');
  const root = JSON.parse(fs.readFileSync(file, 'utf8'));
  const scripts = {};
  for (const [key, value] of Object.entries(root.scripts)) {
    if (key === 'check:packages')
      scripts[`check:${folder}`] = `npm run check:all -w ${SCOPE}/${folder}`;
    scripts[key] = value;
  }
  root.scripts = scripts;
  fs.writeFileSync(file, json(root));
}

function main() {
  const [folder, description] = process.argv.slice(2);
  if (!folder || !description) fail('usage: node scripts/new-package.js <folder> "<description>"');
  if (!NAME_RE.test(folder))
    fail(`"${folder}" must be lowercase kebab-case (it is also the npm name)`);
  const dir = path.join(REPO, 'packages', folder);
  if (fs.existsSync(dir)) fail(`packages/${folder} already exists`);

  for (const [relative, content] of Object.entries(templates(folder, description))) {
    const file = path.join(dir, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
  addRootCheckScript(folder);
  execFileSync(
    process.execPath,
    [
      require.resolve('prettier/bin/prettier.cjs'),
      '--write',
      '--log-level',
      'warn',
      dir,
      path.join(REPO, 'package.json'),
    ],
    { cwd: REPO, stdio: 'inherit' },
  );

  console.log(`new-package: created packages/${folder} (${SCOPE}/${folder})`);
  console.log('next: npm install  →  npm run check:' + folder);
}

main();
