module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'script'
  },
  ignorePatterns: ['uploads/', 'outputs/', 'public/', 'node_modules/'],
  rules: {
    'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }]
  }
};
