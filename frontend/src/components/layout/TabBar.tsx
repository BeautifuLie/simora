import React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MethodBadge } from '@/components/ui/badge';
import { useAppStore, type Tab, type HttpMethod, selectActivePath } from '@/store/app';

// ── Tab item ──────────────────────────────────────────────────────────────

function TabItem({ tab }: { tab: Tab }) {
    const isActive = useAppStore(s => s.activeTabId === tab.id);
    const switchTab = useAppStore(s => s.switchTab);
    const closeTab = useAppStore(s => s.closeTab);
    const protocol = tab.editing?.protocol ?? 'http';
    const method = tab.editing?.method as HttpMethod | undefined;

    const handleClose = (e: React.MouseEvent) => {
        e.stopPropagation();
        closeTab(tab.id);
    };

    return (
        <div
            className={cn(
                'group relative flex items-center gap-1.5 select-none cursor-pointer shrink-0',
                'border-r border-[var(--border-0)]',
                'transition-colors duration-100',
                isActive
                    ? 'bg-[var(--bg-1)] text-[var(--text-0)]'
                    : 'bg-[var(--bg-0)] text-[var(--text-2)] hover:bg-[var(--bg-2)] hover:text-[var(--text-1)]'
            )}
            style={{ height: '100%', padding: '0 10px 0 8px', maxWidth: 180, minWidth: 80 }}
            onClick={() => switchTab(tab.id)}
        >
            {/* Active indicator line at top */}
            {isActive && (
                <span className="absolute top-0 left-0 right-0 h-[1.5px] bg-[var(--accent)]" />
            )}

            {/* Protocol / method badge */}
            {protocol === 'http' && method && <MethodBadge method={method} compact />}
            {protocol === 'graphql' && (
                <span
                    style={{
                        fontSize: 9,
                        fontWeight: 700,
                        color: 'var(--purple)',
                        letterSpacing: '0.03em',
                    }}
                >
                    GQL
                </span>
            )}
            {protocol === 'grpc' && (
                <span
                    style={{
                        fontSize: 9,
                        fontWeight: 700,
                        color: 'var(--blue)',
                        letterSpacing: '0.03em',
                    }}
                >
                    gRPC
                </span>
            )}
            {protocol === 'kafka' && (
                <span
                    style={{
                        fontSize: 9,
                        fontWeight: 700,
                        color: 'var(--orange)',
                        letterSpacing: '0.03em',
                    }}
                >
                    KFK
                </span>
            )}
            {protocol === 'sqs' && (
                <span
                    style={{
                        fontSize: 9,
                        fontWeight: 700,
                        color: 'var(--green)',
                        letterSpacing: '0.03em',
                    }}
                >
                    SQS
                </span>
            )}

            {/* Name */}
            <span className="flex-1 truncate" style={{ fontSize: 'var(--text-base)' }}>
                {tab.editing?.name ?? 'New Request'}
            </span>

            {/* Dirty dot */}
            {tab.isDirty && (
                <span
                    className="shrink-0 rounded-full group-hover:hidden"
                    style={{ width: 5, height: 5, background: 'var(--accent)' }}
                />
            )}

            {/* Close button — always shown on hover, shown as dot when dirty */}
            <button
                className={cn(
                    'shrink-0 flex items-center justify-center rounded transition-all duration-100 cursor-pointer',
                    'opacity-0 group-hover:opacity-100',
                    'hover:bg-[var(--bg-3)] hover:text-[var(--text-0)]'
                )}
                style={{ width: 16, height: 16, color: 'var(--text-2)' }}
                onClick={handleClose}
            >
                <X style={{ width: 10, height: 10 }} />
            </button>
        </div>
    );
}

// ── TabBar ────────────────────────────────────────────────────────────────

export function TabBar() {
    const { tabs, createRequest, duplicateTab } = useAppStore();
    const activePath = useAppStore(selectActivePath);
    const activeCollectionId = useAppStore(s => s.activeCollectionId);
    const activeOrgId = useAppStore(s => s.activeOrgId);
    const activeProjectId = useAppStore(s => s.activeProjectId);

    const handleNewTab = React.useCallback(() => {
        // Prefer the explicitly active collection (sidebar context) over the active tab's collection
        const colId = activeCollectionId ?? activePath?.collectionId;
        if (colId && activeOrgId && activeProjectId) {
            createRequest(
                { orgId: activeOrgId, projectId: activeProjectId, collectionId: colId },
                'New Request'
            );
        }
    }, [activePath, activeCollectionId, activeOrgId, activeProjectId, createRequest]);

    React.useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const mod = e.metaKey || e.ctrlKey;
            if (mod && e.key === 't') {
                e.preventDefault();
                handleNewTab();
            }
            if (mod && e.key === 'd') {
                e.preventDefault();
                duplicateTab();
            }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [handleNewTab, duplicateTab]);

    return (
        <div
            className="flex items-stretch shrink-0 overflow-x-auto overflow-y-hidden"
            style={{
                height: 'var(--titlebar-height)',
                background: 'var(--bg-0)',
                borderBottom: '1px solid var(--border-1)',
            }}
        >
            {tabs.map(tab => (
                <TabItem key={tab.id} tab={tab} />
            ))}
        </div>
    );
}
