import React from 'react';
import { createPortal } from 'react-dom';
import {
    Plus,
    Settings,
    MoreHorizontal,
    RefreshCw,
    ChevronsUpDown,
    Check,
    Search,
    Folder,
    FolderOpen,
    ChevronRight,
    ArrowLeft,
    Globe,
    Layers,
    Rss,
    Wifi,
    Pencil,
    Trash2,
    Copy,
    Braces,
    X,
} from 'lucide-react';
import { cn, shortcut } from '@/lib/utils';
import {
    useAppStore,
    type Organization,
    type Project,
    type Collection,
    type Request,
    type Protocol,
    type EnvVariable,
    selectActivePath,
} from '@/store/app';
import { MethodBadge } from '@/components/ui/badge';

// ── Drag payload ────────────────────────────────────────────────────────────
const DND_REQ_KEY = 'simora/req';
const DND_FOLDER_KEY = 'simora/folder';

interface RequestDragPayload {
    requestId: string;
    fromCollectionId: string;
    fromFolderId: string | null;
}

interface FolderDragPayload {
    folderId: string;
    collectionId: string;
}

function encodeReqDrag(p: RequestDragPayload) {
    return JSON.stringify(p);
}

function decodeReqDrag(s: string): RequestDragPayload | null {
    try {
        return JSON.parse(s);
    } catch {
        return null;
    }
}

function encodeFolderDrag(p: FolderDragPayload) {
    return JSON.stringify(p);
}

function decodeFolderDrag(s: string): FolderDragPayload | null {
    try {
        return JSON.parse(s);
    } catch {
        return null;
    }
}

// Keep backward-compat aliases used in older drop handlers
const DND_KEY = DND_REQ_KEY;
const decodeDrag = decodeReqDrag;

// ── Inline rename ──────────────────────────────────────────────────────────

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

// ── Context menu ───────────────────────────────────────────────────────────

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
            onClick={e => e.stopPropagation()}
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
                        {/* Icon slot — always takes space for alignment */}
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

// ── Workspace avatar ────────────────────────────────────────────────────────

const WORKSPACE_GRADIENTS = [
    'linear-gradient(135deg, #7c9cf0, #c084fc)',
    'linear-gradient(135deg, #4ade80, #60a5fa)',
    'linear-gradient(135deg, #fb923c, #f87171)',
    'linear-gradient(135deg, #fbbf24, #4ade80)',
];
function workspaceGradient(name: string) {
    return WORKSPACE_GRADIENTS[name.charCodeAt(0) % WORKSPACE_GRADIENTS.length];
}

// ── Workspace switcher ─────────────────────────────────────────────────────

// ── Workspace name dialog ─────────────────────────────────────────────────

function WorkspaceDialog({
    initial,
    title,
    onConfirm,
    onCancel,
}: {
    initial: string;
    title: string;
    onConfirm: (_name: string) => void;
    onCancel: () => void;
}) {
    const MAX_LEN = 80;
    const [name, setName] = React.useState(initial);
    const inputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
    }, []);

    const trimmed = name.trim();
    const isValid = trimmed.length > 0 && trimmed.length <= MAX_LEN;
    const commit = () => {
        if (isValid) onConfirm(trimmed);
    };

    return createPortal(
        <>
            <div
                className="fixed inset-0 z-[300]"
                style={{ background: 'rgba(0,0,0,0.45)' }}
                onClick={onCancel}
            />
            <div
                className="fixed z-[301] animate-context-in"
                style={{
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%,-50%)',
                    width: 320,
                    background: 'var(--bg-2)',
                    border: '1px solid var(--border-2)',
                    borderRadius: 'var(--r-lg)',
                    boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
                    padding: 20,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 14,
                }}
                onClick={e => e.stopPropagation()}
            >
                <span
                    style={{
                        fontSize: 13.5,
                        fontWeight: 700,
                        color: 'var(--text-0)',
                        letterSpacing: '-0.02em',
                    }}
                >
                    {title}
                </span>
                <div className="flex flex-col gap-1">
                    <input
                        ref={inputRef}
                        value={name}
                        onChange={e => setName(e.target.value.slice(0, MAX_LEN))}
                        onKeyDown={e => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                commit();
                            }
                            if (e.key === 'Escape') {
                                e.preventDefault();
                                onCancel();
                            }
                        }}
                        placeholder="Workspace name…"
                        className="w-full outline-none rounded-[var(--r-sm)]"
                        style={{
                            height: 36,
                            padding: '0 12px',
                            background: 'var(--bg-3)',
                            border: `1px solid ${name.length >= MAX_LEN ? 'var(--red)' : 'var(--border-2)'}`,
                            fontSize: 13,
                            color: 'var(--text-0)',
                        }}
                        spellCheck={false}
                    />
                    {name.length >= MAX_LEN && (
                        <span style={{ fontSize: 10.5, color: 'var(--red)' }}>
                            Max {MAX_LEN} characters
                        </span>
                    )}
                </div>
                <div className="flex items-center justify-end gap-2">
                    <button
                        className="rounded-[var(--r-sm)] cursor-pointer transition-colors hover:bg-[var(--bg-3)]"
                        style={{
                            height: 30,
                            padding: '0 14px',
                            fontSize: 12,
                            color: 'var(--text-2)',
                        }}
                        onClick={onCancel}
                    >
                        Cancel
                    </button>
                    <button
                        className="rounded-[var(--r-sm)] cursor-pointer transition-all hover:brightness-110 disabled:opacity-40"
                        style={{
                            height: 30,
                            padding: '0 14px',
                            fontSize: 12,
                            fontWeight: 600,
                            background: 'var(--accent)',
                            color: '#fff',
                        }}
                        disabled={!isValid}
                        onClick={commit}
                    >
                        {initial ? 'Rename' : 'Create'}
                    </button>
                </div>
            </div>
        </>,
        document.body
    );
}

// ── Workspace switcher ────────────────────────────────────────────────────

function WorkspaceSwitcher({
    organizations,
    activeOrgId,
    onSelect,
    onCreate,
}: {
    organizations: Organization[];
    activeOrgId: string | null;
    onSelect: (_id: string) => void;
    onCreate: (_name: string) => void;
}) {
    const { renameOrganization, deleteOrganization } = useAppStore();
    const [open, setOpen] = React.useState(false);
    const [showCreate, setShowCreate] = React.useState(false);
    const [renamingId, setRenamingId] = React.useState<string | null>(null);
    const ref = React.useRef<HTMLDivElement>(null);
    const active = organizations.find(o => o.id === activeOrgId) ?? organizations[0];

    const renamingOrg = renamingId ? organizations.find(o => o.id === renamingId) : null;

    return (
        <div ref={ref} className="relative w-full">
            <div className="flex items-center gap-1 w-full">
                <button
                    className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer transition-colors duration-100 rounded-[var(--r-md)] hover:bg-[var(--bg-3)]"
                    style={{ height: 36 }}
                    onClick={() => setOpen(v => !v)}
                >
                    <div
                        className="flex items-center justify-center shrink-0 rounded-[var(--r-sm)]"
                        style={{
                            width: 22,
                            height: 22,
                            background: active?.name
                                ? workspaceGradient(active.name)
                                : 'var(--bg-3)',
                            fontSize: 11,
                            fontWeight: 700,
                            color: 'rgba(255,255,255,0.9)',
                        }}
                    >
                        {active?.name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <span
                        className="flex-1 text-left font-semibold truncate"
                        style={{ fontSize: 12.5, color: 'var(--text-0)', letterSpacing: '-0.01em' }}
                    >
                        {active?.name ?? 'No workspace'}
                    </span>
                    <ChevronsUpDown
                        style={{ width: 12, height: 12, color: 'var(--text-2)', flexShrink: 0 }}
                    />
                </button>
                {active && (
                    <button
                        className="flex items-center justify-center shrink-0 rounded-[var(--r-sm)] cursor-pointer transition-all duration-100 hover:bg-[var(--bg-3)] hover:text-[var(--text-1)]"
                        style={{ width: 22, height: 22, color: 'var(--text-2)' }}
                        title="Rename workspace"
                        onClick={() => {
                            setRenamingId(active.id);
                            setOpen(false);
                        }}
                    >
                        <Pencil style={{ width: 11, height: 11 }} />
                    </button>
                )}
            </div>

            {open &&
                createPortal(
                    <>
                        <div className="fixed inset-0 z-[199]" onClick={() => setOpen(false)} />
                        <div
                            className="fixed z-[200] overflow-hidden animate-context-in"
                            style={{
                                top: (ref.current?.getBoundingClientRect().bottom ?? 0) + 6,
                                left: ref.current?.getBoundingClientRect().left ?? 0,
                                minWidth: 220,
                                width: ref.current?.getBoundingClientRect().width ?? 220,
                                background: 'var(--bg-3)',
                                border: '1px solid var(--border-2)',
                                borderRadius: 'var(--r-md)',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                                padding: 4,
                            }}
                        >
                            {organizations.map(org => (
                                <div
                                    key={org.id}
                                    className="group flex items-center gap-2.5 rounded cursor-pointer transition-colors hover:bg-[var(--bg-4)]"
                                    style={{ padding: '6px 8px 6px 10px' }}
                                    onClick={() => {
                                        onSelect(org.id);
                                        setOpen(false);
                                    }}
                                    onContextMenu={e => e.preventDefault()}
                                >
                                    <div
                                        className="flex items-center justify-center shrink-0 rounded"
                                        style={{
                                            width: 18,
                                            height: 18,
                                            background: workspaceGradient(org.name),
                                            fontSize: 9,
                                            fontWeight: 700,
                                            color: 'rgba(255,255,255,0.9)',
                                        }}
                                    >
                                        {org.name[0]?.toUpperCase()}
                                    </div>
                                    <span
                                        className="flex-1 text-left truncate"
                                        style={{ fontSize: 12.5, color: 'var(--text-1)' }}
                                    >
                                        {org.name}
                                    </span>
                                    {org.id === active?.id && (
                                        <Check
                                            style={{
                                                width: 11,
                                                height: 11,
                                                color: 'var(--accent)',
                                                flexShrink: 0,
                                            }}
                                        />
                                    )}

                                    {/* Action buttons — always slightly visible, full on hover */}
                                    <div
                                        className="flex items-center gap-0.5 opacity-40 group-hover:opacity-100 transition-opacity"
                                        onClick={e => e.stopPropagation()}
                                    >
                                        <button
                                            title="Rename workspace"
                                            className="flex items-center justify-center rounded cursor-pointer transition-colors hover:bg-[var(--bg-0)] hover:text-[var(--text-0)]"
                                            style={{
                                                width: 20,
                                                height: 20,
                                                color: 'var(--text-2)',
                                            }}
                                            onClick={e => {
                                                e.stopPropagation();
                                                setRenamingId(org.id);
                                                setOpen(false);
                                            }}
                                        >
                                            <Pencil style={{ width: 10, height: 10 }} />
                                        </button>
                                        <button
                                            title="Delete workspace"
                                            className="flex items-center justify-center rounded cursor-pointer transition-colors hover:bg-[rgba(248,113,113,0.15)] hover:text-[var(--red)]"
                                            style={{
                                                width: 20,
                                                height: 20,
                                                color: 'var(--text-2)',
                                            }}
                                            onClick={e => {
                                                e.stopPropagation();
                                                if (
                                                    confirm(
                                                        `Delete workspace "${org.name}"? This will permanently remove all projects and collections inside.`
                                                    )
                                                ) {
                                                    deleteOrganization(org.id);
                                                }
                                                setOpen(false);
                                            }}
                                        >
                                            <Trash2 style={{ width: 10, height: 10 }} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {organizations.length > 0 && (
                                <div
                                    style={{
                                        height: 1,
                                        background: 'var(--border-1)',
                                        margin: '3px 0',
                                    }}
                                />
                            )}
                            <button
                                className="flex items-center gap-2.5 w-full rounded cursor-pointer transition-colors hover:bg-[var(--bg-4)]"
                                style={{ padding: '7px 10px' }}
                                onClick={() => {
                                    setShowCreate(true);
                                    setOpen(false);
                                }}
                            >
                                <div
                                    className="flex items-center justify-center shrink-0 rounded"
                                    style={{
                                        width: 18,
                                        height: 18,
                                        background: 'var(--accent-dim)',
                                        border: '1px solid color-mix(in srgb, var(--accent) 35%, transparent)',
                                    }}
                                >
                                    <Plus style={{ width: 9, height: 9, color: 'var(--accent)' }} />
                                </div>
                                <span style={{ fontSize: 12.5, color: 'var(--text-1)' }}>
                                    New workspace…
                                </span>
                            </button>
                        </div>
                    </>,
                    document.body
                )}

            {showCreate && (
                <WorkspaceDialog
                    initial=""
                    title="New workspace"
                    onConfirm={name => {
                        onCreate(name);
                        setShowCreate(false);
                    }}
                    onCancel={() => setShowCreate(false)}
                />
            )}

            {renamingOrg && (
                <WorkspaceDialog
                    initial={renamingOrg.name}
                    title="Rename workspace"
                    onConfirm={name => {
                        renameOrganization(renamingOrg.id, name);
                        setRenamingId(null);
                    }}
                    onCancel={() => setRenamingId(null)}
                />
            )}
        </div>
    );
}

// ── Project row ────────────────────────────────────────────────────────────

function projectHue(name: string) {
    return [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
}

function ProjectRow({
    project,
    orgId,
    isActive,
    onSelect,
    isNew,
    onNewEnd,
}: {
    project: Project;
    orgId: string;
    isActive: boolean;
    onSelect: () => void;
    isNew?: boolean;
    onNewEnd?: () => void;
}) {
    const { renameProject, deleteProject } = useAppStore();
    const [renaming, setRenaming] = React.useState(false);
    const { pos, open: openCtx, close } = useContextMenu();
    const hue = projectHue(project.name);

    React.useEffect(() => {
        if (isNew) setRenaming(true);
    }, [isNew]);

    const ctxItems: CtxItem[] = [
        {
            label: 'Rename',
            icon: ({ style }) => <Pencil style={style} />,
            action: () => setRenaming(true),
            shortcut: 'F2',
        },
        { label: 'divider' as any, action: () => {}, divider: true },
        {
            label: 'Delete',
            icon: ({ style }) => <Trash2 style={style} />,
            action: () => deleteProject(orgId, project.id),
            danger: true,
        },
    ];

    return (
        <div className="relative mb-px" style={{ padding: '0 12px' }}>
            <button
                className={cn(
                    'group relative w-full flex items-center gap-2 cursor-pointer transition-all duration-100 text-left',
                    isActive
                        ? 'text-[var(--text-0)]'
                        : 'text-[var(--text-2)] hover:text-[var(--text-1)]'
                )}
                style={{
                    height: 30,
                    padding: '0 6px 0 8px',
                    borderRadius: 'var(--r-md)',
                    background: isActive ? 'var(--bg-2)' : 'transparent',
                }}
                onClick={() => !renaming && onSelect()}
                onDoubleClick={e => {
                    e.stopPropagation();
                    setRenaming(true);
                }}
                onKeyDown={e => {
                    if (e.key === 'F2') {
                        e.preventDefault();
                        setRenaming(true);
                    }
                }}
                onContextMenu={openCtx}
            >
                {/* Active left accent */}
                {isActive && (
                    <span
                        className="absolute rounded-full"
                        style={{
                            left: 2,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: 2,
                            height: 14,
                            background: 'var(--accent)',
                        }}
                    />
                )}

                {/* Initial badge */}
                <span
                    className="shrink-0 flex items-center justify-center rounded"
                    style={{
                        width: 18,
                        height: 18,
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: '0.03em',
                        borderRadius: 'var(--r-sm)',
                        color: isActive ? 'var(--accent)' : `hsl(${hue}, 55%, 58%)`,
                        background: isActive
                            ? 'color-mix(in srgb, var(--accent) 14%, transparent)'
                            : `hsl(${hue}, 45%, 13%)`,
                    }}
                >
                    {project.name[0]?.toUpperCase()}
                </span>

                {/* Name */}
                {renaming ? (
                    <InlineRename
                        value={project.name}
                        onCommit={name => {
                            renameProject(orgId, project.id, name);
                            setRenaming(false);
                            onNewEnd?.();
                        }}
                        onCancel={() => {
                            setRenaming(false);
                            onNewEnd?.();
                        }}
                    />
                ) : (
                    <span
                        className="flex-1 truncate"
                        style={{ fontSize: 12.5, fontWeight: isActive ? 500 : 400 }}
                    >
                        {project.name}
                    </span>
                )}

                {/* More button */}
                {!renaming && (
                    <button
                        className="shrink-0 flex items-center justify-center rounded opacity-40 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-[var(--bg-3)]"
                        style={{ width: 20, height: 20, color: 'var(--text-2)' }}
                        onClick={e => {
                            e.stopPropagation();
                            openCtx(e);
                        }}
                    >
                        <MoreHorizontal style={{ width: 12, height: 12 }} />
                    </button>
                )}
            </button>
            {pos && <ContextMenu pos={pos} items={ctxItems} onClose={close} />}
        </div>
    );
}

// ── Collection tree — request item ─────────────────────────────────────────

function RequestItem({
    req,
    collectionId,
    folderId,
    orgId,
    projectId,
    isNew,
    onNewEnd,
    selected,
    onToggleSelect,
    hasSelection,
}: {
    req: Request;
    collectionId: string;
    folderId?: string;
    orgId: string;
    projectId: string;
    isNew?: boolean;
    onNewEnd?: () => void;
    selected?: boolean;
    onToggleSelect?: (_id: string, _e: React.MouseEvent) => void;
    hasSelection?: boolean;
}) {
    const { openTab, renameRequest, deleteRequest, duplicateRequest, reorderRequest } =
        useAppStore();
    const activePath = useAppStore(selectActivePath);
    const isActive = activePath?.requestId === req.id;
    const isChained = useAppStore(s => req.name in s.chainCache);
    const [renaming, setRenaming] = React.useState(false);
    const [dragging, setDragging] = React.useState(false);
    const [dropIndicator, setDropIndicator] = React.useState<'before' | 'after' | null>(null);

    React.useEffect(() => {
        if (isNew) setRenaming(true);
    }, [isNew]);
    const { pos, open: openCtx, close: closeCtx } = useContextMenu();

    const ctxItems: CtxItem[] = [
        {
            label: 'Rename',
            icon: ({ style }) => <Pencil style={style} />,
            action: () => setRenaming(true),
            shortcut: 'F2',
        },
        {
            label: 'Duplicate',
            icon: ({ style }) => <Copy style={style} />,
            action: () => duplicateRequest(req.id),
        },
        { label: 'divider' as any, action: () => {}, divider: true },
        {
            label: 'Delete',
            icon: ({ style }) => <Trash2 style={style} />,
            action: () => deleteRequest(req.id),
            danger: true,
        },
    ];

    return (
        <div
            className={cn(
                'group relative w-full flex items-center gap-2.5 cursor-pointer transition-colors text-left',
                isActive ? 'bg-[var(--accent-dim)]' : 'hover:bg-[var(--bg-2)]',
                selected && 'bg-[var(--accent-dim)] ring-1 ring-[var(--accent)] ring-inset',
                dragging && 'opacity-40'
            )}
            style={{ height: 32, padding: '0 12px', borderRadius: 'var(--r-sm)' }}
            draggable={!renaming}
            onDragStart={e => {
                setDragging(true);
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData(
                    DND_REQ_KEY,
                    encodeReqDrag({
                        requestId: req.id,
                        fromCollectionId: collectionId,
                        fromFolderId: folderId ?? null,
                    })
                );
            }}
            onDragEnd={() => {
                setDragging(false);
                setDropIndicator(null);
            }}
            onDragOver={e => {
                if (!e.dataTransfer.types.includes(DND_REQ_KEY)) return;
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = 'move';
                const rect = e.currentTarget.getBoundingClientRect();
                setDropIndicator(e.clientY < rect.top + rect.height / 2 ? 'before' : 'after');
            }}
            onDragLeave={e => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropIndicator(null);
            }}
            onDrop={e => {
                e.preventDefault();
                e.stopPropagation();
                const indicator = dropIndicator;
                setDropIndicator(null);
                const p = decodeReqDrag(e.dataTransfer.getData(DND_REQ_KEY));
                if (!p || p.requestId === req.id) return;
                reorderRequest(p.requestId, req.id, indicator ?? 'after');
            }}
            onClick={e => {
                if (renaming) return;
                if (hasSelection || e.ctrlKey || e.metaKey) {
                    onToggleSelect?.(req.id, e);
                    return;
                }
                openTab({ orgId, projectId, collectionId, requestId: req.id, folderId }, req);
            }}
            onDoubleClick={e => {
                e.stopPropagation();
                setRenaming(true);
            }}
            onContextMenu={openCtx}
        >
            {/* Drop position indicators */}
            {dropIndicator === 'before' && (
                <div
                    aria-hidden
                    className="absolute left-2 right-2 rounded"
                    style={{
                        top: 1,
                        height: 2,
                        background: 'var(--accent)',
                        pointerEvents: 'none',
                        zIndex: 10,
                    }}
                />
            )}
            {dropIndicator === 'after' && (
                <div
                    aria-hidden
                    className="absolute left-2 right-2 rounded"
                    style={{
                        bottom: 1,
                        height: 2,
                        background: 'var(--accent)',
                        pointerEvents: 'none',
                        zIndex: 10,
                    }}
                />
            )}

            {/* Checkbox (visible when selection mode active or hovered) */}
            <div
                className={cn(
                    'shrink-0 flex items-center justify-center rounded transition-all duration-100',
                    hasSelection ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                )}
                style={{
                    width: 14,
                    height: 14,
                    marginLeft: -2,
                    marginRight: -4,
                    border: `1px solid ${selected ? 'var(--accent)' : 'var(--border-2)'}`,
                    background: selected ? 'var(--accent)' : 'transparent',
                    borderRadius: 3,
                    flexShrink: 0,
                }}
                onClick={e => {
                    e.stopPropagation();
                    onToggleSelect?.(req.id, e);
                }}
            >
                {selected && (
                    <svg viewBox="0 0 10 8" style={{ width: 8, height: 8 }} fill="none">
                        <path
                            d="M1 4l3 3 5-6"
                            stroke="#0d1117"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                )}
            </div>
            {!req.protocol || req.protocol === 'http' ? (
                <MethodBadge method={req.method as any} compact />
            ) : (
                <span
                    className="inline-flex items-center justify-center rounded shrink-0 font-mono font-bold tracking-wider"
                    style={{
                        fontSize: 9,
                        height: 14,
                        minWidth: 28,
                        padding: '0 4px',
                        color:
                            req.protocol === 'graphql'
                                ? 'var(--purple)'
                                : req.protocol === 'grpc'
                                  ? 'var(--blue)'
                                  : req.protocol === 'kafka'
                                    ? 'var(--orange)'
                                    : req.protocol === 'websocket'
                                      ? '#22c55e'
                                      : 'var(--green)',
                        background:
                            req.protocol === 'graphql'
                                ? 'color-mix(in srgb, var(--purple) 15%, transparent)'
                                : req.protocol === 'grpc'
                                  ? 'color-mix(in srgb, var(--blue) 15%, transparent)'
                                  : req.protocol === 'kafka'
                                    ? 'color-mix(in srgb, var(--orange) 15%, transparent)'
                                    : 'color-mix(in srgb, var(--green) 15%, transparent)',
                    }}
                >
                    {req.protocol === 'graphql'
                        ? 'GQL'
                        : req.protocol === 'grpc'
                          ? 'gRPC'
                          : req.protocol === 'kafka'
                            ? 'KFK'
                            : req.protocol === 'websocket'
                              ? 'WS'
                              : 'SQS'}
                </span>
            )}
            {renaming ? (
                <InlineRename
                    value={req.name}
                    onCommit={name => {
                        renameRequest(req.id, name);
                        setRenaming(false);
                        onNewEnd?.();
                    }}
                    onCancel={() => {
                        setRenaming(false);
                        onNewEnd?.();
                    }}
                />
            ) : (
                <>
                    <span
                        className="flex-1 truncate"
                        style={{
                            fontSize: 12.5,
                            color: isActive ? 'var(--text-0)' : 'var(--text-1)',
                            letterSpacing: '-0.01em',
                        }}
                    >
                        {req.name}
                    </span>
                    {isChained && (
                        <span
                            title="Response cached — use {{chain:${req.name}.field}} to reference values"
                            style={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                background: 'var(--accent)',
                                flexShrink: 0,
                                opacity: 0.7,
                            }}
                        />
                    )}
                    <button
                        className="shrink-0 flex items-center justify-center rounded opacity-40 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-[var(--bg-3)]"
                        style={{ width: 20, height: 20, color: 'var(--text-2)', marginRight: -4 }}
                        onClick={e => {
                            e.stopPropagation();
                            openCtx(e);
                        }}
                    >
                        <MoreHorizontal style={{ width: 12, height: 12 }} />
                    </button>
                </>
            )}
            {pos && <ContextMenu pos={pos} items={ctxItems} onClose={closeCtx} />}
        </div>
    );
}

// ── Collection tree — folder item ─────────────────────────────────────────

function FolderItem({
    folder,
    collectionId,
    orgId,
    projectId,
    searchQuery,
    selectedIds,
    onToggleSelect,
}: {
    folder: { id: string; name: string; requests: Request[]; folders?: any[] };
    collectionId: string;
    orgId: string;
    projectId: string;
    searchQuery?: string;
    selectedIds?: Set<string>;
    onToggleSelect?: (_id: string, _e: React.MouseEvent) => void;
}) {
    const {
        renameFolder,
        deleteFolder,
        duplicateFolder,
        moveRequest,
        reorderFolder,
        createSubFolder,
        createRequest,
    } = useAppStore();
    const [open, setOpen] = React.useState(true);
    const [renaming, setRenaming] = React.useState(false);
    const [dropOver, setDropOver] = React.useState(false);
    const [folderDragging, setFolderDragging] = React.useState(false);
    const [dropIndicator, setDropIndicator] = React.useState<'before' | 'after' | null>(null);
    const { pos, open: openCtx, close: closeCtx } = useContextMenu();

    const ctxItems: CtxItem[] = [
        {
            label: 'New request',
            icon: ({ style }) => <Plus style={style} />,
            action: () =>
                createRequest(
                    { orgId, projectId, collectionId, folderId: folder.id },
                    'New Request'
                ),
        },
        {
            label: 'New folder',
            icon: ({ style }) => <Folder style={style} />,
            action: () => createSubFolder(orgId, projectId, collectionId, folder.id, 'New Folder'),
        },
        { label: 'divider' as any, action: () => {}, divider: true },
        {
            label: 'Rename',
            icon: ({ style }) => <Pencil style={style} />,
            action: () => setRenaming(true),
            shortcut: 'F2',
        },
        {
            label: 'Duplicate',
            icon: ({ style }) => <Copy style={style} />,
            action: () => duplicateFolder(orgId, projectId, collectionId, folder.id),
        },
        { label: 'divider' as any, action: () => {}, divider: true },
        {
            label: 'Delete',
            icon: ({ style }) => <Trash2 style={style} />,
            action: () => deleteFolder(orgId, projectId, collectionId, folder.id),
            danger: true,
        },
    ];

    return (
        <div style={{ opacity: folderDragging ? 0.4 : 1 }}>
            <div
                className="group relative w-full flex items-center gap-2.5 cursor-pointer transition-colors hover:bg-[var(--bg-2)] text-left"
                style={{
                    height: 32,
                    padding: '0 10px',
                    borderRadius: 'var(--r-sm)',
                    outline: dropOver ? '2px solid var(--accent)' : 'none',
                    outlineOffset: -2,
                }}
                tabIndex={0}
                draggable={!renaming}
                onClick={() => !renaming && setOpen(v => !v)}
                onDoubleClick={e => {
                    e.stopPropagation();
                    setRenaming(true);
                }}
                onKeyDown={e => {
                    if (e.key === 'F2') {
                        e.preventDefault();
                        setRenaming(true);
                    }
                }}
                onContextMenu={openCtx}
                onDragStart={e => {
                    setFolderDragging(true);
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData(
                        DND_FOLDER_KEY,
                        encodeFolderDrag({ folderId: folder.id, collectionId })
                    );
                }}
                onDragEnd={() => {
                    setFolderDragging(false);
                    setDropIndicator(null);
                }}
                onDragOver={e => {
                    e.preventDefault();
                    // Folder-over-folder: show insert indicator
                    if (e.dataTransfer.types.includes(DND_FOLDER_KEY)) {
                        e.stopPropagation();
                        e.dataTransfer.dropEffect = 'move';
                        const rect = e.currentTarget.getBoundingClientRect();
                        setDropIndicator(
                            e.clientY < rect.top + rect.height / 2 ? 'before' : 'after'
                        );
                        return;
                    }
                    // Request-over-folder: highlight to move into folder
                    if (e.dataTransfer.types.includes(DND_REQ_KEY)) {
                        e.dataTransfer.dropEffect = 'move';
                        setDropOver(true);
                    }
                }}
                onDragLeave={e => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                        setDropOver(false);
                        setDropIndicator(null);
                    }
                }}
                onDrop={e => {
                    e.preventDefault();
                    const indicator = dropIndicator;
                    setDropOver(false);
                    setDropIndicator(null);

                    // Folder reorder
                    const fp = decodeFolderDrag(e.dataTransfer.getData(DND_FOLDER_KEY));
                    if (fp && fp.folderId !== folder.id) {
                        e.stopPropagation();
                        reorderFolder(fp.folderId, folder.id, indicator ?? 'after');
                        return;
                    }

                    // Request into folder
                    const rp = decodeReqDrag(e.dataTransfer.getData(DND_REQ_KEY));
                    if (rp) moveRequest(rp.requestId, collectionId, folder.id);
                }}
            >
                {/* Drop position indicators for folder reordering */}
                {dropIndicator === 'before' && (
                    <div
                        aria-hidden
                        className="absolute left-1 right-1 rounded"
                        style={{
                            top: 1,
                            height: 2,
                            background: 'var(--accent)',
                            pointerEvents: 'none',
                            zIndex: 10,
                        }}
                    />
                )}
                {dropIndicator === 'after' && (
                    <div
                        aria-hidden
                        className="absolute left-1 right-1 rounded"
                        style={{
                            bottom: 1,
                            height: 2,
                            background: 'var(--accent)',
                            pointerEvents: 'none',
                            zIndex: 10,
                        }}
                    />
                )}
                <ChevronRight
                    style={{
                        width: 12,
                        height: 12,
                        color: 'var(--text-2)',
                        flexShrink: 0,
                        transition: 'transform 150ms',
                        transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
                    }}
                />
                {open ? (
                    <FolderOpen
                        style={{ width: 12, height: 12, color: 'var(--yellow)', flexShrink: 0 }}
                    />
                ) : (
                    <Folder
                        style={{ width: 12, height: 12, color: 'var(--text-2)', flexShrink: 0 }}
                    />
                )}
                {renaming ? (
                    <InlineRename
                        value={folder.name}
                        onCommit={name => {
                            renameFolder(orgId, projectId, collectionId, folder.id, name);
                            setRenaming(false);
                        }}
                        onCancel={() => setRenaming(false)}
                    />
                ) : (
                    <>
                        <span
                            className="flex-1 truncate"
                            style={{
                                fontSize: 12.5,
                                color: 'var(--text-1)',
                                fontWeight: 500,
                                letterSpacing: '-0.01em',
                            }}
                        >
                            {folder.name}
                        </span>
                        <button
                            className="shrink-0 flex items-center justify-center rounded opacity-40 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-[var(--bg-3)]"
                            style={{
                                width: 20,
                                height: 20,
                                color: 'var(--text-2)',
                                marginRight: -2,
                            }}
                            onClick={e => {
                                e.stopPropagation();
                                openCtx(e);
                            }}
                        >
                            <MoreHorizontal style={{ width: 12, height: 12 }} />
                        </button>
                    </>
                )}
                {pos && <ContextMenu pos={pos} items={ctxItems} onClose={closeCtx} />}
            </div>
            {open && (
                <div style={{ paddingLeft: 20 }}>
                    {filterRequests(folder.requests ?? [], searchQuery ?? '').map(req => (
                        <RequestItem
                            key={req.id}
                            req={req}
                            collectionId={collectionId}
                            folderId={folder.id}
                            orgId={orgId}
                            projectId={projectId}
                            selected={selectedIds?.has(req.id)}
                            onToggleSelect={onToggleSelect}
                            hasSelection={(selectedIds?.size ?? 0) > 0}
                        />
                    ))}
                    {(folder.folders ?? []).map((sub: any) => (
                        <FolderItem
                            key={sub.id}
                            folder={sub}
                            collectionId={collectionId}
                            orgId={orgId}
                            projectId={projectId}
                            searchQuery={searchQuery}
                            selectedIds={selectedIds}
                            onToggleSelect={onToggleSelect}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Collection tree view ────────────────────────────────────────────────────

// ── Collection variables panel ─────────────────────────────────────────────

function CollectionVarsPanel({
    collectionId,
    initial,
}: {
    collectionId: string;
    initial: EnvVariable[] | undefined;
}) {
    const { setCollectionVariables } = useAppStore();
    const [rows, setRows] = React.useState<EnvVariable[]>(() => initial ?? []);

    const commit = (next: EnvVariable[]) => {
        setRows(next);
        setCollectionVariables(collectionId, next);
    };

    const updateRow = (idx: number, patch: Partial<EnvVariable>) =>
        commit(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

    const removeRow = (idx: number) => commit(rows.filter((_, i) => i !== idx));

    const addRow = () => commit([...rows, { key: '', value: '', enabled: true }]);

    return (
        <div
            style={{
                borderBottom: '1px solid var(--border-0)',
                background: 'color-mix(in srgb, var(--accent) 4%, var(--bg-1))',
            }}
        >
            {/* Header */}
            <div
                style={{
                    padding: '5px 10px',
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: 'var(--accent)',
                }}
            >
                Collection Variables
            </div>

            {/* Rows */}
            {rows.map((row, idx) => (
                <div
                    key={idx}
                    className="flex items-center gap-1"
                    style={{ padding: '2px 8px 2px 10px' }}
                >
                    <input
                        className="bg-transparent outline-none"
                        style={{
                            width: 80,
                            fontSize: 11.5,
                            fontFamily: "'JetBrains Mono Variable', monospace",
                            color: row.enabled ? 'var(--text-0)' : 'var(--text-2)',
                        }}
                        placeholder="key"
                        value={row.key}
                        onChange={e => updateRow(idx, { key: e.target.value })}
                        spellCheck={false}
                    />
                    <span style={{ color: 'var(--border-2)', fontSize: 11 }}>:</span>
                    <input
                        className="bg-transparent outline-none flex-1"
                        style={{
                            fontSize: 11.5,
                            fontFamily: "'JetBrains Mono Variable', monospace",
                            color: row.enabled ? 'var(--accent)' : 'var(--text-2)',
                        }}
                        placeholder="value"
                        value={row.value}
                        onChange={e => updateRow(idx, { value: e.target.value })}
                        spellCheck={false}
                    />
                    <button
                        className="flex items-center justify-center rounded cursor-pointer transition-opacity opacity-40 hover:opacity-100"
                        style={{ width: 16, height: 16, color: 'var(--text-2)', flexShrink: 0 }}
                        onClick={() => removeRow(idx)}
                    >
                        <X style={{ width: 10, height: 10 }} />
                    </button>
                </div>
            ))}

            {/* Add row */}
            <button
                className="flex items-center gap-1 cursor-pointer transition-colors hover:text-[var(--accent)]"
                style={{
                    padding: '5px 10px 6px',
                    fontSize: 11,
                    color: 'var(--text-2)',
                }}
                onClick={addRow}
            >
                <Plus style={{ width: 10, height: 10 }} />
                Add variable
            </button>
        </div>
    );
}

// ── Add-to-collection menu ─────────────────────────────────────────────────

const ADD_ITEMS: {
    id: 'folder' | Protocol;
    label: string;
    icon: React.FC<{ style?: React.CSSProperties }>;
    color: string;
}[] = [
    {
        id: 'folder',
        label: 'Folder',
        icon: ({ style }) => <Folder style={style} />,
        color: 'var(--yellow)',
    },
    {
        id: 'http',
        label: 'HTTP request',
        icon: ({ style }) => <Globe style={style} />,
        color: 'var(--accent)',
    },
    {
        id: 'graphql',
        label: 'GraphQL',
        icon: ({ style }) => <Layers style={style} />,
        color: 'var(--purple)',
    },
    {
        id: 'grpc',
        label: 'gRPC request',
        icon: ({ style }) => <Layers style={style} />,
        color: 'var(--blue)',
    },
    {
        id: 'kafka',
        label: 'Kafka',
        icon: ({ style }) => <Rss style={style} />,
        color: 'var(--orange)',
    },
    { id: 'sqs', label: 'SQS', icon: ({ style }) => <Rss style={style} />, color: 'var(--green)' },
    {
        id: 'websocket',
        label: 'WebSocket',
        icon: ({ style }) => <Wifi style={style} />,
        color: '#22c55e',
    },
];

function AddMenu({
    onClose,
    onPick,
}: {
    onClose: () => void;
    onPick: (_id: 'folder' | Protocol) => void;
}) {
    const ref = React.useRef<HTMLDivElement>(null);
    React.useEffect(() => {
        const h = (e: Event) => {
            if (e.type === 'mousedown' && ref.current && !ref.current.contains(e.target as Node))
                onClose();
            if ((e as KeyboardEvent).key === 'Escape') onClose();
        };
        document.addEventListener('mousedown', h);
        document.addEventListener('keydown', h);
        return () => {
            document.removeEventListener('mousedown', h);
            document.removeEventListener('keydown', h);
        };
    }, [onClose]);

    return (
        <div
            ref={ref}
            className="animate-context-in"
            style={{
                background: 'var(--bg-3)',
                border: '1px solid var(--border-2)',
                borderRadius: 'var(--r-md)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                overflow: 'hidden',
                padding: 4,
                marginTop: 4,
                marginLeft: 4,
                marginRight: 4,
            }}
        >
            {ADD_ITEMS.map(({ id, label, icon: Icon, color }, i) => (
                <React.Fragment key={id}>
                    {i === 1 && (
                        <div
                            style={{ height: 1, background: 'var(--border-1)', margin: '3px 0' }}
                        />
                    )}
                    <button
                        className="flex items-center gap-2.5 w-full rounded cursor-pointer transition-colors hover:bg-[var(--bg-4)]"
                        style={{ height: 32, padding: '0 10px' }}
                        onClick={() => {
                            onPick(id);
                            onClose();
                        }}
                    >
                        <div
                            className="flex items-center justify-center shrink-0 rounded"
                            style={{
                                width: 20,
                                height: 20,
                                background: `color-mix(in srgb, ${color} 15%, transparent)`,
                            }}
                        >
                            <Icon style={{ width: 11, height: 11, color }} />
                        </div>
                        <span style={{ fontSize: 12, color: 'var(--text-1)' }}>{label}</span>
                    </button>
                </React.Fragment>
            ))}
        </div>
    );
}

// ── Collection tree view ────────────────────────────────────────────────────

function filterRequests(requests: Request[], query: string): Request[] {
    if (!query) return requests;
    return requests.filter(r => r.name.toLowerCase().includes(query.toLowerCase()));
}

function CollectionTreeView({
    collection,
    orgId,
    projectId,
}: {
    collection: Collection;
    orgId: string;
    projectId: string;
}) {
    const { createRequest, createFolder, setActiveCollection, deleteRequest, moveRequest } =
        useAppStore();
    const [showAddMenu, setShowAddMenu] = React.useState(false);
    const [showVarsPanel, setShowVarsPanel] = React.useState(false);
    const [search, setSearch] = React.useState('');
    const [newReqId, setNewReqId] = React.useState<string | null>(null);
    const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
    const [rootDropOver, setRootDropOver] = React.useState(false);

    function toggleSelect(id: string, e: React.MouseEvent) {
        e.stopPropagation();
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }

    function deleteSelected() {
        selectedIds.forEach(id => deleteRequest(id));
        setSelectedIds(new Set());
    }

    const basePath = { orgId, projectId, collectionId: collection.id };

    function handlePick(id: 'folder' | Protocol) {
        setShowAddMenu(false);
        if (id === 'folder') {
            createFolder(orgId, projectId, collection.id, 'New Folder');
        } else {
            const newId = createRequest(basePath, 'New Request', id);
            setNewReqId(newId);
        }
    }

    const q = search.trim().toLowerCase();
    const rootReqs = q
        ? filterRequests(collection.requests ?? [], search)
        : (collection.requests ?? []);
    const visibleFolders = q
        ? (collection.folders ?? []).filter(
              f =>
                  filterRequests(f.requests ?? [], search).length > 0 ||
                  f.name.toLowerCase().includes(q)
          )
        : (collection.folders ?? []);

    return (
        <>
            {/* Header — height matches --toolbar-height so it aligns with main toolbar */}
            <div
                className="flex items-center gap-1.5 px-2 shrink-0"
                style={{
                    height: 'var(--toolbar-height)',
                    borderBottom: '1px solid var(--border-0)',
                }}
            >
                <button
                    className="flex items-center justify-center rounded cursor-pointer transition-colors hover:bg-[var(--bg-2)]"
                    style={{ width: 26, height: 26, color: 'var(--text-2)', flexShrink: 0 }}
                    onClick={() => setActiveCollection(null)}
                    title="Back to collections"
                >
                    <ArrowLeft style={{ width: 13, height: 13 }} />
                </button>
                <span
                    className="flex-1 truncate font-semibold"
                    style={{ fontSize: 12.5, color: 'var(--text-0)', letterSpacing: '-0.01em' }}
                >
                    {collection.name}
                </span>
                <button
                    className="flex items-center justify-center rounded cursor-pointer transition-all duration-150 hover:brightness-110"
                    style={{
                        width: 26,
                        height: 26,
                        flexShrink: 0,
                        color: 'var(--accent)',
                        background: showVarsPanel ? 'var(--accent-dim)' : 'transparent',
                        border: showVarsPanel
                            ? '1px solid color-mix(in srgb, var(--accent) 30%, transparent)'
                            : '1px solid transparent',
                    }}
                    onClick={() => setShowVarsPanel(v => !v)}
                    title="Collection variables"
                >
                    <Braces style={{ width: 13, height: 13 }} />
                </button>
                <button
                    className="flex items-center justify-center rounded cursor-pointer transition-all duration-150 hover:brightness-110"
                    style={{
                        width: 26,
                        height: 26,
                        flexShrink: 0,
                        color: 'var(--accent)',
                        background: showAddMenu ? 'var(--accent-dim)' : 'transparent',
                        border: showAddMenu
                            ? '1px solid color-mix(in srgb, var(--accent) 30%, transparent)'
                            : '1px solid transparent',
                    }}
                    onClick={() => setShowAddMenu(v => !v)}
                    title="Add to collection"
                >
                    <Plus style={{ width: 13, height: 13 }} />
                </button>
            </div>

            {/* Inline add menu — slides in below the header */}
            {showAddMenu && <AddMenu onClose={() => setShowAddMenu(false)} onPick={handlePick} />}

            {/* Collection variables */}
            {showVarsPanel && (
                <CollectionVarsPanel
                    collectionId={collection.id}
                    initial={(collection as any).variables}
                />
            )}

            {/* Search */}
            <div className="px-2 pt-2 pb-1 shrink-0">
                <div
                    className="flex items-center gap-2 px-2.5 rounded-[var(--r-sm)] transition-all duration-150 focus-within:border-[var(--border-focus)] focus-within:shadow-[0_0_0_2px_var(--accent-dim)]"
                    style={{
                        height: 28,
                        background: 'var(--bg-2)',
                        border: '1px solid var(--border-1)',
                    }}
                >
                    <Search
                        style={{
                            width: 11,
                            height: 11,
                            color: 'var(--accent)',
                            flexShrink: 0,
                            opacity: 0.7,
                        }}
                    />
                    <input
                        className="flex-1 bg-transparent outline-none placeholder:text-[var(--text-2)]"
                        style={{ fontSize: 12, color: 'var(--text-1)' }}
                        placeholder="Search requests…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Tree */}
            <div
                className="flex-1 overflow-y-auto px-2 py-1 relative"
                onDragOver={e => {
                    e.preventDefault();
                    setRootDropOver(true);
                }}
                onDragLeave={e => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) setRootDropOver(false);
                }}
                onDrop={e => {
                    e.preventDefault();
                    setRootDropOver(false);
                    const p = decodeDrag(e.dataTransfer.getData(DND_KEY));
                    if (p && p.fromFolderId) moveRequest(p.requestId, collection.id, null);
                }}
                style={{
                    outline: rootDropOver ? '2px dashed var(--accent)' : 'none',
                    outlineOffset: -4,
                    borderRadius: 'var(--r-md)',
                }}
            >
                {/* Root requests */}
                {rootReqs.map(req => (
                    <RequestItem
                        key={req.id}
                        req={req}
                        collectionId={collection.id}
                        orgId={orgId}
                        projectId={projectId}
                        isNew={req.id === newReqId}
                        onNewEnd={() => setNewReqId(null)}
                        selected={selectedIds.has(req.id)}
                        onToggleSelect={toggleSelect}
                        hasSelection={selectedIds.size > 0}
                    />
                ))}

                {/* Folders */}
                {visibleFolders.map(folder => (
                    <FolderItem
                        key={folder.id}
                        folder={folder}
                        collectionId={collection.id}
                        orgId={orgId}
                        projectId={projectId}
                        searchQuery={search}
                        selectedIds={selectedIds}
                        onToggleSelect={toggleSelect}
                    />
                ))}

                {/* Empty state */}
                {(collection.requests?.length ?? 0) === 0 &&
                    (collection.folders?.length ?? 0) === 0 &&
                    !q && (
                        <div
                            className="flex flex-col items-center justify-center h-full"
                            style={{ minHeight: 160, padding: '0 12px' }}
                        >
                            <button
                                className="flex flex-col items-center gap-3 w-full rounded-[var(--r-lg)] cursor-pointer transition-all duration-150 group"
                                style={{
                                    padding: '20px 16px',
                                    background: 'var(--bg-2)',
                                    border: '1px dashed var(--border-2)',
                                }}
                                onClick={() => setShowAddMenu(true)}
                                onMouseEnter={e => {
                                    e.currentTarget.style.borderColor = 'var(--accent)';
                                    e.currentTarget.style.background = 'var(--accent-dim)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.borderColor = 'var(--border-2)';
                                    e.currentTarget.style.background = 'var(--bg-2)';
                                }}
                            >
                                <div
                                    className="flex items-center justify-center rounded-[var(--r-md)] transition-colors duration-150"
                                    style={{
                                        width: 32,
                                        height: 32,
                                        background: 'var(--bg-3)',
                                        border: '1px solid var(--border-1)',
                                    }}
                                >
                                    <Plus
                                        style={{ width: 14, height: 14, color: 'var(--accent)' }}
                                    />
                                </div>
                                <div className="flex flex-col items-center gap-1">
                                    <span
                                        style={{
                                            fontSize: 12.5,
                                            fontWeight: 600,
                                            color: 'var(--text-1)',
                                        }}
                                    >
                                        Add first request
                                    </span>
                                    <span
                                        style={{
                                            fontSize: 11,
                                            color: 'var(--text-2)',
                                            textAlign: 'center',
                                            lineHeight: 1.4,
                                        }}
                                    >
                                        HTTP, gRPC, Kafka or SQS
                                    </span>
                                </div>
                            </button>
                        </div>
                    )}
                {q && rootReqs.length === 0 && visibleFolders.length === 0 && (
                    <div
                        className="flex items-center justify-center py-4"
                        style={{ fontSize: 12, color: 'var(--text-2)' }}
                    >
                        No requests found
                    </div>
                )}
            </div>

            {/* Bulk selection bar */}
            {selectedIds.size > 0 && (
                <div
                    className="flex items-center justify-between shrink-0 px-3 animate-tab-in"
                    style={{
                        height: 40,
                        borderTop: '1px solid var(--border-1)',
                        background: 'var(--bg-2)',
                    }}
                >
                    <span style={{ fontSize: 12, color: 'var(--text-1)' }}>
                        {selectedIds.size} selected
                    </span>
                    <div className="flex items-center gap-1.5">
                        <button
                            className="cursor-pointer transition-colors rounded"
                            style={{ fontSize: 11.5, color: 'var(--text-2)', padding: '3px 8px' }}
                            onClick={() => setSelectedIds(new Set())}
                        >
                            Cancel
                        </button>
                        <button
                            className="cursor-pointer transition-colors rounded flex items-center gap-1.5"
                            style={{
                                fontSize: 11.5,
                                color: 'var(--red)',
                                padding: '3px 8px',
                                background: 'var(--red-dim)',
                            }}
                            onClick={deleteSelected}
                        >
                            <Trash2 style={{ width: 11, height: 11 }} />
                            Delete
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}

// ── Empty projects state ──────────────────────────────────────────────────

const PROJECT_HINTS = [
    { accent: '#7c9cf0', icon: <Folder style={{ width: 11, height: 11 }} />, label: 'API v2' },
    { accent: '#c084fc', icon: <Globe style={{ width: 11, height: 11 }} />, label: 'Staging env' },
    {
        accent: '#4ade80',
        icon: <Layers style={{ width: 11, height: 11 }} />,
        label: 'Integrations',
    },
];

function EmptyProjects({ onNew }: { onNew: () => void }) {
    return (
        <div className="flex flex-col items-center gap-4" style={{ padding: '20px 12px 0' }}>
            {/* Mini fake project rows for visual hint */}
            <div
                className="w-full flex flex-col gap-1.5"
                style={{ opacity: 0.35, pointerEvents: 'none', userSelect: 'none' }}
            >
                {PROJECT_HINTS.map(({ accent, icon, label }) => (
                    <div
                        key={label}
                        className="flex items-center gap-2 rounded-[var(--r-sm)]"
                        style={{
                            padding: '5px 8px',
                            background: `${accent}12`,
                            border: `1px solid ${accent}25`,
                        }}
                    >
                        <div
                            style={{
                                width: 16,
                                height: 16,
                                borderRadius: 'var(--r-sm)',
                                flexShrink: 0,
                                background: `${accent}25`,
                                border: `1px solid ${accent}40`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: accent,
                            }}
                        >
                            {icon}
                        </div>
                        <span style={{ fontSize: 11.5, color: 'var(--text-1)', fontWeight: 500 }}>
                            {label}
                        </span>
                    </div>
                ))}
            </div>

            {/* CTA */}
            <div className="flex flex-col items-center gap-2.5 w-full">
                <span
                    style={{
                        fontSize: 11,
                        color: 'var(--text-2)',
                        textAlign: 'center',
                        lineHeight: 1.5,
                    }}
                >
                    Projects help you organise
                    <br />
                    requests by environment or team
                </span>
                <button
                    onClick={onNew}
                    className="w-full flex items-center justify-center gap-1.5 rounded-[var(--r-sm)] cursor-pointer transition-all duration-150"
                    style={{
                        height: 30,
                        background: 'var(--accent-dim)',
                        border: '1px solid color-mix(in srgb, var(--accent) 35%, transparent)',
                        color: 'var(--accent)',
                        fontSize: 12,
                        fontWeight: 600,
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.background = 'var(--accent)';
                        e.currentTarget.style.color = '#fff';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.background = 'var(--accent-dim)';
                        e.currentTarget.style.color = 'var(--accent)';
                    }}
                >
                    <Plus style={{ width: 11, height: 11 }} />
                    New project
                </button>
            </div>
        </div>
    );
}

// ── Sidebar ────────────────────────────────────────────────────────────────

export function Sidebar() {
    const {
        organizations,
        dataLoading,
        dataError,
        loadOrganizations,
        createOrganization,
        createProject,
        activeOrgId,
        setActiveOrg,
        activeProjectId,
        setActiveProject,
        activeCollectionId,
        openSettingsPanel,
    } = useAppStore();

    const [filter, setFilter] = React.useState('');
    const [newProjId, setNewProjId] = React.useState<string | null>(null);
    const [showNewOrg, setShowNewOrg] = React.useState(false);
    const [width, setWidth] = React.useState(220);
    const dragging = React.useRef(false);
    const startX = React.useRef(0);
    const startWidth = React.useRef(0);

    React.useEffect(() => {
        const onMove = (e: MouseEvent) => {
            if (!dragging.current) return;
            const next = Math.max(
                160,
                Math.min(400, startWidth.current + e.clientX - startX.current)
            );
            setWidth(next);
        };
        const onUp = () => {
            if (!dragging.current) return;
            dragging.current = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
        return () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };
    }, []);

    const startDrag = (e: React.MouseEvent) => {
        dragging.current = true;
        startX.current = e.clientX;
        startWidth.current = width;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    };

    React.useEffect(() => {
        loadOrganizations();
    }, [loadOrganizations]);

    const activeOrg = organizations.find(o => o.id === activeOrgId) ?? organizations[0] ?? null;
    const allProjects = activeOrg?.projects ?? [];
    const projects = filter.trim()
        ? allProjects.filter(p => p.name.toLowerCase().includes(filter.toLowerCase()))
        : allProjects;

    // Find active collection for tree view
    const activeProject = allProjects.find(p => p.id === activeProjectId) ?? allProjects[0] ?? null;
    const activeCollection =
        activeProject?.collections?.find(c => c.id === activeCollectionId) ?? null;

    return (
        <div
            className="relative flex flex-col h-full shrink-0 overflow-x-hidden"
            style={{ width, background: 'var(--bg-0)', borderRight: '1px solid var(--border-0)' }}
        >
            {/* Drag handle */}
            <div
                className="absolute right-0 top-0 bottom-0 z-10 cursor-col-resize group/handle"
                style={{ width: 5 }}
                onMouseDown={startDrag}
            >
                <div
                    className="absolute right-0 top-0 bottom-0 w-[1px] transition-all duration-150 group-hover/handle:w-[2px] group-hover/handle:bg-[var(--accent)]"
                    style={{ background: 'transparent' }}
                />
            </div>
            {/* Workspace switcher */}
            <div
                className="drag-region flex items-center shrink-0"
                style={{
                    height: 'var(--titlebar-height)',
                    borderBottom: '1px solid var(--border-0)',
                    padding: '0 12px',
                }}
            >
                <WorkspaceSwitcher
                    organizations={organizations}
                    activeOrgId={activeOrgId}
                    onSelect={setActiveOrg}
                    onCreate={name => {
                        createOrganization(name);
                    }}
                />
            </div>

            {/* ── Collection tree / Projects list ── */}
            <div className="flex flex-col flex-1 overflow-hidden">
                {activeCollection && activeOrg && activeProject ? (
                    /* ── Collection tree mode ── */
                    <CollectionTreeView
                        collection={activeCollection}
                        orgId={activeOrg.id}
                        projectId={activeProject.id}
                    />
                ) : (
                    /* ── Projects list mode ── */
                    <>
                        {/* Search + new project */}
                        <div
                            className="flex items-center gap-1.5 shrink-0"
                            style={{ padding: '12px 12px 8px' }}
                        >
                            <div
                                className="flex flex-1 items-center gap-2 px-2.5 rounded-[var(--r-md)] transition-all duration-150 focus-within:border-[var(--border-focus)] focus-within:shadow-[0_0_0_2px_var(--accent-dim)]"
                                style={{
                                    height: 30,
                                    minWidth: 0,
                                    background: 'var(--bg-2)',
                                    border: '1px solid var(--border-1)',
                                }}
                            >
                                <Search
                                    style={{
                                        width: 11,
                                        height: 11,
                                        color: 'var(--accent)',
                                        flexShrink: 0,
                                        opacity: 0.7,
                                    }}
                                />
                                <input
                                    className="flex-1 bg-transparent outline-none placeholder:text-[var(--text-2)]"
                                    style={{ fontSize: 12.5, color: 'var(--text-1)' }}
                                    placeholder="Search projects…"
                                    value={filter}
                                    onChange={e => setFilter(e.target.value)}
                                />
                            </div>
                            {activeOrg && (
                                <button
                                    className="flex items-center justify-center rounded-[var(--r-md)] cursor-pointer transition-all duration-150 hover:brightness-110 active:brightness-90"
                                    style={{
                                        width: 30,
                                        height: 30,
                                        flexShrink: 0,
                                        background: 'var(--accent-dim)',
                                        border: '1px solid color-mix(in srgb, var(--accent) 35%, transparent)',
                                        color: 'var(--accent)',
                                    }}
                                    title="New project"
                                    onClick={() => {
                                        const id = createProject(activeOrg.id, 'New Project');
                                        setNewProjId(id);
                                    }}
                                >
                                    <Plus style={{ width: 13, height: 13 }} />
                                </button>
                            )}
                        </div>

                        {/* Section label */}
                        {projects.length > 0 && (
                            <div
                                className="flex items-center gap-1.5 shrink-0"
                                style={{ padding: '2px 12px 6px' }}
                            >
                                <span
                                    style={{
                                        fontSize: 10.5,
                                        fontWeight: 600,
                                        color: 'var(--text-2)',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.07em',
                                    }}
                                >
                                    Projects
                                </span>
                                <span
                                    style={{ fontSize: 10.5, color: 'var(--text-2)', opacity: 0.6 }}
                                >
                                    ({projects.length})
                                </span>
                            </div>
                        )}

                        {/* List */}
                        <div className="flex-1 overflow-y-auto pb-2">
                            {dataError && (
                                <div
                                    className="mx-2 mt-2 rounded p-2"
                                    style={{
                                        background: 'var(--red-dim)',
                                        border: '1px solid var(--red)',
                                        fontSize: 11,
                                        color: 'var(--red)',
                                    }}
                                >
                                    Failed to load data:{' '}
                                    <span style={{ color: 'var(--text-1)' }}>{dataError}</span>
                                </div>
                            )}
                            {dataLoading ? (
                                <div
                                    className="flex items-center justify-center py-10 gap-2"
                                    style={{ color: 'var(--text-2)' }}
                                >
                                    <RefreshCw
                                        style={{ width: 12, height: 12 }}
                                        className="animate-spin"
                                    />
                                    <span style={{ fontSize: 11 }}>Loading…</span>
                                </div>
                            ) : organizations.length === 0 ? (
                                <div className="flex items-center justify-center h-full">
                                    <button
                                        className="cursor-pointer transition-colors hover:text-[var(--accent)]"
                                        style={{ fontSize: 12, color: 'var(--text-2)' }}
                                        onClick={() => setShowNewOrg(true)}
                                    >
                                        + Create workspace
                                    </button>
                                </div>
                            ) : projects.length === 0 ? (
                                filter ? (
                                    <div
                                        className="flex items-center justify-center py-8"
                                        style={{ color: 'var(--text-2)', fontSize: 12 }}
                                    >
                                        No projects found
                                    </div>
                                ) : (
                                    <EmptyProjects
                                        onNew={() => {
                                            if (activeOrg) {
                                                const id = createProject(
                                                    activeOrg.id,
                                                    'New Project'
                                                );
                                                setNewProjId(id);
                                            }
                                        }}
                                    />
                                )
                            ) : (
                                projects.map(project => (
                                    <ProjectRow
                                        key={project.id}
                                        project={project}
                                        orgId={activeOrg!.id}
                                        isActive={project.id === activeProjectId}
                                        onSelect={() => setActiveProject(project.id)}
                                        isNew={project.id === newProjId}
                                        onNewEnd={() => setNewProjId(null)}
                                    />
                                ))
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Footer — always visible */}
            <div
                className="flex items-center justify-end px-4 shrink-0"
                style={{
                    height: 'var(--statusbar-height)',
                    borderTop: '1px solid var(--border-0)',
                }}
            >
                <button
                    className="flex items-center justify-center rounded hover:bg-[var(--bg-2)] transition-colors cursor-pointer"
                    style={{ width: 22, height: 22, color: 'var(--text-2)' }}
                    title={`Settings (${shortcut(',')})`}
                    onClick={openSettingsPanel}
                >
                    <Settings style={{ width: 13, height: 13 }} />
                </button>
            </div>

            {showNewOrg && (
                <WorkspaceDialog
                    initial=""
                    title="New workspace"
                    onConfirm={name => {
                        createOrganization(name);
                        setShowNewOrg(false);
                    }}
                    onCancel={() => setShowNewOrg(false)}
                />
            )}
        </div>
    );
}
