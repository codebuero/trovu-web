module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
    jest: true
  },
  plugins: ['jest'],
  extends: 'standard',
  overrides: [
    {
      env: {
        node: true
      },
      files: [
        '.eslintrc.{js,cjs}'
      ],
      parserOptions: {
        sourceType: 'script'
      }
    }
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    'semi': 0,
    'space-before-function-paren': ['error', 'never'],
    'no-sparse-arrays': 0,
  }
}
