import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * Pragmatic lint config: catch real mistakes (unsafe usage, obvious bugs)
 * without retrofitting the whole codebase. Noisy stylistic rules are relaxed to
 * warnings or off so `npm run lint` stays green and useful for new code.
 */
export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-empty-function': 'off',
      // Optional native deps (sqlite/pg/s3) are lazy-loaded via require() by design.
      '@typescript-eslint/no-require-imports': 'off',
      'no-useless-escape': 'warn',
    },
  },
);
