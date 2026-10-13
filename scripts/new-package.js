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
      test: 'jest',
      'test:coverage': 'jest --coverage',
      'check:types': 'tsc -p tsconfig.json --noEmit --incremental false',
      'check:dist': 'node ../../scripts/check-dist.js && node ../../scripts/check-types.js',
      'check:editorconfig': 'node ../../scripts/editorconfig.js',
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
    '## Instalación',
    '',
    '```bash',
    `npm install ${name}`,
    '```',
    '',
    '## Uso',
    '',
    '```ts',
    `import { PACKAGE_NAME } from '${name}';`,
    '```',
    '',
    '## Skill para asistentes de IA',
    '',
    'El paquete incluye `SKILL.md`, una skill de Claude Code con las reglas, los patrones recomendados y los errores comunes. Para la API completa remite a este README dentro de `node_modules`, así que sigue valiendo al actualizar el paquete. Para instalarla en tu proyecto:',
    '',
    '```bash',
    `mkdir -p ${skillDir}`,
    `cp node_modules/${name}/SKILL.md ${skillDir}/SKILL.md`,
    '```',
    '',
    '### Cómo se usa',
    '',
    'Invócala con una petición:',
    '',
    '```text',
    `/${skillName(name)} <tarea que usa ${name}>`,
    '```',
    '',
    'O pide la tarea sin nombrarla y Claude la carga sola porque encaja con su descripción:',
    '',
    '```text',
    '<tarea que encaja con la descripción de la skill>',
    '```',
    '',
    'También sirve para revisar código que ya usa el paquete:',
    '',
    '```text',
    `/${skillName(name)} revisa src/ y corrige lo que incumpla las reglas del paquete`,
    '```',
    '',
    'Con la skill cargada, Claude sigue sus reglas, evita los errores de su lista "Qué no hacer" y, antes de usar algo que la skill no muestra, lee este README en `node_modules`.',
    '',
    '### Mantenerla al día',
    '',
    `- La copia no se actualiza sola: después de actualizar \`${name}\`, vuelve a ejecutar el \`cp\` de arriba.`,
    `- Sube \`${skillDir}/\` al repositorio para que todo el equipo la use.`,
    '',
    '## Licencia',
    '',
    'MIT',
    '',
  ].join('\n');
}

function skill(name, description) {
  return [
    '---',
    `name: ${skillName(name)}`,
    `description: ${description} Úsala cuando el código importe ${name} o la tarea necesite lo que ofrece.`,
    '---',
    '',
    `# ${skillName(name)}`,
    '',
    description,
    '',
    '## API completa',
    '',
    `Antes de usar algo que esta skill no muestre, lee \`node_modules/${name}/README.md\`: corresponde a la versión instalada. No supongas firmas ni opciones. Si el paquete no está instalado: \`npm install ${name}\`.`,
    '',
    `Si esa ruta no existe (monorepo con workspaces, pnpm…), localiza el paquete con \`node -p "require.resolve('${name}/package.json')"\` y lee el \`README.md\` de esa carpeta.`,
    '',
    '## Importación',
    '',
    '```ts',
    `import { PACKAGE_NAME } from '${name}';`,
    '```',
    '',
    '## Reglas',
    '',
    '## Patrones recomendados',
    '',
    '## Qué no hacer',
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
    'src/index.ts': `export const PACKAGE_NAME = '${name}';\n`,
    'test/index.spec.ts': [
      "import { describe, expect, it } from '@jest/globals';",
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
