module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  rules: {
    // Add basic rules here
    'no-unused-vars': 'off', // Disable base rule
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^' }],
    'no-console': 'off',
  },
  env: {
    node: true,
    es2022: true,
  },
};