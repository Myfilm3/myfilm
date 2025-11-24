// eslint.config.mjs
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    files: ['src/**/*.ts'],
    ignores: [
      'dist/**',
      'node_modules/**',
      '**/*.spec.ts', // ignoramos todos los tests del starter
      'test/**',
    ],
  },

  // Reglas base de JS
  js.configs.recommended,

  // Reglas base de TS (no type-checked, sin tsconfig.project)
  ...tseslint.configs.recommended,
  prettier,

  {
    languageOptions: {
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      // 💥 Apagamos todo lo que te estaba estorbando

      // Serie “no-unsafe-*”
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',

      // no-explicit-any fuera
      '@typescript-eslint/no-explicit-any': 'off',

      // Cosas de estilo que daban la lata
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/no-extraneous-class': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unnecessary-type-conversion': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/no-redundant-type-constituents': 'off',

      // Promesas / async muy rígidas → off
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-floating-promises': 'off',

      // Dejamos solo algo muy básico para no acumular mierda
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
);