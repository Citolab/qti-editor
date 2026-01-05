import importPlugin from 'eslint-plugin-import';
import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

export default [
  // Base JavaScript config
  js.configs.recommended,

  // TypeScript files
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      import: importPlugin,
    },
    rules: {
      // Disable base rules that conflict with TypeScript
      'no-unused-vars': 'off',
      'no-undef': 'off',

      // TypeScript-specific rules
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],

      // Import organization (preserves your blank lines!)
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          pathGroups: [
            {
              pattern: '@qti-editor/**',
              group: 'internal',
              position: 'before',
            },
            {
              pattern: '@citolab/**',
              group: 'internal',
              position: 'before',
            },
          ],
          pathGroupsExcludedImportTypes: ['builtin'],
          'newlines-between': 'ignore', // Key: preserves your blank lines!
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],

      // Explicitly disable any other import rules that might interfere
      'import/newline-after-import': 'off',
      'import/no-duplicates': 'error', // Still prevent actual duplicates
      'import/first': 'error', // Imports should be at top

      // Formatting rules (replacing Prettier)
      'semi': ['error', 'always'],
      'quotes': ['error', 'single', { 'avoidEscape': true }],
      'comma-dangle': ['error', 'always-multiline'],
      'indent': ['error', 2, { 'SwitchCase': 1 }],
      'object-curly-spacing': ['error', 'always'],
      'array-bracket-spacing': ['error', 'never'],
      'space-before-blocks': 'error',
      'keyword-spacing': 'error',
      'space-infix-ops': 'error',
      'eol-last': ['error', 'always'],
      'no-trailing-spaces': 'error',
      'no-multiple-empty-lines': ['error', { 'max': 2, 'maxEOF': 1 }],

      // Basic rules
      'no-console': 'off',
    },
  },

  // JavaScript files
  {
    files: ['**/*.{js,mjs}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    rules: {
      'no-console': 'off',
    },
  },
];
