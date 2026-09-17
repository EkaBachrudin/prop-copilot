import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';
import eslintPluginPrettier from 'eslint-plugin-prettier';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'coverage/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    files: ['src/**/*.ts'],
    plugins: { prettier: eslintPluginPrettier },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    rules: {
      'prettier/prettier': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['src/domain/**/*.ts', 'src/application/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@langchain/*',
                'openai',
                'pg',
                'express',
                'multer',
                'cors',
                'zod',
                'dotenv',
                'pdf-parse',
              ],
              message:
                'Domain/application must stay framework-agnostic. Put adapter code under src/infrastructure.',
            },
            {
              group: ['**/infrastructure/**', '**/presentation/**', '**/composition/**'],
              message:
                'Depend inward only (domain <- application). Adapters belong under src/infrastructure.',
            },
          ],
        },
      ],
    },
  }
);
