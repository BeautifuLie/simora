import { describe, it, expect } from 'vitest';
import { resolveVars, hasVars } from './types';
import type { Environment } from './types';

const makeEnv = (
    variables: Array<{ key: string; value: string; enabled: boolean }>
): Environment => ({
    id: 'test-env',
    name: 'Test',
    color: '',
    variables,
});

describe('resolveVars', () => {
    it('replaces a single {{key}} with the env value', () => {
        const env = makeEnv([{ key: 'base_url', value: 'https://api.example.com', enabled: true }]);
        expect(resolveVars('{{base_url}}/users', env)).toBe('https://api.example.com/users');
    });

    it('leaves {{missing}} unchanged when key not in env', () => {
        const env = makeEnv([{ key: 'token', value: 'abc', enabled: true }]);
        expect(resolveVars('{{missing}}/path', env)).toBe('{{missing}}/path');
    });

    it('skips disabled variables', () => {
        const env = makeEnv([{ key: 'token', value: 'secret', enabled: false }]);
        expect(resolveVars('Bearer {{token}}', env)).toBe('Bearer {{token}}');
    });

    it('returns original string when env is null', () => {
        expect(resolveVars('{{key}}', null)).toBe('{{key}}');
    });

    it('returns original string when text has no variables', () => {
        const env = makeEnv([{ key: 'base_url', value: 'https://api.example.com', enabled: true }]);
        expect(resolveVars('https://example.com/path', env)).toBe('https://example.com/path');
    });

    it('replaces multiple variables in one string', () => {
        const env = makeEnv([
            { key: 'base_url', value: 'https://api.example.com', enabled: true },
            { key: 'user_id', value: '42', enabled: true },
        ]);
        expect(resolveVars('{{base_url}}/users/{{user_id}}', env)).toBe(
            'https://api.example.com/users/42'
        );
    });

    it('returns original string when variables list is empty', () => {
        const env = makeEnv([]);
        expect(resolveVars('{{key}}', env)).toBe('{{key}}');
    });

    it('resolves an enabled var but leaves a disabled var unchanged in same string', () => {
        const env = makeEnv([
            { key: 'host', value: 'example.com', enabled: true },
            { key: 'token', value: 'secret', enabled: false },
        ]);
        expect(resolveVars('{{host}}/path?token={{token}}', env)).toBe(
            'example.com/path?token={{token}}'
        );
    });

    it('handles whitespace trimming inside {{ }}', () => {
        const env = makeEnv([{ key: 'base_url', value: 'https://api.example.com', enabled: true }]);
        expect(resolveVars('{{ base_url }}', env)).toBe('https://api.example.com');
    });
});

describe('hasVars', () => {
    it('returns true for string with {{key}}', () => {
        expect(hasVars('{{key}}')).toBe(true);
    });

    it('returns true for string with variable in URL', () => {
        expect(hasVars('https://{{host}}/path')).toBe(true);
    });

    it('returns false for plain string with no variables', () => {
        expect(hasVars('no vars here')).toBe(false);
    });

    it('returns false for empty string', () => {
        expect(hasVars('')).toBe(false);
    });

    it('returns false for string with only single braces', () => {
        expect(hasVars('{notavar}')).toBe(false);
    });

    it('returns true for string with multiple variables', () => {
        expect(hasVars('{{base_url}}/users/{{user_id}}')).toBe(true);
    });
});
