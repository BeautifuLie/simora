import { describe, it, expect } from 'vitest';
import { cn, shortcut, isMac } from './utils';

describe('cn', () => {
    it('merges two class strings', () => {
        expect(cn('foo', 'bar')).toBe('foo bar');
    });

    it('deduplicates conflicting tailwind classes keeping the last one', () => {
        expect(cn('p-2', 'p-4')).toBe('p-4');
    });

    it('handles conditional falsy values', () => {
        const condition = false;
        expect(cn('foo', condition && 'bar', 'baz')).toBe('foo baz');
    });

    it('handles undefined and null inputs', () => {
        expect(cn('foo', undefined, null, 'bar')).toBe('foo bar');
    });

    it('returns empty string when no inputs', () => {
        expect(cn()).toBe('');
    });

    it('merges multiple tailwind utility conflicts', () => {
        expect(cn('text-sm', 'text-lg', 'font-bold')).toBe('text-lg font-bold');
    });
});

describe('shortcut', () => {
    it('returns a string containing the key', () => {
        const result = shortcut('K');
        expect(result).toMatch(/K/);
    });

    it('returns ⌘K on Mac or Ctrl+K on non-Mac', () => {
        const result = shortcut('K');
        expect(result === '⌘K' || result === 'Ctrl+K').toBe(true);
    });

    it('formats correctly based on isMac', () => {
        const result = shortcut('P');
        expect(result).toBe(isMac ? '⌘P' : 'Ctrl+P');
    });

    it('works for any single character key', () => {
        const result = shortcut('S');
        expect(result).toBe(isMac ? '⌘S' : 'Ctrl+S');
    });
});

describe('isMac', () => {
    it('is a boolean value', () => {
        expect(typeof isMac).toBe('boolean');
    });

    it('reflects whether navigator.platform includes Mac', () => {
        const expected = /Mac/i.test(navigator.platform);
        expect(isMac).toBe(expected);
    });
});
