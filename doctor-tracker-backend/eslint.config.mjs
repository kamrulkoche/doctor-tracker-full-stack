import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**', 'node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: { allowDefaultProject: ['eslint.config.mjs'] },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      eqeqeq: ['error', 'always'],
      'no-console': ['error', { allow: ['info', 'warn', 'error'] }],
    },
  },
  {
    files: ['src/scripts/**/*.ts'],
    rules: { 'no-console': 'off' },
  },
  {
    // Test helpers deliberately give supertest's untyped `response.body` a DTO type.
    files: ['tests/**/*.ts'],
    rules: { '@typescript-eslint/no-unnecessary-type-parameters': 'off' },
  },
  {
    files: ['eslint.config.mjs'],
    ...tseslint.configs.disableTypeChecked,
  },
);
