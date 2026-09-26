// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * Backend lint config.
 *
 * `npm run lint` previously pointed at src/**\/*.ts with no config file
 * anywhere at the repo root, so ESLint 10 exited without linting anything. The
 * frontend has its own config under frontend/.
 */
export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'frontend/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
    },
    rules: {
      // The pg layer is genuinely untyped at the row boundary; tightening that
      // is a separate change from getting lint running at all.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
);
