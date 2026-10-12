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
  const files = '{src,test}/**/*.{js,jsx,ts,tsx,json,css,scss,md}';
  return {
    name: `${SCOPE}/${folder}`,
    version: '0.0.1',
    keywords: ['DDD', 'node'],
    author: AUTHOR,
    license: 'MIT',
    repository: { type: 'git', url: 'https://github.com/jguillermo/archi-code-core' },
    engines: { node: '>=22' },
    publishConfig: { access: 'public' },
    main: './dist/cjs/index.js',
    module: './dist/esm/index.js',
    types: './dist/cjs/index.d.ts',
    exports: { '.': { import: esm, require: cjs }, './package.json': './package.json' },
    files: ['dist/'],
    scripts: {
      prebuild: 'rm -rf dist || true',
      'build:cjs': 'tsc -p tsconfig.cjs.json',
      'build:esm': 'tsc -p tsconfig.esm.json && node ../../scripts/fix-esm.js',
      build: 'npm run build:cjs && npm run build:esm',
      test: 'jest',
      'test:coverage': 'jest --coverage',
      'check:types': 'tsc -p tsconfig.json --noEmit --incremental false',
      'check:dist': 'node ../../scripts/check-dist.js && node ../../scripts/check-types.js',
      'check:editorconfig':
        "editorconfig-checker --exclude node_modules --exclude dist --exclude '.git'",
      'check:all':
        'npm run check:editorconfig && npm run check:prettier && npm run check:lint && npm run check:types && npm run test:coverage && npm run build && npm run check:dist',
      'check:lint': 'eslint src test --ext .ts',
      'fix:lint': 'eslint src test --ext .ts --fix',
      'check:prettier': `prettier --check "${files}" "*.{json,md}"`,
      'fix:prettier': `prettier --write "${files}" "*.{json,md}"`,
    },
    jest: {
      moduleFileExtensions: ['js', 'json', 'ts'],
      rootDir: '.',
      roots: ['<rootDir>/src', '<rootDir>/test'],
      testRegex: '.*\\.spec\\.ts$',
      transform: { '^.+\\.ts$': 'ts-jest' },
      collectCoverageFrom: ['src/**/*.(t|j)s'],
      coverageDirectory: './coverage',
      testEnvironment: 'node',
      collectCoverage: false,
      injectGlobals: false,
      coverageThreshold: { global: { branches: 100, functions: 100, lines: 100, statements: 100 } },
    },
  };
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
    '.releaserc.json': json({
      branches: ['release', { name: 'main', prerelease: 'alpha' }],
      plugins: [
        '@semantic-release/commit-analyzer',
        '@semantic-release/release-notes-generator',
        '@semantic-release/npm',
        '@semantic-release/github',
      ],
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
    'README.md': `# ${name}\n\n${description}\n\n\`\`\`bash\nnpm install ${name}\n\`\`\`\n\n## License\n\nMIT\n`,
    'src/index.ts': `export const PACKAGE_NAME = '${name}';\n`,
    'test/index.spec.ts': [
      "import { describe, it, expect } from '@jest/globals';",
      "import * as api from '../src';",
      '',
      "describe('public API', () => {",
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
