import { describe, it, expect } from 'vitest';
import { fuzzyMatch, fuzzyScore } from './CommandPalette';

describe('fuzzyMatch', () => {
    it('returns true when query is a substring of text', () => {
        expect(fuzzyMatch('foo', 'foobar')).toBe(true);
    });

    it('returns false when query characters are not all present in text', () => {
        expect(fuzzyMatch('xyz', 'foobar')).toBe(false);
    });

    it('returns true for empty query — matches everything', () => {
        expect(fuzzyMatch('', 'anything')).toBe(true);
    });

    it('returns true when query characters appear in order but non-contiguously', () => {
        expect(fuzzyMatch('fb', 'foobar')).toBe(true);
    });

    it('returns false when query is longer than text', () => {
        expect(fuzzyMatch('toolongquery', 'short')).toBe(false);
    });

    it('is case-insensitive', () => {
        expect(fuzzyMatch('FOO', 'foobar')).toBe(true);
    });

    it('returns true when query equals text', () => {
        expect(fuzzyMatch('hello', 'hello')).toBe(true);
    });

    it('returns false when a query char is missing entirely', () => {
        expect(fuzzyMatch('z', 'foobar')).toBe(false);
    });
});

describe('fuzzyScore', () => {
    it('returns 3 when query is a prefix of text', () => {
        expect(fuzzyScore('foo', 'foobar')).toBe(3);
    });

    it('returns 2 when query appears as substring but not at start', () => {
        expect(fuzzyScore('bar', 'foobar')).toBe(2);
    });

    it('returns 1 when query characters match non-contiguously', () => {
        expect(fuzzyScore('fbr', 'foobar')).toBe(1);
    });

    it('returns 0 when query does not match at all', () => {
        expect(fuzzyScore('xyz', 'foobar')).toBe(0);
    });

    it('returns 0 for empty query', () => {
        expect(fuzzyScore('', 'foobar')).toBe(0);
    });

    it('returns higher score for prefix match than for mid-string match', () => {
        const prefixScore = fuzzyScore('get', 'get users');
        const midScore = fuzzyScore('get', 'list get users');
        expect(prefixScore).toBeGreaterThan(midScore);
    });

    it('returns higher score for substring match than for non-contiguous match', () => {
        const subScore = fuzzyScore('bar', 'foobar');
        const fuzzyOnlyScore = fuzzyScore('fbr', 'foobar');
        expect(subScore).toBeGreaterThan(fuzzyOnlyScore);
    });
});
