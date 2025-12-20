//const validateNamesPlugin = require('./.eslint-custom-plugins/eslint-plugin-validate-names');

module.exports = {
  parser: '@typescript-eslint/parser',
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'plugin:prettier/recommended'],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'prettier'],
  rules: {
    'prettier/prettier': 'error', // Asegura que las reglas de Prettier se apliquen y se traten como errores
    '@typescript-eslint/no-explicit-any': 'off', // Permite el uso de `any`
    '@typescript-eslint/ban-types': [
      'error',
      {
        types: {
          Function: false, // Permitir el uso de `Function`
        },
        extendDefaults: true,
      },
    ],
  },
};
