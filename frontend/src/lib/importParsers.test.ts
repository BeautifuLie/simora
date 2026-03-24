import { describe, it, expect } from 'vitest';
import { parseCollection, parsePostman, parseInsomnia } from './importParsers';

const postmanV21Json = JSON.stringify({
    info: {
        name: 'My API',
        _postman_id: 'abc-123',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    item: [
        {
            name: 'Get Users',
            request: {
                method: 'GET',
                url: { raw: 'https://api.example.com/users' },
                header: [{ key: 'Authorization', value: 'Bearer token', disabled: false }],
            },
        },
        {
            name: 'Auth',
            item: [
                {
                    name: 'Login',
                    request: {
                        method: 'POST',
                        url: 'https://api.example.com/auth/login',
                        header: [],
                        body: { raw: '{"email":"user@example.com"}' },
                    },
                },
            ],
        },
    ],
});

const insomniaV4Json = JSON.stringify({
    _type: 'export',
    __export_format: 4,
    resources: [
        { _id: 'wrk_1', _type: 'workspace', name: 'My Workspace' },
        {
            _id: 'req_1',
            _type: 'request',
            parentId: 'wrk_1',
            name: 'Health Check',
            method: 'GET',
            url: 'https://api.example.com/health',
            body: {},
            headers: [],
        },
        {
            _id: 'req_2',
            _type: 'request',
            parentId: 'wrk_1',
            name: 'Create Item',
            method: 'POST',
            url: 'https://api.example.com/items',
            body: { text: '{"name":"foo"}' },
            headers: [{ name: 'Content-Type', value: 'application/json', disabled: false }],
        },
    ],
});

const insomniaV5Yaml = `
type: collection.insomnia.rest/5.0
name: My V5 Collection
children:
  - name: Ping
    method: GET
    url: https://api.example.com/ping
`;

describe('parseCollection — Postman v2.1 JSON', () => {
    it('parses successfully and returns the collection name', () => {
        const result = parseCollection(postmanV21Json);
        expect(result).not.toBeNull();
        expect(result!.name).toBe('My API');
    });

    it('extracts direct requests from collection root', () => {
        const result = parseCollection(postmanV21Json);
        expect(result!.requests).toHaveLength(1);
        expect(result!.requests[0].name).toBe('Get Users');
        expect(result!.requests[0].method).toBe('GET');
    });

    it('extracts folders from collection', () => {
        const result = parseCollection(postmanV21Json);
        expect(result!.folders).toHaveLength(1);
        expect(result!.folders[0].name).toBe('Auth');
    });

    it('extracts nested requests from folders', () => {
        const result = parseCollection(postmanV21Json);
        expect(result!.folders[0].requests).toHaveLength(1);
        expect(result!.folders[0].requests[0].name).toBe('Login');
    });
});

describe('parseCollection — Insomnia v4 JSON', () => {
    it('parses successfully and returns the workspace name', () => {
        const result = parseCollection(insomniaV4Json);
        expect(result).not.toBeNull();
        expect(result!.name).toBe('My Workspace');
    });

    it('extracts requests from workspace', () => {
        const result = parseCollection(insomniaV4Json);
        expect(result!.requests).toHaveLength(2);
    });

    it('maps request names correctly', () => {
        const result = parseCollection(insomniaV4Json);
        const names = result!.requests.map(r => r.name);
        expect(names).toContain('Health Check');
        expect(names).toContain('Create Item');
    });
});

describe('parseCollection — Insomnia v5 YAML', () => {
    it('parses successfully and returns the collection name', () => {
        const result = parseCollection(insomniaV5Yaml);
        expect(result).not.toBeNull();
        expect(result!.name).toBe('My V5 Collection');
    });

    it('extracts requests from children', () => {
        const result = parseCollection(insomniaV5Yaml);
        expect(result!.requests).toHaveLength(1);
        expect(result!.requests[0].name).toBe('Ping');
        expect(result!.requests[0].method).toBe('GET');
    });
});

describe('parseCollection — unknown format', () => {
    it('returns null for unknown JSON format', () => {
        const result = parseCollection(JSON.stringify({ foo: 'bar', unrecognized: true }));
        expect(result).toBeNull();
    });

    it('returns null for invalid JSON and invalid YAML', () => {
        const result = parseCollection('{invalid json AND: : :\nbad: yaml: :}');
        expect(result).toBeNull();
    });

    it('returns null for plain text', () => {
        const result = parseCollection('just some text');
        expect(result).toBeNull();
    });

    it('returns null for JSON array at root', () => {
        const result = parseCollection(JSON.stringify([{ name: 'item' }]));
        expect(result).toBeNull();
    });
});

describe('parsePostman', () => {
    it('extracts collection name from info', () => {
        const json = {
            info: {
                name: 'Test Collection',
                schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
            },
            item: [],
        };
        const result = parsePostman(json);
        expect(result.name).toBe('Test Collection');
    });

    it('defaults name to Imported when info is missing', () => {
        const result = parsePostman({ item: [] });
        expect(result.name).toBe('Imported');
    });

    it('extracts requests from item array', () => {
        const json = {
            info: { name: 'API' },
            item: [
                {
                    name: 'Get Items',
                    request: { method: 'GET', url: 'https://example.com/items', header: [] },
                },
            ],
        };
        const result = parsePostman(json);
        expect(result.requests).toHaveLength(1);
        expect(result.requests[0].name).toBe('Get Items');
    });

    it('extracts folders from item array', () => {
        const json = {
            info: { name: 'API' },
            item: [
                {
                    name: 'Auth',
                    item: [
                        {
                            name: 'Login',
                            request: {
                                method: 'POST',
                                url: 'https://example.com/login',
                                header: [],
                            },
                        },
                    ],
                },
            ],
        };
        const result = parsePostman(json);
        expect(result.requests).toHaveLength(0);
        expect(result.folders).toHaveLength(1);
        expect(result.folders[0].name).toBe('Auth');
        expect(result.folders[0].requests).toHaveLength(1);
    });

    it('handles raw URL string format', () => {
        const json = {
            info: { name: 'API' },
            item: [
                {
                    name: 'Simple',
                    request: { method: 'GET', url: 'https://example.com/simple', header: [] },
                },
            ],
        };
        const result = parsePostman(json);
        expect(result.requests[0].url).toBe('https://example.com/simple');
    });

    it('maps headers with enabled flag', () => {
        const json = {
            info: { name: 'API' },
            item: [
                {
                    name: 'With Headers',
                    request: {
                        method: 'GET',
                        url: 'https://example.com',
                        header: [
                            { key: 'X-Custom', value: 'foo', disabled: false },
                            { key: 'X-Disabled', value: 'bar', disabled: true },
                        ],
                    },
                },
            ],
        };
        const result = parsePostman(json);
        const headers = result.requests[0]!.headers!;
        expect(headers[0]!.enabled).toBe(true);
        expect(headers[1]!.enabled).toBe(false);
    });
});

describe('parseInsomnia', () => {
    it('extracts workspace name', () => {
        const json = {
            _type: 'export',
            __export_format: 4,
            resources: [{ _id: 'wrk_1', _type: 'workspace', name: 'My API' }],
        };
        const result = parseInsomnia(json);
        expect(result.name).toBe('My API');
    });

    it('extracts requests from workspace', () => {
        const json = {
            _type: 'export',
            __export_format: 4,
            resources: [
                { _id: 'wrk_1', _type: 'workspace', name: 'My API' },
                {
                    _id: 'req_1',
                    _type: 'request',
                    parentId: 'wrk_1',
                    name: 'Get Users',
                    method: 'GET',
                    url: 'https://api.example.com/users',
                    body: {},
                    headers: [],
                },
            ],
        };
        const result = parseInsomnia(json);
        expect(result.requests).toHaveLength(1);
        expect(result.requests[0].name).toBe('Get Users');
        expect(result.requests[0].method).toBe('GET');
        expect(result.requests[0].url).toBe('https://api.example.com/users');
    });

    it('falls back to flat list when no workspace found', () => {
        const json = {
            _type: 'export',
            resources: [
                {
                    _id: 'req_1',
                    _type: 'request',
                    name: 'Standalone',
                    method: 'DELETE',
                    url: 'https://example.com/x',
                    body: {},
                    headers: [],
                },
            ],
        };
        const result = parseInsomnia(json);
        expect(result.requests).toHaveLength(1);
        expect(result.requests[0].name).toBe('Standalone');
    });
});
