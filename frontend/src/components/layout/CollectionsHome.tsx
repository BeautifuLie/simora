import React from 'react';
import { createPortal } from 'react-dom';
import {
    Plus,
    MoreHorizontal,
    Pencil,
    Trash2,
    FolderOpen,
    Upload,
    Download,
    Copy,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore, type Collection, type Request, type Folder } from '@/store/app';
import { parseCollection } from '@/lib/importParsers';

// ── Utilities ──────────────────────────────────────────────────────────────

type CtxIcon = React.FC<{ style?: React.CSSProperties }>;

interface CtxItem {
    label: string;
    action: () => void;
    icon?: CtxIcon;
    shortcut?: string;
    danger?: boolean;
    divider?: boolean;
}

function useContextMenu() {
    const [pos, setPos] = React.useState<{ x: number; y: number } | null>(null);
    const open = React.useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setPos({ x: e.clientX, y: e.clientY });
    }, []);
    const close = React.useCallback(() => setPos(null), []);
    return { pos, open, close };
}

function ContextMenu({
    pos,
    items,
    onClose,
}: {
    pos: { x: number; y: number };
    items: CtxItem[];
    onClose: () => void;
}) {
    const ref = React.useRef<HTMLDivElement>(null);
    const [resolved, setResolved] = React.useState<{ x: number; y: number } | null>(null);

    React.useEffect(() => {
        const h = (e: Event) => {
            if (e.type === 'mousedown' || (e as KeyboardEvent).key === 'Escape') onClose();
        };
        document.addEventListener('mousedown', h);
        document.addEventListener('keydown', h);
        return () => {
            document.removeEventListener('mousedown', h);
            document.removeEventListener('keydown', h);
        };
    }, [onClose]);

    // Measure after first render and clamp to viewport
    React.useLayoutEffect(() => {
        if (!ref.current) return;
        const { width, height } = ref.current.getBoundingClientRect();
        const MARGIN = 8;
        const x = Math.min(pos.x, window.innerWidth - width - MARGIN);
        const y = Math.min(pos.y, window.innerHeight - height - MARGIN);
        setResolved({ x: Math.max(MARGIN, x), y: Math.max(MARGIN, y) });
    }, [pos.x, pos.y]);

    return createPortal(
        <div
            ref={ref}
            className="fixed z-[500] animate-context-in"
            style={{
                top: resolved ? resolved.y : pos.y,
                left: resolved ? resolved.x : pos.x,
                visibility: resolved ? 'visible' : 'hidden',
                background: 'var(--bg-3)',
                border: '1px solid var(--border-2)',
                borderRadius: 'var(--r-lg)',
                boxShadow: '0 16px 48px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.25)',
                minWidth: 192,
                padding: '4px',
                overflow: 'hidden',
            }}
            onMouseDown={e => e.stopPropagation()}
        >
            {items.map((item, i) =>
                item.divider ? (
                    <div
                        key={i}
                        style={{ height: 1, background: 'var(--border-1)', margin: '3px 4px' }}
                    />
                ) : (
                    <button
                        key={i}
                        className={cn(
                            'flex items-center gap-2.5 w-full cursor-pointer transition-colors text-left',
                            item.danger
                                ? 'text-[var(--red)] hover:bg-[rgba(248,113,113,0.1)]'
                                : 'text-[var(--text-1)] hover:bg-[var(--bg-4)] hover:text-[var(--text-0)]'
                        )}
                        style={{ height: 34, padding: '0 10px', borderRadius: 'var(--r-sm)' }}
                        onClick={() => {
                            item.action();
                            onClose();
                        }}
                    >
                        <div
                            style={{
                                width: 16,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                opacity: item.danger ? 0.85 : 0.6,
                            }}
                        >
                            {item.icon && <item.icon style={{ width: 13, height: 13 }} />}
                        </div>
                        <span
                            className="flex-1"
                            style={{ fontSize: 12.5, letterSpacing: '-0.01em' }}
                        >
                            {item.label}
                        </span>
                        {item.shortcut && (
                            <span
                                style={{
                                    fontSize: 10.5,
                                    color: 'var(--text-2)',
                                    fontFamily: 'monospace',
                                    letterSpacing: '0.02em',
                                    paddingLeft: 12,
                                }}
                            >
                                {item.shortcut}
                            </span>
                        )}
                    </button>
                )
            )}
        </div>,
        document.body
    );
}

function InlineRename({
    value,
    onCommit,
    onCancel,
}: {
    value: string;
    onCommit: (_v: string) => void;
    onCancel: () => void;
}) {
    const [v, setV] = React.useState(value);
    const ref = React.useRef<HTMLInputElement>(null);
    React.useEffect(() => {
        ref.current?.focus();
        ref.current?.select();
    }, []);
    return (
        <input
            ref={ref}
            className="flex-1 bg-transparent outline-none min-w-0"
            style={{ fontSize: 'inherit', color: 'var(--text-0)' }}
            value={v}
            onChange={e => setV(e.target.value)}
            onKeyDown={e => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (v.trim()) onCommit(v.trim());
                }
                if (e.key === 'Escape') {
                    e.preventDefault();
                    onCancel();
                }
            }}
            onBlur={() => {
                if (v.trim()) onCommit(v.trim());
                else onCancel();
            }}
            onClick={e => e.stopPropagation()}
        />
    );
}

// ── Card accent colors ─────────────────────────────────────────────────────

const CARD_ACCENTS = [
    '#7c9cf0',
    '#c084fc',
    '#fb923c',
    '#4ade80',
    '#fbbf24',
    '#f87171',
    '#34d399',
    '#f472b6',
];
function cardAccent(idx: number) {
    return CARD_ACCENTS[idx % CARD_ACCENTS.length];
}

// ── Export: Collection → Postman v2.1 JSON ─────────────────────────────────

function requestToPostman(req: Request): object {
    return {
        name: req.name,
        request: {
            method: req.method ?? 'GET',
            url: { raw: req.url ?? '', host: [req.url ?? ''], path: [] },
            header: (req.headers ?? [])
                .filter((h: any) => h.enabled)
                .map((h: any) => ({ key: h.key, value: h.value })),
            body: req.body
                ? { mode: 'raw', raw: req.body, options: { raw: { language: 'json' } } }
                : undefined,
        },
    };
}

function folderToPostman(folder: Folder): object {
    return {
        name: folder.name,
        item: [
            ...(folder.requests ?? []).map(requestToPostman),
            ...(folder.folders ?? []).map(folderToPostman),
        ],
    };
}

function exportCollectionToPostman(col: Collection): string {
    const postman = {
        info: {
            name: col.name,
            _postman_id: col.id,
            schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
        },
        item: [
            ...(col.requests ?? []).map(requestToPostman),
            ...(col.folders ?? []).map(folderToPostman),
        ],
    };
    return JSON.stringify(postman, null, 2);
}

function downloadJson(content: string, filename: string) {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// ── Collection tile ────────────────────────────────────────────────────────

function CollectionTile({
    col,
    accent,
    onOpen,
    autoRename,
    onRenameEnd,
}: {
    col: Collection;
    accent: string;
    onOpen: () => void;
    autoRename?: boolean;
    onRenameEnd?: () => void;
}) {
    const {
        renameCollection,
        deleteCollection,
        activeOrgId,
        activeProjectId,
        organizations,
        importCollection,
    } = useAppStore();
    const [renaming, setRenaming] = React.useState(false);

    React.useEffect(() => {
        if (autoRename) setRenaming(true);
    }, [autoRename]);

    function duplicateCollection(source: Collection) {
        const orgId = activeOrgId ?? organizations[0]?.id ?? '';
        const projectId = activeProjectId ?? organizations[0]?.projects?.[0]?.id ?? '';
        if (!orgId || !projectId) return;
        const newCol = {
            id: crypto.randomUUID(),
            name: source.name + ' (copy)',
            requests: (source.requests ?? []).map(r => ({ ...r, id: crypto.randomUUID() })),
            folders: (source.folders ?? []).map(function deepCopyFolder(f: Folder): Folder {
                return {
                    ...f,
                    id: crypto.randomUUID(),
                    requests: (f.requests ?? []).map(r => ({ ...r, id: crypto.randomUUID() })),
                    folders: (f.folders ?? []).map(deepCopyFolder),
                } as any;
            }),
        } as any;
        importCollection(orgId, projectId, newCol);
    }
    const { pos, open: openCtx, close: closeCtx } = useContextMenu();

    const totalRequests =
        (col.requests?.length ?? 0) +
        (col.folders ?? []).reduce((sum, f) => sum + (f.requests?.length ?? 0), 0);

    const ctxItems: CtxItem[] = [
        { label: 'Open', icon: ({ style }) => <FolderOpen style={style} />, action: onOpen },
        {
            label: 'Rename',
            icon: ({ style }) => <Pencil style={style} />,
            action: () => setRenaming(true),
            shortcut: 'F2',
        },
        {
            label: 'Duplicate',
            icon: ({ style }) => <Copy style={style} />,
            action: () => duplicateCollection(col),
        },
        {
            label: 'Export',
            icon: ({ style }) => <Download style={style} />,
            action: () =>
                downloadJson(exportCollectionToPostman(col), `${col.name}.postman_collection.json`),
        },
        { label: 'divider' as any, action: () => {}, divider: true },
        {
            label: 'Delete',
            icon: ({ style }) => <Trash2 style={style} />,
            action: () => deleteCollection(col.id),
            danger: true,
        },
    ];

    return (
        <div
            className="group relative flex flex-col cursor-pointer overflow-hidden animate-card-in"
            style={{
                height: 168,
                background: 'var(--bg-2)',
                border: '1px solid var(--border-1)',
                borderRadius: 'var(--r-lg)',
                userSelect: 'none',
                transition: 'box-shadow 150ms, border-color 150ms',
            }}
            onMouseEnter={e => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.boxShadow = `0 8px 24px rgba(0,0,0,0.35), 0 0 0 1px ${accent}55`;
                el.style.borderColor = `${accent}55`;
            }}
            onMouseLeave={e => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.boxShadow = '';
                el.style.borderColor = 'var(--border-1)';
            }}
            onClick={onOpen}
            onContextMenu={openCtx}
        >
            {/* Coloured header band */}
            <div
                style={{
                    height: 56,
                    background: `linear-gradient(135deg, ${accent}28 0%, ${accent}10 100%)`,
                    borderBottom: `1px solid ${accent}22`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 14px',
                    flexShrink: 0,
                }}
            >
                {/* Initial avatar */}
                <div
                    style={{
                        width: 32,
                        height: 32,
                        borderRadius: 'var(--r-md)',
                        background: `${accent}25`,
                        border: `1.5px solid ${accent}40`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 14,
                        fontWeight: 700,
                        color: accent,
                        letterSpacing: '-0.02em',
                    }}
                >
                    {col.name[0]?.toUpperCase()}
                </div>

                {/* Three-dot menu */}
                {!renaming && (
                    <button
                        className="shrink-0 flex items-center justify-center rounded cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{
                            width: 24,
                            height: 24,
                            color: 'var(--text-2)',
                            background: 'transparent',
                            transition: 'background 100ms, color 100ms, opacity 150ms',
                        }}
                        onMouseEnter={e => {
                            (e.currentTarget as HTMLButtonElement).style.background =
                                'rgba(255,255,255,0.08)';
                            (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-1)';
                        }}
                        onMouseLeave={e => {
                            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                            (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-2)';
                        }}
                        onClick={e => {
                            e.stopPropagation();
                            openCtx(e);
                        }}
                    >
                        <MoreHorizontal style={{ width: 14, height: 14 }} />
                    </button>
                )}
            </div>

            {/* Body */}
            <div
                style={{
                    padding: '12px 14px',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                }}
            >
                {/* Name */}
                {renaming ? (
                    <InlineRename
                        value={col.name}
                        onCommit={name => {
                            renameCollection(col.id, name);
                            setRenaming(false);
                            onRenameEnd?.();
                        }}
                        onCancel={() => {
                            setRenaming(false);
                            onRenameEnd?.();
                        }}
                    />
                ) : (
                    <span
                        style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: 'var(--text-0)',
                            letterSpacing: '-0.02em',
                            lineHeight: 1.3,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                        }}
                    >
                        {col.name}
                    </span>
                )}

                {/* Request count */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div
                        style={{
                            width: 5,
                            height: 5,
                            borderRadius: '50%',
                            background: accent,
                            flexShrink: 0,
                        }}
                    />
                    <span style={{ fontSize: 11, color: 'var(--text-2)' }}>
                        {totalRequests} {totalRequests === 1 ? 'request' : 'requests'}
                    </span>
                </div>
            </div>

            {pos && <ContextMenu pos={pos} items={ctxItems} onClose={closeCtx} />}
        </div>
    );
}

// ── Empty state ────────────────────────────────────────────────────────────

const EMPTY_CARDS = [
    {
        accent: '#7c9cf0',
        icon: '⚡',
        title: 'New collection',
        sub: 'Group requests by feature or service',
        action: 'new',
    },
    {
        accent: '#c084fc',
        icon: '📥',
        title: 'Import Postman',
        sub: 'Bring in existing v2.1 collections',
        action: 'import',
    },
    {
        accent: '#4ade80',
        icon: '🔀',
        title: 'Import Insomnia',
        sub: 'Works with Insomnia v4 and v5 formats',
        action: 'import',
    },
];

function EmptyCollections({ onNew, onImport }: { onNew: () => void; onImport: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center h-full gap-8">
            {/* Header */}
            <div className="flex flex-col items-center gap-2">
                <div
                    style={{
                        width: 52,
                        height: 52,
                        borderRadius: 'var(--r-lg)',
                        background: 'linear-gradient(135deg, #7c9cf028 0%, #c084fc28 100%)',
                        border: '1.5px solid #7c9cf030',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 22,
                    }}
                >
                    ◫
                </div>
                <div className="flex flex-col items-center gap-1">
                    <span
                        style={{
                            fontSize: 15,
                            fontWeight: 700,
                            color: 'var(--text-0)',
                            letterSpacing: '-0.03em',
                        }}
                    >
                        No collections yet
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-2)' }}>
                        Create a collection or import from Postman / Insomnia
                    </span>
                </div>
            </div>

            {/* Action cards */}
            <div className="flex items-stretch gap-3" style={{ maxWidth: 560, width: '100%' }}>
                {EMPTY_CARDS.map(({ accent, icon, title, sub, action }) => (
                    <button
                        key={title}
                        onClick={action === 'new' ? onNew : onImport}
                        className="group flex-1 flex flex-col gap-3 cursor-pointer text-left transition-all duration-150"
                        style={{
                            background: `linear-gradient(135deg, ${accent}12 0%, ${accent}06 100%)`,
                            border: `1.5px solid ${accent}25`,
                            borderRadius: 'var(--r-lg)',
                            padding: '16px 16px 14px',
                        }}
                        onMouseEnter={e => {
                            const el = e.currentTarget;
                            el.style.background = `linear-gradient(135deg, ${accent}22 0%, ${accent}10 100%)`;
                            el.style.borderColor = `${accent}55`;
                            el.style.boxShadow = `0 8px 24px ${accent}20`;
                            el.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={e => {
                            const el = e.currentTarget;
                            el.style.background = `linear-gradient(135deg, ${accent}12 0%, ${accent}06 100%)`;
                            el.style.borderColor = `${accent}25`;
                            el.style.boxShadow = '';
                            el.style.transform = '';
                        }}
                    >
                        {/* Icon */}
                        <div
                            style={{
                                width: 32,
                                height: 32,
                                borderRadius: 'var(--r-md)',
                                background: `${accent}20`,
                                border: `1.5px solid ${accent}35`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 15,
                            }}
                        >
                            {icon}
                        </div>

                        {/* Text */}
                        <div className="flex flex-col gap-0.5">
                            <span
                                style={{
                                    fontSize: 12.5,
                                    fontWeight: 700,
                                    color: 'var(--text-0)',
                                    letterSpacing: '-0.02em',
                                }}
                            >
                                {title}
                            </span>
                            <span style={{ fontSize: 11, color: 'var(--text-2)', lineHeight: 1.4 }}>
                                {sub}
                            </span>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}

// ── CollectionsHome ────────────────────────────────────────────────────────

export function CollectionsHome() {
    const {
        organizations,
        activeOrgId,
        activeProjectId,
        createCollection,
        setActiveCollection,
        importCollection,
    } = useAppStore();
    const importInputRef = React.useRef<HTMLInputElement>(null);
    const [newColId, setNewColId] = React.useState<string | null>(null);

    const org = organizations.find(o => o.id === activeOrgId) ?? organizations[0];
    const project = org?.projects?.find(p => p.id === activeProjectId) ?? org?.projects?.[0];

    async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        // Reset so same file can be re-imported
        e.target.value = '';
        const text = await file.text();
        const result = parseCollection(text);
        if (!result) {
            alert('Unsupported format. Supported: Postman v2.1, Insomnia v4 and v5 (JSON).');
            return;
        }
        const orgId = org?.id ?? '';
        const projectId = project?.id ?? '';
        if (!orgId || !projectId) return;
        const newCol = {
            id: crypto.randomUUID(),
            name: result.name,
            requests: result.requests,
            folders: result.folders,
        } as any;
        importCollection(orgId, projectId, newCol);
    }

    if (!org || !project) {
        return (
            <div
                className="flex items-center justify-center h-full"
                style={{ background: 'var(--bg-1)', color: 'var(--text-2)' }}
            >
                <span style={{ fontSize: 12 }}>Select a project</span>
            </div>
        );
    }

    const collections = project.collections ?? [];

    return (
        <div className="flex flex-col h-full" style={{ background: 'var(--bg-1)' }}>
            {/* Toolbar */}
            <div
                className="flex items-center px-6 shrink-0 gap-4"
                style={{
                    height: 'var(--toolbar-height)',
                    borderBottom: '1px solid var(--border-0)',
                }}
            >
                <div className="flex-1" />

                {/* Import button */}
                <button
                    className="flex items-center gap-1.5 cursor-pointer rounded-[var(--r-sm)] transition-all duration-150"
                    style={{
                        padding: '0 12px',
                        height: 28,
                        fontSize: 12,
                        fontWeight: 500,
                        color: 'var(--text-1)',
                        border: '1px solid var(--border-1)',
                        background: 'var(--bg-2)',
                    }}
                    onMouseEnter={e => {
                        const el = e.currentTarget;
                        el.style.background = 'var(--bg-3)';
                        el.style.color = 'var(--text-0)';
                        el.style.borderColor = 'var(--border-2)';
                    }}
                    onMouseLeave={e => {
                        const el = e.currentTarget;
                        el.style.background = 'var(--bg-2)';
                        el.style.color = 'var(--text-1)';
                        el.style.borderColor = 'var(--border-1)';
                    }}
                    onClick={() => importInputRef.current?.click()}
                >
                    <Upload style={{ width: 11, height: 11 }} />
                    Import
                </button>
                <input
                    ref={importInputRef}
                    type="file"
                    accept=".json,.yaml,.yml"
                    style={{ display: 'none' }}
                    onChange={handleImportFile}
                />

                {/* New collection button */}
                <button
                    className="flex items-center gap-1.5 cursor-pointer rounded-[var(--r-sm)] transition-all duration-150"
                    style={{
                        padding: '0 12px',
                        marginRight: 16,
                        height: 28,
                        fontSize: 12,
                        fontWeight: 500,
                        color: 'var(--accent)',
                        border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)',
                        background: 'var(--accent-dim)',
                    }}
                    onMouseEnter={e => {
                        const el = e.currentTarget;
                        el.style.background = 'var(--accent)';
                        el.style.color = 'white';
                        el.style.borderColor = 'var(--accent)';
                    }}
                    onMouseLeave={e => {
                        const el = e.currentTarget;
                        el.style.background = 'var(--accent-dim)';
                        el.style.color = 'var(--accent)';
                        el.style.borderColor = 'color-mix(in srgb, var(--accent) 30%, transparent)';
                    }}
                    onClick={() => {
                        const id = createCollection(org.id, project.id, 'New Collection');
                        setNewColId(id);
                    }}
                >
                    <Plus style={{ width: 11, height: 11 }} />
                    New collection
                </button>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto" style={{ padding: '24px 28px' }}>
                {collections.length === 0 ? (
                    <EmptyCollections
                        onNew={() => {
                            const id = createCollection(org.id, project.id, 'New Collection');
                            setNewColId(id);
                        }}
                        onImport={() => importInputRef.current?.click()}
                    />
                ) : (
                    <div
                        className="grid gap-3"
                        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}
                    >
                        {collections.map((col, i) => (
                            <CollectionTile
                                key={col.id}
                                col={col}
                                accent={cardAccent(i)}
                                onOpen={() => setActiveCollection(col.id)}
                                autoRename={col.id === newColId}
                                onRenameEnd={() => setNewColId(null)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
