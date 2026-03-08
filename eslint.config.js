'use strict';

const tseslint = require('typescript-eslint');
const prettierPlugin = require('eslint-plugin-prettier');
const prettierConfig = require('eslint-config-prettier');
const js = require('@eslint/js');

module.exports = tseslint.config(
  // Ignore build artifacts and dependencies
  { ignores: ['**/dist/**', '**/node_modules/**', '**/*.js'] },

  // Base ESLint recommended rules
  js.configs.recommended,

  // TypeScript strict preset (non-type-checked)
  tseslint.configs.strict,

  // TypeScript stylistic preset
  tseslint.configs.stylistic,

  // Source files — strict library rules
  {
    files: ['packages/*/src/**/*.ts'],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
      },
    },
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      // Prettier formatting (must be last to override conflicting rules)
      ...prettierConfig.rules,
      'prettier/prettier': 'error',

      // --- Library flexibility ---
      '@typescript-eslint/no-explicit-any': 'off', // DDD patterns use any intentionally
      '@typescript-eslint/no-unsafe-function-type': 'off', // Function type allowed

      // --- Strict correctness ---
      'eqeqeq': ['error', 'always', { null: 'ignore' }], // allow == null to check both null and undefined
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
      '@typescript-eslint/explicit-module-boundary-types': ['error', { allowArgumentsExplicitlyTypedAsAny: true, allowHigherOrderFunctions: true }],
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

      // --- No side effects in library ---
      'no-console': ['warn', { allow: ['warn', 'error', 'debug'] }],
    },
  },

  // Test files — relaxed rules (no need for explicit types in tests)
  {
    files: ['packages/*/src/**/*.spec.ts'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-useless-constructor': 'off',
      'no-console': 'off',
    },
  },
);
