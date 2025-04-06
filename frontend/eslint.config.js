import { defineFlatConfig } from 'eslint-define-config';
import js from '@eslint/js';
import parser from '@typescript-eslint/parser';
import prettier from 'eslint-config-prettier';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

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
                window: 'readonly',
                document: 'readonly',
                console: 'readonly',
                HTMLElement: 'readonly',
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
    prettier,

    {
        ignores: ['wailsjs/**'],
    },
]);
