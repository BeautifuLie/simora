import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Plus, X, Loader2, Search, ChevronRight } from 'lucide-react';
import { cn, shortcut } from '@/lib/utils';
import { useAppStore, selectEditing } from '@/store/app';
import { ProtocolBadge } from './ProtocolBadge';
import { RequestNameBar } from './RequestNameBar';
import * as GrpcService from '../../../wailsjs/go/service/GrpcService';

const isWails =
    typeof window !== 'undefined' && !!(window as unknown as Record<string, unknown>)['go'];

// ── Shared helpers ────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
    return (
        <span
            style={{
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                color: 'var(--text-2)',
            }}
        >
            {children}
        </span>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Label>{label}</Label>
            {children}
        </div>
    );
}

// ── Metadata table (like headers) ─────────────────────────────────────────

function MetaRow({ idx }: { idx: number }) {
    const editing = useAppStore(selectEditing);
    const patchGrpc = useAppStore(s => s.patchGrpc);
    if (!editing) return null;
    const m = editing.grpc.meta[idx];
    if (!m) return null;

    const update = (key: string, value: string) =>
        patchGrpc({
            meta: editing.grpc.meta.map((r, i) => (i === idx ? { ...r, key, value } : r)),
        });
    const remove = () => patchGrpc({ meta: editing.grpc.meta.filter((_, i) => i !== idx) });

    return (
        <div
            className="group grid items-center hover:bg-[var(--bg-3)] transition-colors duration-100"
            style={{
                gridTemplateColumns: '1fr 1fr 24px',
                borderBottom: '1px solid var(--border-0)',
                minHeight: 32,
            }}
        >
            <input
                value={m.key}
                onChange={e => update(e.target.value, m.value)}
                placeholder="key"
                className="bg-transparent outline-none"
                style={{
                    padding: '6px 8px',
                    fontSize: 'var(--text-base)',
                    fontFamily: "'JetBrains Mono Variable', monospace",
                    color: 'var(--text-0)',
                }}
                spellCheck={false}
            />
            <input
                value={m.value}
                onChange={e => update(m.key, e.target.value)}
                placeholder="value"
                className="bg-transparent outline-none"
                style={{
                    padding: '6px 8px',
                    fontSize: 'var(--text-base)',
                    fontFamily: "'JetBrains Mono Variable', monospace",
                    color: 'var(--text-1)',
                }}
                spellCheck={false}
            />
            <button
                className="flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-all duration-100 hover:text-[var(--red)]"
                style={{ color: 'var(--text-2)', paddingRight: 8 }}
                onClick={remove}
            >
                <X style={{ width: 12, height: 12 }} />
            </button>
        </div>
    );
}

function MetadataTable() {
    const editing = useAppStore(selectEditing);
    const patchGrpc = useAppStore(s => s.patchGrpc);
    if (!editing) return null;
    return (
        <div className="flex flex-col h-full animate-tab-in">
            <div
                className="grid shrink-0"
                style={{
                    gridTemplateColumns: '1fr 1fr 24px',
                    borderBottom: '1px solid var(--border-0)',
                    padding: '6px 0',
                }}
            >
                <Label>Key</Label>
                <Label>Value</Label>
                <span />
            </div>
            <div className="flex-1 overflow-y-auto">
                {editing.grpc.meta.map((_, idx) => (
                    <MetaRow key={idx} idx={idx} />
                ))}
                {editing.grpc.meta.length === 0 && (
                    <div
                        className="flex items-center justify-center py-10"
                        style={{ color: 'var(--text-2)', fontSize: 'var(--text-sm)' }}
                    >
                        No metadata entries
                    </div>
                )}
            </div>
            <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border-0)' }}>
                <button
                    className="flex items-center gap-1.5 cursor-pointer transition-colors duration-150 hover:text-[var(--accent)]"
                    style={{ fontSize: 'var(--text-sm)', color: 'var(--text-2)' }}
                    onClick={() =>
                        patchGrpc({
                            meta: [...editing.grpc.meta, { key: '', value: '', enabled: true }],
                        })
                    }
                >
                    <Plus style={{ width: 12, height: 12 }} />
                    Add metadata
                </button>
            </div>
        </div>
    );
}

// ── Message tab ───────────────────────────────────────────────────────────

function MessageTab() {
    const editing = useAppStore(selectEditing);
    const patchGrpc = useAppStore(s => s.patchGrpc);
    if (!editing) return null;

    const handlePrettify = () => {
        try {
            patchGrpc({ message: JSON.stringify(JSON.parse(editing.grpc.message), null, 2) });
        } catch {
            /* ignore */
        }
    };

    return (
        <div className="flex flex-col h-full animate-tab-in">
            <div
                className="flex items-center justify-end shrink-0"
                style={{ padding: '4px 8px', borderBottom: '1px solid var(--border-0)' }}
            >
                {editing.grpc.message.trim() && (
                    <button
                        className="rounded cursor-pointer transition-all duration-150 text-[var(--text-2)] hover:text-[var(--accent)] hover:bg-[var(--bg-3)]"
                        style={{ padding: '3px 8px', fontSize: 'var(--text-sm)' }}
                        onClick={handlePrettify}
                        title="Format JSON"
                    >
                        {'{ }'}
                    </button>
                )}
            </div>
            <textarea
                value={editing.grpc.message}
                onChange={e => patchGrpc({ message: e.target.value })}
                className="flex-1 resize-none bg-transparent outline-none leading-relaxed"
                style={{
                    padding: 12,
                    fontSize: 'var(--text-base)',
                    fontFamily: "'JetBrains Mono Variable', monospace",
                    color: 'var(--text-0)',
                }}
                placeholder={'{\n  "field": "value"\n}'}
                spellCheck={false}
            />
        </div>
    );
}

// ── Options tab ───────────────────────────────────────────────────────────

function OptionsTab() {
    const editing = useAppStore(selectEditing);
    const patchGrpc = useAppStore(s => s.patchGrpc);
    if (!editing) return null;

    return (
        <div className="flex flex-col gap-5 animate-tab-in" style={{ padding: 16 }}>
            <Field label="TLS">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <div
                        className={cn(
                            'relative rounded-full transition-all duration-200 cursor-pointer',
                            editing.grpc.tls ? 'bg-[var(--accent)]' : 'bg-[var(--bg-3)]'
                        )}
                        style={{ width: 28, height: 16 }}
                        onClick={() => patchGrpc({ tls: !editing.grpc.tls })}
                    >
                        <div
                            className="absolute top-0.5 rounded-full bg-white transition-all duration-200"
                            style={{ width: 12, height: 12, left: editing.grpc.tls ? 14 : 2 }}
                        />
                    </div>
                    <span style={{ fontSize: 'var(--text-base)', color: 'var(--text-1)' }}>
                        {editing.grpc.tls ? 'TLS enabled' : 'TLS disabled (insecure)'}
                    </span>
                </label>
            </Field>
        </div>
    );
}

// ── Discover dropdown ─────────────────────────────────────────────────────

interface ServiceNode {
    name: string;
    methods: string[];
    loading: boolean;
    expanded: boolean;
}

function DiscoverDropdown({
    server,
    tls,
    onSelect,
    onClose,
}: {
    server: string;
    tls: boolean;
    onSelect: (_service: string, _method: string) => void;
    onClose: () => void;
}) {
    const [services, setServices] = useState<ServiceNode[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const ref = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose();
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [onClose]);

    // Load services on mount
    useEffect(() => {
        if (!isWails) {
            setServices([
                { name: 'helloworld.Greeter', methods: [], loading: false, expanded: false },
                {
                    name: 'grpc.reflection.v1.ServerReflection',
                    methods: [],
                    loading: false,
                    expanded: false,
                },
            ]);
            setLoading(false);
            return;
        }
        GrpcService.ListServices(server, tls)
            .then(names =>
                setServices(
                    names.map(name => ({ name, methods: [], loading: false, expanded: false }))
                )
            )
            .catch((e: unknown) => setError(String(e)))
            .finally(() => setLoading(false));
    }, [server, tls]);

    const toggleService = useCallback(
        async (idx: number) => {
            const svc = services[idx];
            if (svc.expanded) {
                setServices(prev =>
                    prev.map((s, i) => (i === idx ? { ...s, expanded: false } : s))
                );
                return;
            }
            if (svc.methods.length > 0) {
                setServices(prev => prev.map((s, i) => (i === idx ? { ...s, expanded: true } : s)));
                return;
            }
            setServices(prev =>
                prev.map((s, i) => (i === idx ? { ...s, loading: true, expanded: true } : s))
            );
            try {
                const methods = isWails
                    ? await GrpcService.ListMethods(server, svc.name, tls)
                    : ['SayHello', 'SayGoodbye'];
                setServices(prev =>
                    prev.map((s, i) => (i === idx ? { ...s, loading: false, methods } : s))
                );
            } catch {
                setServices(prev => prev.map((s, i) => (i === idx ? { ...s, loading: false } : s)));
            }
        },
        [services, server, tls]
    );

    return (
        <div
            ref={ref}
            className="absolute z-50 rounded-[var(--r-md)] overflow-hidden shadow-xl"
            style={{
                top: 'calc(100% + 4px)',
                left: 0,
                minWidth: 320,
                maxHeight: 360,
                background: 'var(--bg-1)',
                border: '1px solid var(--border-1)',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <div
                className="flex items-center gap-2 shrink-0"
                style={{
                    padding: '8px 12px',
                    borderBottom: '1px solid var(--border-0)',
                    background: 'var(--bg-2)',
                }}
            >
                <Search style={{ width: 12, height: 12, color: 'var(--text-2)', flexShrink: 0 }} />
                <span
                    style={{ fontSize: 'var(--text-sm)', color: 'var(--text-2)', fontWeight: 600 }}
                >
                    Server reflection
                </span>
                <span
                    className="ml-auto rounded"
                    style={{
                        fontSize: 10,
                        padding: '1px 6px',
                        background: 'var(--purple)',
                        color: '#fff',
                        opacity: 0.85,
                    }}
                >
                    {server}
                </span>
            </div>

            <div className="flex-1 overflow-y-auto">
                {loading && (
                    <div
                        className="flex items-center justify-center gap-2 py-8"
                        style={{ color: 'var(--text-2)', fontSize: 'var(--text-sm)' }}
                    >
                        <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" />
                        Discovering services…
                    </div>
                )}
                {!loading && error && (
                    <div
                        style={{
                            padding: 12,
                            color: 'var(--red)',
                            fontSize: 'var(--text-sm)',
                            fontFamily: 'monospace',
                        }}
                    >
                        {error}
                    </div>
                )}
                {!loading && !error && services.length === 0 && (
                    <div
                        className="flex items-center justify-center py-8"
                        style={{ color: 'var(--text-2)', fontSize: 'var(--text-sm)' }}
                    >
                        No services found
                    </div>
                )}
                {!loading &&
                    !error &&
                    services.map((svc, idx) => (
                        <div key={svc.name}>
                            <button
                                className="w-full flex items-center gap-2 transition-colors duration-100 cursor-pointer hover:bg-[var(--bg-3)]"
                                style={{ padding: '7px 12px', textAlign: 'left' }}
                                onClick={() => toggleService(idx)}
                            >
                                <ChevronRight
                                    style={{
                                        width: 12,
                                        height: 12,
                                        color: 'var(--text-2)',
                                        flexShrink: 0,
                                        transform: svc.expanded ? 'rotate(90deg)' : 'none',
                                        transition: 'transform 150ms',
                                    }}
                                />
                                <span
                                    className="flex-1 truncate"
                                    style={{
                                        fontSize: 'var(--text-sm)',
                                        fontFamily: "'JetBrains Mono Variable', monospace",
                                        color: 'var(--accent)',
                                    }}
                                >
                                    {svc.name}
                                </span>
                                <button
                                    className="shrink-0 rounded px-2 py-0.5 cursor-pointer transition-colors duration-100 hover:bg-[var(--accent)] hover:text-white"
                                    style={{
                                        fontSize: 10,
                                        color: 'var(--text-2)',
                                        background: 'var(--bg-3)',
                                    }}
                                    onClick={e => {
                                        e.stopPropagation();
                                        onSelect(svc.name, '');
                                    }}
                                >
                                    use
                                </button>
                            </button>

                            {svc.expanded && (
                                <div style={{ background: 'var(--bg-0)' }}>
                                    {svc.loading && (
                                        <div
                                            className="flex items-center gap-2 py-2"
                                            style={{
                                                paddingLeft: 32,
                                                color: 'var(--text-2)',
                                                fontSize: 'var(--text-sm)',
                                            }}
                                        >
                                            <Loader2
                                                style={{ width: 12, height: 12 }}
                                                className="animate-spin"
                                            />
                                            Loading methods…
                                        </div>
                                    )}
                                    {!svc.loading && svc.methods.length === 0 && (
                                        <div
                                            style={{
                                                paddingLeft: 32,
                                                padding: '4px 32px',
                                                color: 'var(--text-2)',
                                                fontSize: 'var(--text-sm)',
                                            }}
                                        >
                                            No methods
                                        </div>
                                    )}
                                    {svc.methods.map(method => (
                                        <button
                                            key={method}
                                            className="w-full flex items-center gap-2 transition-colors duration-100 cursor-pointer hover:bg-[var(--bg-3)]"
                                            style={{
                                                padding: '5px 12px 5px 32px',
                                                textAlign: 'left',
                                            }}
                                            onClick={() => onSelect(svc.name, method)}
                                        >
                                            <span
                                                style={{
                                                    fontSize: 'var(--text-sm)',
                                                    fontFamily:
                                                        "'JetBrains Mono Variable', monospace",
                                                    color: 'var(--purple)',
                                                }}
                                            >
                                                {method}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
            </div>
        </div>
    );
}

// ── Tabs config ───────────────────────────────────────────────────────────

const GRPC_TABS = [
    { id: 'message', label: 'Message' },
    { id: 'metadata', label: 'Metadata' },
    { id: 'options', label: 'Options' },
];

// ── GrpcPanel ─────────────────────────────────────────────────────────────

export function GrpcPanel() {
    const editing = useAppStore(selectEditing);
    const patchGrpc = useAppStore(s => s.patchGrpc);
    const setActiveTab = useAppStore(s => s.setActiveTab);
    const sendRequest = useAppStore(s => s.sendRequest);
    const responseLoading = useAppStore(s => {
        const t = s.activeTabId ? s.tabs.find(tab => tab.id === s.activeTabId) : null;
        return t?.responseLoading ?? false;
    });
    const [showDiscover, setShowDiscover] = useState(false);
    const serverWrapRef = useRef<HTMLDivElement>(null);

    if (!editing) return null;

    const activeTab =
        editing.activeTab === 'message' ||
        editing.activeTab === 'metadata' ||
        editing.activeTab === 'options'
            ? editing.activeTab
            : 'message';

    const handleDiscover = () => {
        if (!editing.grpc.server.trim()) return;
        setShowDiscover(v => !v);
    };

    const handleSelectService = (service: string, method: string) => {
        patchGrpc({ service, ...(method ? { method } : {}) });
        setShowDiscover(false);
    };

    return (
        <>
            <RequestNameBar />
            {/* Address bar */}
            <div
                className="flex items-center gap-2 shrink-0"
                style={{
                    height: 'var(--toolbar-height)',
                    padding: '0 12px',
                    borderBottom: '1px solid var(--border-0)',
                }}
            >
                <ProtocolBadge />

                {/* Server + Discover */}
                <div
                    ref={serverWrapRef}
                    style={{
                        position: 'relative',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                    }}
                >
                    <div
                        className="flex items-center rounded-[var(--r-sm)] overflow-hidden transition-colors duration-150 focus-within:border-[var(--border-focus)]"
                        style={{
                            width: 180,
                            height: 'var(--input-height)',
                            border: '1px solid var(--border-1)',
                            background: 'var(--bg-2)',
                        }}
                    >
                        <input
                            value={editing.grpc.server}
                            onChange={e => patchGrpc({ server: e.target.value })}
                            placeholder="localhost:50051"
                            className="w-full bg-transparent outline-none h-full"
                            style={{
                                padding: '0 10px',
                                fontSize: 'var(--text-base)',
                                fontFamily: "'JetBrains Mono Variable', monospace",
                                color: 'var(--text-0)',
                            }}
                            spellCheck={false}
                        />
                    </div>

                    {/* Discover button */}
                    <button
                        title="Discover services via server reflection"
                        onClick={handleDiscover}
                        disabled={!editing.grpc.server.trim()}
                        className={cn(
                            'flex items-center gap-1 rounded-[var(--r-sm)] cursor-pointer select-none transition-all duration-150',
                            'hover:bg-[var(--bg-3)] disabled:opacity-30 disabled:cursor-not-allowed',
                            showDiscover
                                ? 'bg-[var(--bg-3)] text-[var(--accent)]'
                                : 'text-[var(--text-2)]'
                        )}
                        style={{
                            height: 'var(--input-height)',
                            padding: '0 8px',
                            fontSize: 11,
                            fontWeight: 600,
                        }}
                    >
                        <Search style={{ width: 11, height: 11 }} />
                    </button>

                    {showDiscover && (
                        <DiscoverDropdown
                            server={editing.grpc.server}
                            tls={editing.grpc.tls}
                            onSelect={handleSelectService}
                            onClose={() => setShowDiscover(false)}
                        />
                    )}
                </div>

                <span style={{ color: 'var(--border-1)', flexShrink: 0 }}>/</span>

                {/* Service */}
                <div
                    className="flex items-center rounded-[var(--r-sm)] overflow-hidden transition-colors duration-150 focus-within:border-[var(--border-focus)]"
                    style={{
                        width: 150,
                        height: 'var(--input-height)',
                        border: '1px solid var(--border-1)',
                        background: 'var(--bg-2)',
                        flexShrink: 0,
                    }}
                >
                    <input
                        value={editing.grpc.service}
                        onChange={e => patchGrpc({ service: e.target.value })}
                        placeholder="package.ServiceName"
                        className="w-full bg-transparent outline-none h-full"
                        style={{
                            padding: '0 10px',
                            fontSize: 'var(--text-base)',
                            fontFamily: "'JetBrains Mono Variable', monospace",
                            color: 'var(--text-0)',
                        }}
                        spellCheck={false}
                    />
                </div>

                <span style={{ color: 'var(--border-1)', flexShrink: 0 }}>/</span>

                {/* Method */}
                <div
                    className="flex-1 flex items-center rounded-[var(--r-sm)] overflow-hidden transition-colors duration-150 focus-within:border-[var(--border-focus)]"
                    style={{
                        height: 'var(--input-height)',
                        border: '1px solid var(--border-1)',
                        background: 'var(--bg-2)',
                    }}
                >
                    <input
                        value={editing.grpc.method}
                        onChange={e => patchGrpc({ method: e.target.value })}
                        placeholder="MethodName"
                        className="w-full bg-transparent outline-none h-full"
                        style={{
                            padding: '0 10px',
                            fontSize: 'var(--text-base)',
                            fontFamily: "'JetBrains Mono Variable', monospace",
                            color: 'var(--purple)',
                        }}
                        spellCheck={false}
                    />
                </div>

                <button
                    className="flex items-center gap-1.5 rounded-[var(--r-sm)] shrink-0 cursor-pointer select-none transition-all duration-150 hover:brightness-110 active:brightness-95 disabled:opacity-50"
                    style={{
                        height: 'var(--input-height)',
                        padding: '0 14px',
                        background: 'var(--purple)',
                        color: '#fff',
                        fontSize: 'var(--text-base)',
                        fontWeight: 600,
                    }}
                    onClick={sendRequest}
                    disabled={responseLoading}
                    title={`Invoke (${shortcut('↵')})`}
                >
                    {responseLoading ? (
                        <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" />
                    ) : (
                        <Send style={{ width: 14, height: 14 }} />
                    )}
                    Invoke
                </button>
            </div>

            {/* Tabs */}
            <div
                className="flex items-center shrink-0"
                style={{ borderBottom: '1px solid var(--border-0)', paddingLeft: 4 }}
            >
                {GRPC_TABS.map(tab => (
                    <button
                        key={tab.id}
                        className={cn(
                            'relative flex items-center gap-1.5 cursor-pointer select-none transition-colors duration-150',
                            activeTab === tab.id
                                ? 'text-[var(--text-0)]'
                                : 'text-[var(--text-2)] hover:text-[var(--text-1)]'
                        )}
                        style={{
                            padding: '0 12px',
                            height: 36,
                            fontSize: 12.5,
                            fontWeight: activeTab === tab.id ? 600 : 400,
                        }}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {activeTab === tab.id && (
                            <span className="absolute bottom-0 left-0 right-0 h-[1.5px] rounded-t bg-[var(--purple)]" />
                        )}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-hidden">
                {activeTab === 'message' && <MessageTab />}
                {activeTab === 'metadata' && <MetadataTable />}
                {activeTab === 'options' && <OptionsTab />}
            </div>
        </>
    );
}
