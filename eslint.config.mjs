import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  {
    ignores: ['app/**', 'build/**', 'commands/**', 'node_modules/**', 'src/Core/cryptoshim.js', '**/*.d.ts'],
  },
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Would have caught the silent Dropbox retry bug.
      '@typescript-eslint/no-floating-promises': 'warn',
      // Would have caught the MenuItem/NoteElement stale-closure bugs.
      'react-hooks/exhaustive-deps': 'warn',
      // Pre-existing patterns recorded as baseline warnings, not errors.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/purity': 'warn',
      // Gradual migration: any is still widespread in this codebase.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
      // js-beautify and the turndown plugins ship without ES module types.
      '@typescript-eslint/no-require-imports': 'warn',
    },
  },
);
