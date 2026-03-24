import React from 'react';
import { createPortal } from 'react-dom';
import { Search, Plus, Layers, ArrowRight, Clock } from 'lucide-react';
import { cn, shortcut } from '@/lib/utils';
import { MethodBadge } from '@/components/ui/badge';
import {
    useAppStore,
    type Request,
    type HttpMethod,
    type ActivePath,
    type RecentRequest,
} from '@/store/app';

// ── Types ─────────────────────────────────────────────────────────────────

interface PaletteItem {
    id: string;
    type: 'request' | 'collection' | 'action';
    label: string;
    sub?: string;
    method?: HttpMethod;
    path?: ActivePath;
    req?: Request;
    action?: () => void;
    icon?: React.ElementType;
}

// ── Fuzzy match ───────────────────────────────────────────────────────────

export function fuzzyMatch(query: string, text: string): boolean {
    if (!query) return true;
    const q = query.toLowerCase();
    const t = text.toLowerCase();
    let qi = 0;
    for (let i = 0; i < t.length && qi < q.length; i++) {
        if (t[i] === q[qi]) qi++;
    }
    return qi === q.length;
}

export function fuzzyScore(query: string, text: string): number {
    if (!query) return 0;
    const q = query.toLowerCase();
    const t = text.toLowerCase();
    const idx = t.indexOf(q);
    if (idx === 0) return 3;
    if (idx > 0) return 2;
    return fuzzyMatch(q, t) ? 1 : 0;
}

// ── Highlight matching chars ──────────────────────────────────────────────

function Highlighted({ text, query }: { text: string; query: string }) {
    if (!query) return <>{text}</>;
    const q = query.toLowerCase();
    const t = text.toLowerCase();
    const idx = t.indexOf(q);
    if (idx >= 0) {
        return (
            <>
                {text.slice(0, idx)}
                <mark
                    style={{
                        background: 'var(--accent-dim)',
                        color: 'var(--accent)',
                        borderRadius: 2,
                        padding: '0 1px',
                    }}
                >
                    {text.slice(idx, idx + q.length)}
                </mark>
                {text.slice(idx + q.length)}
            </>
        );
    }
    return <>{text}</>;
}

// ── Recent helpers ────────────────────────────────────────────────────────

function findRequestById(
    organizations: ReturnType<typeof useAppStore.getState>['organizations'],
    requestId: string | undefined
): Request | null {
    if (!requestId) return null;
    for (const org of organizations) {
        for (const proj of org.projects ?? []) {
            for (const col of proj.collections ?? []) {
                for (const req of col.requests ?? []) {
                    if (req.id === requestId) return req;
                }
                for (const fld of col.folders ?? []) {
                    for (const req of fld.requests ?? []) {
                        if (req.id === requestId) return req;
                    }
                }
            }
        }
    }
    return null;
}

function RecentItem({ entry, onActivate }: { entry: RecentRequest; onActivate: () => void }) {
    return (
        <div
            className="flex items-center gap-3 rounded-[var(--r-sm)] cursor-pointer hover:bg-[var(--bg-2)] transition-colors duration-75"
            style={{ padding: '6px 10px' }}
            onClick={onActivate}
        >
            <Clock style={{ width: 11, height: 11, color: 'var(--text-2)', flexShrink: 0 }} />
            <MethodBadge method={entry.method as HttpMethod} compact />
            <span
                className="flex-1 truncate"
                style={{ fontSize: 'var(--text-base)', color: 'var(--text-1)' }}
            >
                {entry.url || entry.name}
            </span>
        </div>
    );
}

// ── Command palette ───────────────────────────────────────────────────────

export function CommandPalette() {
    const [open, setOpen] = React.useState(false);
    const [query, setQuery] = React.useState('');
    const [cursor, setCursor] = React.useState(0);
    const inputRef = React.useRef<HTMLInputElement>(null);
    const listRef = React.useRef<HTMLDivElement>(null);

    const { organizations, openTab, newBlankTab, openEnvPanel, recentRequests } = useAppStore();

    // Open / close via Cmd+K
    React.useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setOpen(v => !v);
                setQuery('');
                setCursor(0);
            }
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, []);

    React.useEffect(() => {
        if (open) setTimeout(() => inputRef.current?.focus(), 0);
    }, [open]);

    // Build items list
    const allItems = React.useMemo<PaletteItem[]>(() => {
        const items: PaletteItem[] = [];

        // Fixed actions
        items.push(
            {
                id: 'act-new-tab',
                type: 'action',
                label: 'New Tab',
                sub: shortcut('T'),
                icon: Plus,
                action: () => {
                    newBlankTab();
                    setOpen(false);
                },
            },
            {
                id: 'act-env',
                type: 'action',
                label: 'Manage Environments',
                sub: shortcut('E'),
                icon: Layers,
                action: () => {
                    openEnvPanel();
                    setOpen(false);
                },
            }
        );

        // Requests from tree
        for (const org of organizations) {
            for (const proj of org.projects ?? []) {
                for (const col of proj.collections ?? []) {
                    // Direct requests in collection
                    for (const req of col.requests ?? []) {
                        const path: ActivePath = {
                            orgId: org.id,
                            projectId: proj.id,
                            collectionId: col.id,
                            requestId: req.id,
                        };
                        items.push({
                            id: `req-${req.id}`,
                            type: 'request',
                            label: req.name,
                            sub: `${proj.name} / ${col.name}`,
                            method: req.method as HttpMethod,
                            path,
                            req,
                        });
                    }
                    // Requests in folders
                    for (const fld of col.folders ?? []) {
                        for (const req of fld.requests ?? []) {
                            const path: ActivePath = {
                                orgId: org.id,
                                projectId: proj.id,
                                collectionId: col.id,
                                requestId: req.id,
                            };
                            items.push({
                                id: `req-${req.id}`,
                                type: 'request',
                                label: req.name,
                                sub: `${proj.name} / ${col.name} / ${fld.name}`,
                                method: req.method as HttpMethod,
                                path,
                                req,
                            });
                        }
                    }
                }
            }
        }

        return items;
    }, [organizations, newBlankTab, openEnvPanel]);

    // Filter + score
    const filtered = React.useMemo(() => {
        if (!query) return allItems;
        return allItems
            .map(item => ({
                item,
                score:
                    fuzzyScore(query, item.label) +
                    (item.sub ? fuzzyScore(query, item.sub) * 0.5 : 0),
            }))
            .filter(({ score }) => score > 0)
            .sort((a, b) => b.score - a.score)
            .map(({ item }) => item);
    }, [allItems, query]);

    // Clamp cursor
    React.useEffect(() => {
        setCursor(c => Math.min(c, Math.max(0, filtered.length - 1)));
    }, [filtered.length]);

    // Keyboard nav
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setCursor(c => Math.min(c + 1, filtered.length - 1));
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            setCursor(c => Math.max(c - 1, 0));
        }
        if (e.key === 'Enter') {
            e.preventDefault();
            const item = filtered[cursor];
            if (!item) return;
            activateItem(item);
        }
    };

    const activateItem = (item: PaletteItem) => {
        if (item.type === 'request' && item.path && item.req) {
            openTab(item.path, item.req);
            setOpen(false);
        } else if (item.action) {
            item.action();
        }
    };

    // Scroll cursor into view
    React.useEffect(() => {
        const el = listRef.current?.children[cursor] as HTMLElement | undefined;
        el?.scrollIntoView({ block: 'nearest' });
    }, [cursor]);

    if (!open) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[600] flex items-start justify-center"
            style={{ paddingTop: 80, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)' }}
            onClick={() => setOpen(false)}
        >
            <div
                className="flex flex-col rounded-[var(--r-lg)] shadow-2xl overflow-hidden animate-context-in"
                style={{
                    width: 560,
                    maxHeight: 420,
                    background: 'var(--bg-1)',
                    border: '1px solid var(--border-2)',
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Input */}
                <div
                    className="flex items-center gap-3 shrink-0"
                    style={{
                        padding: '0 16px',
                        height: 52,
                        borderBottom: '1px solid var(--border-0)',
                    }}
                >
                    <Search
                        style={{ width: 16, height: 16, color: 'var(--text-2)', flexShrink: 0 }}
                    />
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={e => {
                            setQuery(e.target.value);
                            setCursor(0);
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder="Search requests, collections, actions…"
                        className="flex-1 bg-transparent outline-none"
                        style={{ fontSize: 'var(--text-md)', color: 'var(--text-0)' }}
                        spellCheck={false}
                    />
                    {query && (
                        <button
                            className="shrink-0 text-[var(--text-2)] hover:text-[var(--text-1)] cursor-pointer transition-colors"
                            onClick={() => {
                                setQuery('');
                                setCursor(0);
                                inputRef.current?.focus();
                            }}
                            style={{ fontSize: 'var(--text-sm)' }}
                        >
                            Clear
                        </button>
                    )}
                </div>

                {/* Results */}
                <div ref={listRef} className="overflow-y-auto flex-1" style={{ padding: 6 }}>
                    {/* Recent section shown when query is empty */}
                    {!query && recentRequests.length > 0 && (
                        <div style={{ marginBottom: 4 }}>
                            <div
                                style={{
                                    padding: '4px 10px 2px',
                                    fontSize: 10,
                                    fontWeight: 600,
                                    letterSpacing: '0.07em',
                                    textTransform: 'uppercase',
                                    color: 'var(--text-2)',
                                }}
                            >
                                Recent
                            </div>
                            {recentRequests.slice(0, 5).map(r => (
                                <RecentItem
                                    key={r.id}
                                    entry={r}
                                    onActivate={() => {
                                        if (r.path) {
                                            const req = findRequestById(
                                                organizations,
                                                r.path.requestId
                                            );
                                            if (req) openTab(r.path, req);
                                        }
                                        setOpen(false);
                                    }}
                                />
                            ))}
                            <div
                                style={{
                                    height: 1,
                                    background: 'var(--border-0)',
                                    margin: '6px 4px',
                                }}
                            />
                        </div>
                    )}
                    {filtered.length === 0 ? (
                        <div
                            className="flex items-center justify-center py-10"
                            style={{ color: 'var(--text-2)', fontSize: 'var(--text-sm)' }}
                        >
                            No results for "{query}"
                        </div>
                    ) : (
                        filtered.map((item, i) => {
                            const isActive = i === cursor;
                            const Icon = item.icon;
                            return (
                                <div
                                    key={item.id}
                                    className={cn(
                                        'flex items-center gap-3 rounded-[var(--r-sm)] cursor-pointer transition-colors duration-75',
                                        isActive
                                            ? 'bg-[var(--accent-dim)]'
                                            : 'hover:bg-[var(--bg-2)]'
                                    )}
                                    style={{ padding: '7px 10px' }}
                                    onMouseEnter={() => setCursor(i)}
                                    onClick={() => activateItem(item)}
                                >
                                    {item.type === 'request' && item.method && (
                                        <MethodBadge method={item.method} compact />
                                    )}
                                    {item.type === 'action' && Icon && (
                                        <div
                                            className="flex items-center justify-center rounded shrink-0"
                                            style={{
                                                width: 28,
                                                height: 18,
                                                background: 'var(--bg-3)',
                                            }}
                                        >
                                            <Icon
                                                style={{
                                                    width: 11,
                                                    height: 11,
                                                    color: 'var(--text-2)',
                                                }}
                                            />
                                        </div>
                                    )}

                                    <div className="flex flex-col flex-1 min-w-0">
                                        <span
                                            style={{
                                                fontSize: 'var(--text-base)',
                                                color: 'var(--text-0)',
                                                fontWeight: 500,
                                            }}
                                        >
                                            <Highlighted text={item.label} query={query} />
                                        </span>
                                        {item.sub && (
                                            <span
                                                className="truncate"
                                                style={{
                                                    fontSize: 10,
                                                    color: 'var(--text-2)',
                                                    marginTop: 1,
                                                }}
                                            >
                                                <Highlighted text={item.sub} query={query} />
                                            </span>
                                        )}
                                    </div>

                                    {item.sub && (
                                        <span
                                            style={{
                                                fontSize: 10,
                                                color: 'var(--text-2)',
                                                flexShrink: 0,
                                            }}
                                        >
                                            {item.sub?.split('/')[0]?.trim()}
                                        </span>
                                    )}

                                    {isActive && (
                                        <ArrowRight
                                            style={{
                                                width: 12,
                                                height: 12,
                                                color: 'var(--accent)',
                                                flexShrink: 0,
                                            }}
                                        />
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div
                    className="flex items-center gap-4 shrink-0"
                    style={{
                        padding: '6px 14px',
                        borderTop: '1px solid var(--border-0)',
                        fontSize: 10,
                        color: 'var(--text-2)',
                    }}
                >
                    <span>
                        <kbd style={{ fontFamily: 'monospace', opacity: 0.7 }}>↑↓</kbd> navigate
                    </span>
                    <span>
                        <kbd style={{ fontFamily: 'monospace', opacity: 0.7 }}>↵</kbd> open
                    </span>
                    <span>
                        <kbd style={{ fontFamily: 'monospace', opacity: 0.7 }}>Esc</kbd> close
                    </span>
                    <span className="ml-auto">
                        {filtered.length} result{filtered.length !== 1 ? 's' : ''}
                    </span>
                </div>
            </div>
        </div>,
        document.body
    );
}
