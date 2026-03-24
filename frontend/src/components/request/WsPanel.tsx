import React from 'react';
import { Send, Plus, X, Loader2 } from 'lucide-react';
import { cn, shortcut } from '@/lib/utils';
import { useAppStore, selectEditing } from '@/store/app';
import { ProtocolBadge } from './ProtocolBadge';
import { RequestNameBar } from './RequestNameBar';

// ── Helpers ────────────────────────────────────────────────────────────────

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

// ── Headers tab ────────────────────────────────────────────────────────────

function HeadersTab() {
    const editing = useAppStore(selectEditing);
    const patchWs = useAppStore(s => s.patchWs);
    if (!editing) return null;

    const headers = editing.ws.headers;

    const addRow = () => patchWs({ headers: [...headers, { key: '', value: '', enabled: true }] });

    const removeRow = (i: number) => patchWs({ headers: headers.filter((_, idx) => idx !== i) });

    const updateRow = (i: number, field: 'key' | 'value', val: string) =>
        patchWs({
            headers: headers.map((h, idx) => (idx === i ? { ...h, [field]: val } : h)),
        });

    const toggleRow = (i: number) =>
        patchWs({
            headers: headers.map((h, idx) => (idx === i ? { ...h, enabled: !h.enabled } : h)),
        });

    return (
        <div className="flex flex-col h-full animate-tab-in" style={{ padding: 12, gap: 8 }}>
            {/* Table header */}
            <div className="flex items-center gap-2 shrink-0">
                <div style={{ width: 16 }} />
                <span
                    style={{
                        flex: 1,
                        fontSize: 'var(--text-sm)',
                        fontWeight: 600,
                        color: 'var(--text-2)',
                    }}
                >
                    Header
                </span>
                <span
                    style={{
                        flex: 1,
                        fontSize: 'var(--text-sm)',
                        fontWeight: 600,
                        color: 'var(--text-2)',
                    }}
                >
                    Value
                </span>
                <div style={{ width: 24 }} />
            </div>

            {/* Rows */}
            <div className="flex flex-col flex-1 overflow-y-auto" style={{ gap: 4 }}>
                {headers.map((h, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={h.enabled}
                            onChange={() => toggleRow(i)}
                            className="shrink-0"
                            style={{ width: 14, height: 14, accentColor: 'var(--ws-color)' }}
                        />
                        <input
                            value={h.key}
                            onChange={e => updateRow(i, 'key', e.target.value)}
                            placeholder="Header-Name"
                            className="flex-1 bg-[var(--bg-2)] outline-none rounded-[var(--r-sm)] focus:border-[var(--border-focus)] transition-colors"
                            style={{
                                height: 'var(--input-height)',
                                padding: '0 8px',
                                fontSize: 'var(--text-base)',
                                fontFamily: "'JetBrains Mono Variable', monospace",
                                color: 'var(--text-0)',
                                border: '1px solid var(--border-1)',
                            }}
                            spellCheck={false}
                        />
                        <input
                            value={h.value}
                            onChange={e => updateRow(i, 'value', e.target.value)}
                            placeholder="value"
                            className="flex-1 bg-[var(--bg-2)] outline-none rounded-[var(--r-sm)] focus:border-[var(--border-focus)] transition-colors"
                            style={{
                                height: 'var(--input-height)',
                                padding: '0 8px',
                                fontSize: 'var(--text-base)',
                                fontFamily: "'JetBrains Mono Variable', monospace",
                                color: 'var(--text-0)',
                                border: '1px solid var(--border-1)',
                            }}
                            spellCheck={false}
                        />
                        <button
                            onClick={() => removeRow(i)}
                            className="shrink-0 flex items-center justify-center rounded cursor-pointer transition-colors hover:bg-[var(--bg-3)]"
                            style={{ width: 22, height: 22 }}
                            title="Remove"
                        >
                            <X style={{ width: 12, height: 12, color: 'var(--text-2)' }} />
                        </button>
                    </div>
                ))}
            </div>

            <button
                onClick={addRow}
                className="flex items-center gap-1 shrink-0 cursor-pointer select-none transition-colors hover:text-[var(--text-1)]"
                style={{ fontSize: 'var(--text-sm)', color: 'var(--text-2)' }}
            >
                <Plus style={{ width: 12, height: 12 }} />
                Add header
            </button>
        </div>
    );
}

// ── Message tab ────────────────────────────────────────────────────────────

function MessageTab() {
    const editing = useAppStore(selectEditing);
    const patchWs = useAppStore(s => s.patchWs);
    if (!editing) return null;

    return (
        <div className="flex flex-col h-full animate-tab-in" style={{ padding: 12, gap: 12 }}>
            {/* Initial message */}
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    flex: 1,
                    overflow: 'hidden',
                }}
            >
                <Label>Initial Message (optional)</Label>
                <textarea
                    value={editing.ws.message}
                    onChange={e => patchWs({ message: e.target.value })}
                    className="flex-1 resize-none bg-[var(--bg-2)] outline-none rounded-[var(--r-sm)] leading-relaxed transition-colors duration-150 focus:border-[var(--border-focus)]"
                    style={{
                        padding: 10,
                        fontSize: 'var(--text-base)',
                        fontFamily: "'JetBrains Mono Variable', monospace",
                        color: 'var(--text-0)',
                        border: '1px solid var(--border-1)',
                    }}
                    placeholder='{"action": "subscribe", "channel": "events"}'
                    spellCheck={false}
                />
            </div>

            {/* Options */}
            <div className="flex gap-12 shrink-0">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: 140 }}>
                    <Label>Max Messages</Label>
                    <input
                        type="number"
                        min={1}
                        max={500}
                        value={editing.ws.maxMessages}
                        onChange={e =>
                            patchWs({
                                maxMessages: Math.max(1, Math.min(500, Number(e.target.value))),
                            })
                        }
                        className="w-full bg-[var(--bg-2)] outline-none rounded-[var(--r-sm)] transition-colors focus:border-[var(--border-focus)]"
                        style={{
                            height: 'var(--input-height)',
                            padding: '0 10px',
                            fontSize: 'var(--text-base)',
                            fontFamily: "'JetBrains Mono Variable', monospace",
                            color: 'var(--text-0)',
                            border: '1px solid var(--border-1)',
                        }}
                    />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: 140 }}>
                    <Label>Idle Timeout (s)</Label>
                    <input
                        type="number"
                        min={1}
                        max={300}
                        value={editing.ws.idleTimeout}
                        onChange={e =>
                            patchWs({
                                idleTimeout: Math.max(1, Math.min(300, Number(e.target.value))),
                            })
                        }
                        className="w-full bg-[var(--bg-2)] outline-none rounded-[var(--r-sm)] transition-colors focus:border-[var(--border-focus)]"
                        style={{
                            height: 'var(--input-height)',
                            padding: '0 10px',
                            fontSize: 'var(--text-base)',
                            fontFamily: "'JetBrains Mono Variable', monospace",
                            color: 'var(--text-0)',
                            border: '1px solid var(--border-1)',
                        }}
                    />
                </div>

                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                        justifyContent: 'flex-end',
                    }}
                >
                    <label
                        className="flex items-center gap-2 cursor-pointer select-none"
                        style={{ fontSize: 'var(--text-sm)', color: 'var(--text-1)' }}
                    >
                        <input
                            type="checkbox"
                            checked={editing.ws.tlsInsecure}
                            onChange={e => patchWs({ tlsInsecure: e.target.checked })}
                            style={{ accentColor: 'var(--ws-color)' }}
                        />
                        Skip TLS verification
                    </label>
                </div>
            </div>
        </div>
    );
}

// ── Tab definitions ────────────────────────────────────────────────────────

const WS_TABS = [
    { id: 'message', label: 'Message' },
    { id: 'headers', label: 'Headers' },
];

// ── WsPanel ────────────────────────────────────────────────────────────────

const WS_COLOR = '#22c55e'; // green-500

export function WsPanel() {
    const editing = useAppStore(selectEditing);
    const patchWs = useAppStore(s => s.patchWs);
    const setActiveTab = useAppStore(s => s.setActiveTab);
    const sendRequest = useAppStore(s => s.sendRequest);
    const responseLoading = useAppStore(s => {
        const t = s.activeTabId ? s.tabs.find(tab => tab.id === s.activeTabId) : null;
        return t?.responseLoading ?? false;
    });

    if (!editing) return null;

    const activeTab = WS_TABS.some(t => t.id === editing.activeTab) ? editing.activeTab : 'message';

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

                {/* URL */}
                <div
                    className="flex-1 flex items-center rounded-[var(--r-sm)] overflow-hidden transition-colors duration-150 focus-within:border-[var(--border-focus)]"
                    style={{
                        height: 'var(--input-height)',
                        border: '1px solid var(--border-1)',
                        background: 'var(--bg-2)',
                    }}
                >
                    <input
                        value={editing.ws.url}
                        onChange={e => patchWs({ url: e.target.value })}
                        placeholder="wss://example.com/socket"
                        className="w-full bg-transparent outline-none h-full"
                        style={{
                            padding: '0 12px',
                            fontSize: 'var(--text-base)',
                            fontFamily: "'JetBrains Mono Variable', monospace",
                            color: 'var(--text-0)',
                        }}
                        spellCheck={false}
                    />
                </div>

                <button
                    className="flex items-center gap-1.5 rounded-[var(--r-sm)] shrink-0 cursor-pointer select-none transition-all duration-150 hover:brightness-110 active:brightness-95 disabled:opacity-50"
                    style={{
                        height: 'var(--input-height)',
                        padding: '0 14px',
                        background: WS_COLOR,
                        color: '#0d1117',
                        fontSize: 'var(--text-base)',
                        fontWeight: 600,
                    }}
                    onClick={sendRequest}
                    disabled={responseLoading}
                    title={`Connect (${shortcut('↵')})`}
                >
                    {responseLoading ? (
                        <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" />
                    ) : (
                        <Send style={{ width: 14, height: 14 }} />
                    )}
                    Connect
                </button>
            </div>

            {/* Tabs */}
            <div
                className="flex items-center shrink-0"
                style={{ borderBottom: '1px solid var(--border-0)', paddingLeft: 4 }}
            >
                {WS_TABS.map(tab => (
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
                            <span
                                className="absolute bottom-0 left-0 right-0 h-[1.5px] rounded-t"
                                style={{ background: WS_COLOR }}
                            />
                        )}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-hidden">
                {activeTab === 'message' && <MessageTab />}
                {activeTab === 'headers' && <HeadersTab />}
            </div>
        </>
    );
}
