import { describe, it, expect } from 'vitest';
import { parseParams, buildUrl, findRequestPath } from './app';
import type { QueryParam, Organization } from './app';

describe('parseParams', () => {
    it('parses foo=bar&baz=qux into two params', () => {
        const result = parseParams('https://example.com?foo=bar&baz=qux');
        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({ key: 'foo', value: 'bar', enabled: true });
        expect(result[1]).toEqual({ key: 'baz', value: 'qux', enabled: true });
    });

    it('returns empty array for URL without query string', () => {
        const result = parseParams('https://example.com/path');
        expect(result).toHaveLength(0);
    });

    it('returns empty array for bare URL', () => {
        const result = parseParams('https://example.com');
        expect(result).toHaveLength(0);
    });

    it('parses key= as key with empty value', () => {
        const result = parseParams('https://example.com?key=');
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({ key: 'key', value: '', enabled: true });
    });

    it('sets enabled true for all parsed params', () => {
        const result = parseParams('https://example.com?a=1&b=2');
        expect(result.every(p => p.enabled === true)).toBe(true);
    });

    it('decodes percent-encoded characters', () => {
        const result = parseParams('https://example.com?name=John%20Doe');
        expect(result[0].value).toBe('John Doe');
    });

    it('handles param with no equals sign as key with empty value', () => {
        const result = parseParams('https://example.com?standalone');
        expect(result).toHaveLength(1);
        expect(result[0].key).toBe('standalone');
        expect(result[0].value).toBe('');
    });
});

describe('buildUrl', () => {
    it('appends enabled params as query string', () => {
        const params: QueryParam[] = [
            { key: 'page', value: '1', enabled: true },
            { key: 'limit', value: '20', enabled: true },
        ];
        expect(buildUrl('https://example.com/users', params)).toBe(
            'https://example.com/users?page=1&limit=20'
        );
    });

    it('excludes disabled params', () => {
        const params: QueryParam[] = [
            { key: 'page', value: '1', enabled: true },
            { key: 'debug', value: 'true', enabled: false },
        ];
        expect(buildUrl('https://example.com/users', params)).toBe(
            'https://example.com/users?page=1'
        );
    });

    it('excludes params with empty key', () => {
        const params: QueryParam[] = [
            { key: '', value: 'orphan', enabled: true },
            { key: 'page', value: '2', enabled: true },
        ];
        expect(buildUrl('https://example.com/users', params)).toBe(
            'https://example.com/users?page=2'
        );
    });

    it('returns base URL when all params are disabled', () => {
        const params: QueryParam[] = [{ key: 'page', value: '1', enabled: false }];
        expect(buildUrl('https://example.com/users', params)).toBe('https://example.com/users');
    });

    it('returns base URL when params array is empty', () => {
        expect(buildUrl('https://example.com/users', [])).toBe('https://example.com/users');
    });

    it('strips existing query string from base before appending params', () => {
        const params: QueryParam[] = [{ key: 'page', value: '3', enabled: true }];
        expect(buildUrl('https://example.com/users?page=1', params)).toBe(
            'https://example.com/users?page=3'
        );
    });

    it('encodes special characters in keys and values', () => {
        const params: QueryParam[] = [{ key: 'q', value: 'hello world', enabled: true }];
        expect(buildUrl('https://example.com/search', params)).toBe(
            'https://example.com/search?q=hello%20world'
        );
    });
});

describe('findRequestPath', () => {
    const orgs: Organization[] = [
        {
            id: 'org1',
            name: 'Org One',
            projects: [
                {
                    id: 'proj1',
                    name: 'Project One',
                    collections: [
                        {
                            id: 'col1',
                            name: 'Collection One',
                            requests: [
                                {
                                    id: 'req1',
                                    name: 'Root Request',
                                    method: 'GET',
                                    url: '',
                                    body: '',
                                    headers: [],
                                } as any,
                            ],
                            folders: [
                                {
                                    id: 'fld1',
                                    name: 'Folder One',
                                    requests: [
                                        {
                                            id: 'req2',
                                            name: 'Folder Request',
                                            method: 'POST',
                                            url: '',
                                            body: '',
                                            headers: [],
                                        } as any,
                                    ],
                                    folders: [],
                                } as any,
                            ],
                        } as any,
                    ],
                } as any,
            ],
        } as any,
    ];

    it('finds a request in the collection root', () => {
        const result = findRequestPath(orgs, 'req1');
        expect(result).not.toBeNull();
        expect(result!.orgId).toBe('org1');
        expect(result!.projectId).toBe('proj1');
        expect(result!.collectionId).toBe('col1');
        expect(result!.requestId).toBe('req1');
        expect(result!.folderId).toBeUndefined();
    });

    it('finds a request inside a folder', () => {
        const result = findRequestPath(orgs, 'req2');
        expect(result).not.toBeNull();
        expect(result!.orgId).toBe('org1');
        expect(result!.projectId).toBe('proj1');
        expect(result!.collectionId).toBe('col1');
        expect(result!.requestId).toBe('req2');
        expect(result!.folderId).toBe('fld1');
    });

    it('returns null for a non-existent request id', () => {
        const result = findRequestPath(orgs, 'does-not-exist');
        expect(result).toBeNull();
    });

    it('returns null for empty organizations array', () => {
        const result = findRequestPath([], 'req1');
        expect(result).toBeNull();
    });
});
