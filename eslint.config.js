'use strict';

const tseslint = require('typescript-eslint');
const prettierPlugin = require('eslint-plugin-prettier');
const prettierConfig = require('eslint-config-prettier');
const js = require('@eslint/js');
const globals = require('globals');

const fs = require('fs');
const path = require('path');

const TS_FILES = ['**/*.ts', '**/*.mts', '**/*.cts'];
const onlyTs = (configs) => configs.map((config) => ({ ...config, files: TS_FILES }));

const STATEMENTS_THAT_ONLY_REEXPORT =
  /(?:import|export)\s[^;]*?from\s*['"][^'"]+['"];?|\/\/.*$|\/\*[\s\S]*?\*\//gm;

const onlyReexports = (file) =>
  fs.readFileSync(file, 'utf8').replace(STATEMENTS_THAT_ONLY_REEXPORT, '').trim() === '';

const packageSrcOf = (file) => {
  const match = /^(.*\/packages\/[^/]+)\/src\//.exec(file);
  return match === null ? null : { root: match[1], src: path.join(match[1], 'src') };
};

const entryPointsOf = (root) => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  return Object.keys(manifest.exports ?? { '.': null })
    .filter((subpath) => subpath !== './package.json')
    .map((subpath) => path.join(root, 'src', subpath, 'index.ts'));
};

const moduleOf = (src, file) => path.relative(src, file).split(path.sep)[0];

// Enforces the "Imports" rule of .claude/rules/packages.md: import from the declaring file
const noBarrelImport = {
  meta: {
    type: 'problem',
    messages: {
      directory:
        "'{{specifier}}' imports a folder: name the file that declares the symbol (or '{{specifier}}/index' when that index declares it).",
      barrel:
        "'{{specifier}}' only re-exports: import each symbol from the file that declares it (across subpath modules, only through the other module's index).",
    },
    schema: [],
  },
  create(context) {
    const file = context.filename;
    const pkg = packageSrcOf(file);
    if (pkg === null) {
      return {};
    }
    const entryPoints = entryPointsOf(pkg.root);
    const isSubpathPackage = !entryPoints.includes(path.join(pkg.src, 'index.ts'));
    const check = (node) => {
      const specifier = node.source?.value;
      if (typeof specifier !== 'string' || !specifier.startsWith('.')) {
        return;
      }
      const base = path.resolve(path.dirname(file), specifier);
      if (fs.existsSync(`${base}.ts`)) {
        const target = `${base}.ts`;
        const crossesIntoModuleEntry =
          isSubpathPackage &&
          path.basename(target) === 'index.ts' &&
          path.dirname(target) === path.join(pkg.src, moduleOf(pkg.src, target)) &&
          moduleOf(pkg.src, target) !== moduleOf(pkg.src, file);
        if (
          path.basename(target) === 'index.ts' &&
          !entryPoints.includes(file) &&
          !crossesIntoModuleEntry &&
          onlyReexports(target)
        ) {
          context.report({ node: node.source, messageId: 'barrel', data: { specifier } });
        }
        return;
      }
      if (fs.existsSync(path.join(base, 'index.ts'))) {
        context.report({ node: node.source, messageId: 'directory', data: { specifier } });
      }
    };
    return {
      ImportDeclaration: check,
      ExportNamedDeclaration: check,
      ExportAllDeclaration: check,
    };
  },
};

module.exports = tseslint.config(
  // Ignore build artifacts and dependencies
  {
    ignores: [
      'dist/**',
      'packages/*/dist/**',
      '**/node_modules/**',
      'coverage/**',
      'packages/*/coverage/**',
      '**/target/**',
      '.idea/**',
      'packages/crypto-tools/wasm/**',
      '**/*.generated.ts',
      'packages/ddd/ddd-skills/**',
    ],
  },

  // Base ESLint recommended rules
  js.configs.recommended,

  // TypeScript strict and stylistic presets (non-type-checked), only for TypeScript files
  onlyTs(tseslint.configs.strict),
  onlyTs(tseslint.configs.stylistic),

  // Prettier formatting for every package source and test file
  {
    files: ['packages/*/src/**/*.ts', 'packages/*/test/**/*.ts'],
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      ...prettierConfig.rules,
      'prettier/prettier': 'error',
    },
  },

  // Source files — strict library rules
  {
    files: ['packages/*/src/**/*.ts'],
    plugins: {
      'archi-code': { rules: { 'no-barrel-import': noBarrelImport } },
    },
    languageOptions: {
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
      },
    },
    rules: {
      // --- Library flexibility ---
      '@typescript-eslint/no-explicit-any': 'off', // DDD patterns use any intentionally
      '@typescript-eslint/no-unsafe-function-type': 'off', // Function type allowed
      // An options interface may just reuse another one (e.g. IsMailtoURIOptions extends IsEmailOptions)
      '@typescript-eslint/no-empty-object-type': [
        'error',
        { allowInterfaces: 'with-single-extends' },
      ],

      // --- Strict correctness ---
      eqeqeq: ['error', 'always', { null: 'ignore' }], // allow == null to check both null and undefined
      'no-var': 'error',
      'prefer-const': 'error',
      'no-shadow': 'off',
      '@typescript-eslint/no-shadow': 'error',

      // --- Library consumers need visible types ---
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        {
          allowExpressions: true,
          allowHigherOrderFunctions: true,
          allowTypedFunctionExpressions: true,
        },
      ],
      '@typescript-eslint/explicit-module-boundary-types': [
        'error',
        { allowArgumentsExplicitlyTypedAsAny: true, allowHigherOrderFunctions: true },
      ],
      '@typescript-eslint/no-empty-function': ['error', { allow: ['private-constructors'] }],
      '@typescript-eslint/no-extraneous-class': 'off', // static factory/initializer classes are valid OOP patterns

      // --- No unused code ---
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],

      // --- Import each symbol from the file that declares it ---
      'archi-code/no-barrel-import': 'error',

      // --- No side effects in library ---
      'no-console': ['warn', { allow: ['warn', 'error', 'debug'] }],
    },
  },

  // @archi-code/validation — named exports only (no `export default`, no re-exported defaults)
  {
    files: ['packages/validation/src/**/*.ts'],
    rules: {
      'no-restricted-exports': [
        'error',
        {
          restrictDefaultExports: {
            direct: true,
            named: true,
            defaultFrom: true,
            namedFrom: true,
            namespaceFrom: true,
          },
        },
      ],
    },
  },

  // Test files — relaxed rules (no need for explicit types in tests)
  {
    files: ['packages/*/test/**/*.ts'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-useless-constructor': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-extraneous-class': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
      'no-console': 'off',
    },
  },

  // JavaScript tooling: root scripts, build check hooks and this config (CommonJS on Node)
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: globals.node,
    },
    rules: {
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-var': 'error',
      'prefer-const': 'error',
      'no-shadow': 'error',
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
    },
  },

  // Root script tests are ES modules run by Vitest
  {
    files: ['scripts/__tests__/**/*.js'],
    languageOptions: { sourceType: 'module' },
  },

  // Build check hooks: browser() page functions run inside real browser pages
  {
    files: ['packages/*/test/dist/**/*.js'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
);
