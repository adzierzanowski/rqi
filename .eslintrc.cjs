// eslint-disable-next-line no-undef
module.exports = {
  extends: ['eslint:recommended'],
  root: true,
  env: {
    browser: true,
    es2022: true,
  },
  plugins: ['prettier'],
  rules: {
    'prettier/prettier': 'error',
    quotes: ['error', 'single'],
    'no-unused-vars': 'off',
  },
  parserOptions: {
    sourceType: 'module',
    ecmaFeatures: {
      jsx: false,
    },
  },
  globals: {
    browser: 'readonly',
    module: 'readonly',
  },
};
