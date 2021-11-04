module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: 2020,
  },
  extends: ['plugin:prettier/recommended'],
  plugins: [],
  // add your custom rules here
  rules: {
    'eol-last': 'error',
    'no-multiple-empty-lines': ['error', { max: 1, maxEOF: 1 }],
  },
};
