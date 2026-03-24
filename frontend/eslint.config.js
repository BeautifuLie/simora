import { defineFlatConfig } from 'eslint-define-config';
import js from '@eslint/js';
import parser from '@typescript-eslint/parser';
import prettier from 'eslint-config-prettier';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default defineFlatConfig([
    js.configs.recommended,
    {
        files: ['**/*.ts', '**/*.tsx'],
        languageOptions: {
            parser: parser,
            parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module',
                ecmaFeatures: { jsx: true },
            },
            globals: {
                ...Object.fromEntries(
                    Object.entries(globals.browser).filter(([k]) => k.trim() === k)
                ),
                setImmediate: 'readonly',
                MSApp: 'readonly',
            },
        },

        plugins: {
            react,
            'react-hooks': reactHooks,
        },
        settings: {
            react: {
                version: 'detect',
            },
        },
        rules: {
            'react/react-in-jsx-scope': 'off',
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'warn',
            'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        },
    },
    {
        files: ['vite.config.ts'],
        languageOptions: {
            sourceType: 'module',
            globals: {
                __dirname: 'readonly',
                module: 'readonly',
                require: 'readonly',
            },
        },
    },
    {
        files: ['vitest.config.ts'],
        languageOptions: {
            globals: {
                __dirname: 'readonly',
            },
        },
    },
    prettier,

    {
        ignores: ['wailsjs/**', 'dist/**', 'node_modules/**'],
    },
]);
