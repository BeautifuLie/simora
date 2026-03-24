import { load as yamlLoad } from 'js-yaml';
import type { Request, Folder } from '@/store/app';

export interface ImportResult {
    name: string;
    requests: Request[];
    folders: Folder[];
}

export function parsePostman(json: any): ImportResult {
    const name = json.info?.name ?? 'Imported';

    function parseItem(item: any): { requests: Request[]; folders: Folder[] } {
        const requests: Request[] = [];
        const folders: Folder[] = [];
        for (const it of item ?? []) {
            if (it.item) {
                const children = parseItem(it.item);
                folders.push({
                    id: crypto.randomUUID(),
                    name: it.name ?? 'Folder',
                    requests: children.requests,
                    folders: children.folders,
                } as any);
            } else {
                const rawUrl =
                    typeof it.request?.url === 'string'
                        ? it.request.url
                        : (it.request?.url?.raw ?? '');
                const headers = (it.request?.header ?? []).map((h: any) => ({
                    key: h.key,
                    value: h.value,
                    enabled: !h.disabled,
                }));
                requests.push({
                    id: crypto.randomUUID(),
                    name: it.name ?? 'Request',
                    method: it.request?.method ?? 'GET',
                    url: rawUrl,
                    body: it.request?.body?.raw ?? '',
                    headers,
                } as any);
            }
        }
        return { requests, folders };
    }

    const { requests, folders } = parseItem(json.item);
    return { name, requests, folders };
}

export function parseInsomnia(json: any): ImportResult {
    const resources: any[] = json.resources ?? [];
    const workspace =
        resources.find((r: any) => r._type === 'workspace') ??
        resources.find(
            (r: any) =>
                r._type === 'request_group' && (!r.parentId || r.parentId.startsWith('wrk_'))
        );
    const name = workspace?.name ?? 'Imported';
    const rootId = workspace?._id;

    function buildFolder(parentId: string): Folder {
        const childGroups = resources.filter(
            (r: any) => r._type === 'request_group' && r.parentId === parentId
        );
        const childReqs = resources.filter(
            (r: any) => r._type === 'request' && r.parentId === parentId
        );
        return {
            id: parentId,
            name: resources.find((r: any) => r._id === parentId)?.name ?? 'Folder',
            requests: childReqs.map(
                (r: any) =>
                    ({
                        id: crypto.randomUUID(),
                        name: r.name ?? 'Request',
                        method: r.method ?? 'GET',
                        url: r.url ?? '',
                        body: r.body?.text ?? '',
                        headers: (r.headers ?? []).map((h: any) => ({
                            key: h.name,
                            value: h.value,
                            enabled: !h.disabled,
                        })),
                    }) as any
            ),
            folders: childGroups.map((g: any) => buildFolder(g._id)),
        } as any;
    }

    if (rootId) {
        const folder = buildFolder(rootId);
        return { name, requests: folder.requests, folders: folder.folders };
    }

    const requests = resources
        .filter((r: any) => r._type === 'request')
        .map(
            (r: any) =>
                ({
                    id: crypto.randomUUID(),
                    name: r.name,
                    method: r.method ?? 'GET',
                    url: r.url ?? '',
                    body: r.body?.text ?? '',
                    headers: (r.headers ?? []).map((h: any) => ({
                        key: h.name,
                        value: h.value,
                        enabled: !h.disabled,
                    })),
                }) as any
        );
    return { name, requests, folders: [] };
}

export function parseInsomniaV5(json: any): ImportResult {
    const name = json.name ?? 'Imported';

    function parseChildren(children: any[]): { requests: Request[]; folders: Folder[] } {
        const requests: Request[] = [];
        const folders: Folder[] = [];
        for (const child of children ?? []) {
            const isFolder =
                child.type === 'request_group' ||
                (typeof child.type === 'string' && child.type.startsWith('request_group')) ||
                Array.isArray(child.children) ||
                Array.isArray(child.items);
            if (isFolder) {
                const nested = child.children ?? child.items ?? [];
                const inner = parseChildren(nested);
                folders.push({
                    id: crypto.randomUUID(),
                    name: child.name ?? 'Folder',
                    requests: inner.requests,
                    folders: inner.folders,
                } as any);
            } else {
                const url = child.url ?? child.data?.url ?? '';
                if (!url && child.type && !child.type.startsWith('request')) continue;
                requests.push({
                    id: crypto.randomUUID(),
                    name: child.name ?? 'Request',
                    method: child.method ?? child.data?.method ?? 'GET',
                    url,
                    body: child.body?.text ?? child.body?.raw ?? child.data?.body?.text ?? '',
                    headers: (child.headers ?? child.data?.headers ?? []).map((h: any) => ({
                        key: h.name ?? h.key,
                        value: h.value,
                        enabled: !h.disabled,
                    })),
                } as any);
            }
        }
        return { requests, folders };
    }

    const items = json.children ?? json.collection ?? [];
    const { requests, folders } = parseChildren(items);
    return { name, requests, folders };
}

export function parseCollection(text: string): ImportResult | null {
    let json: unknown;
    try {
        json = JSON.parse(text);
    } catch {
        try {
            json = yamlLoad(text);
        } catch {
            return null;
        }
    }

    if (json === null || typeof json !== 'object' || Array.isArray(json)) return null;
    const j = json as Record<string, unknown>;

    if ((j.info as any)?.schema?.includes?.('getpostman.com')) return parsePostman(j);
    if (j.item && !j._type) return parsePostman(j);

    if (j._type === 'export' && j.__export_format == 4) return parseInsomnia(j);

    if (j._type === 'export' && Array.isArray(j.resources)) return parseInsomnia(j);

    if (
        (typeof j.type === 'string' && j.type.startsWith('collection')) ||
        (j.name && (Array.isArray(j.children) || Array.isArray(j.collection)))
    )
        return parseInsomniaV5(j);

    return null;
}
