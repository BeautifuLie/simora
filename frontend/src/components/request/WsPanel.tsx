import React, { useRef, useEffect, useState } from 'react';
import { Plus, X, Loader2, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore, selectEditing, selectActiveTab } from '@/store/app';
import type { WsMessage } from '@/store/app';
import { ProtocolBadge } from './ProtocolBadge';
import { RequestNameBar } from './RequestNameBar';
import { VarInput } from '@/components/ui/VarInput';

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

// ── Tab definitions ────────────────────────────────────────────────────────

const WS_SETUP_TABS = [
    { id: 'headers', label: 'Headers' },
    { id: 'options', label: 'Options' },
];

// ── Disconnected view (setup) ──────────────────────────────────────────────

const WS_COLOR = '#22c55e'; // green-500

function DisconnectedView() {
    const editing = useAppStore(selectEditing);
    const patchWs = useAppStore(s => s.patchWs);
    const setActiveTab = useAppStore(s => s.setActiveTab);
    const wsConnect = useAppStore(s => s.wsConnect);
    const wsState = useAppStore(s => selectActiveTab(s)?.wsState ?? 'idle');

    if (!editing) return null;

    const activeTab = WS_SETUP_TABS.some(t => t.id === editing.activeTab)
        ? editing.activeTab
        : 'headers';

    const isConnecting = wsState === 'connecting';

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
                <div className="flex-1">
                    <VarInput
                        value={editing.ws.url}
                        onChange={url => patchWs({ url })}
                        placeholder="ws://example.com/socket"
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
                    onClick={wsConnect}
                    disabled={isConnecting || !editing.ws.url.trim()}
                    title="Connect"
                >
                    {isConnecting ? (
                        <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" />
                    ) : (
                        <Wifi style={{ width: 14, height: 14 }} />
                    )}
                    {isConnecting ? 'Connecting…' : 'Connect'}
                </button>
            </div>

            {/* Tabs */}
            <div
                className="flex items-center shrink-0"
                style={{ borderBottom: '1px solid var(--border-0)', paddingLeft: 4 }}
            >
                {WS_SETUP_TABS.map(tab => (
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
                {activeTab === 'headers' && <HeadersTab />}
                {activeTab === 'options' && (
                    <div
                        className="flex flex-col h-full animate-tab-in"
                        style={{ padding: 16, gap: 16 }}
                    >
                        {/* Initial message */}
                        <div
                            className="flex flex-col"
                            style={{ gap: 6, flex: 1, overflow: 'hidden' }}
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

                        {/* TLS option */}
                        <label
                            className="flex items-center gap-2 cursor-pointer select-none shrink-0"
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
                )}
            </div>
        </>
    );
}

// ── Message bubble ─────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: WsMessage }) {
    const isSent = msg.direction === 'sent';
    const time = new Date(msg.timestamp).toLocaleTimeString();

    return (
        <div
            className={cn('flex flex-col', isSent ? 'items-end' : 'items-start')}
            style={{ gap: 2 }}
        >
            <div
                className="flex items-center gap-1.5"
                style={{ fontSize: 'var(--text-sm)', color: 'var(--text-2)' }}
            >
                <span>{isSent ? '→ sent' : '← received'}</span>
                <span>{time}</span>
            </div>
            <div
                className="max-w-[85%] break-all"
                style={{
                    padding: '6px 10px',
                    borderRadius: 'var(--r-sm)',
                    fontSize: 'var(--text-base)',
                    fontFamily: "'JetBrains Mono Variable', monospace",
                    background: isSent ? 'var(--accent)' : 'var(--bg-2)',
                    color: isSent ? 'var(--accent-fg, #0d1117)' : 'var(--text-0)',
                    border: isSent ? 'none' : '1px solid var(--border-1)',
                    whiteSpace: 'pre-wrap',
                }}
            >
                {msg.data}
            </div>
        </div>
    );
}

// ── Connected view ─────────────────────────────────────────────────────────

function ConnectedView() {
    const editing = useAppStore(selectEditing);
    const wsState = useAppStore(s => selectActiveTab(s)?.wsState ?? 'idle');
    const wsMessages = useAppStore(s => selectActiveTab(s)?.wsMessages ?? []);
    const wsDisconnect = useAppStore(s => s.wsDisconnect);
    const wsSend = useAppStore(s => s.wsSend);

    const [draft, setDraft] = useState('');
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [wsMessages.length]);

    if (!editing) return null;

    const handleSend = () => {
        if (!draft.trim()) return;

        wsSend(draft);
        setDraft('');
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <>
            <RequestNameBar />

            {/* Status bar */}
            <div
                className="flex items-center gap-2 shrink-0"
                style={{
                    height: 'var(--toolbar-height)',
                    padding: '0 12px',
                    borderBottom: '1px solid var(--border-0)',
                }}
            >
                {/* Green dot + URL */}
                <div className="flex items-center gap-2 flex-1 overflow-hidden">
                    <span
                        className="shrink-0 inline-block rounded-full"
                        style={{ width: 8, height: 8, background: WS_COLOR }}
                    />
                    <span
                        className="truncate"
                        style={{
                            fontSize: 'var(--text-sm)',
                            fontFamily: "'JetBrains Mono Variable', monospace",
                            color: 'var(--text-1)',
                        }}
                    >
                        {editing.ws.url}
                    </span>
                    <span
                        style={{
                            fontSize: 'var(--text-sm)',
                            color: WS_COLOR,
                            fontWeight: 600,
                            flexShrink: 0,
                        }}
                    >
                        Connected
                    </span>
                </div>

                <button
                    className="flex items-center gap-1.5 rounded-[var(--r-sm)] shrink-0 cursor-pointer select-none transition-all duration-150 hover:brightness-110 active:brightness-95"
                    style={{
                        height: 'var(--input-height)',
                        padding: '0 12px',
                        background: '#ef4444',
                        color: '#fff',
                        fontSize: 'var(--text-base)',
                        fontWeight: 600,
                    }}
                    onClick={wsDisconnect}
                    title="Disconnect"
                >
                    <WifiOff style={{ width: 14, height: 14 }} />
                    Disconnect
                </button>
            </div>

            {/* Message history */}
            <div
                className="flex-1 overflow-y-auto"
                style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}
            >
                {wsMessages.length === 0 ? (
                    <div
                        className="flex flex-col items-center justify-center h-full"
                        style={{ color: 'var(--text-2)', fontSize: 'var(--text-sm)', gap: 6 }}
                    >
                        <Wifi style={{ width: 32, height: 32, opacity: 0.3 }} />
                        <span>Connected — waiting for messages…</span>
                    </div>
                ) : (
                    wsMessages.map(msg => <MessageBubble key={msg.id} msg={msg} />)
                )}
                <div ref={bottomRef} />
            </div>

            {/* Send bar */}
            <div
                className="flex items-end gap-2 shrink-0"
                style={{
                    padding: '8px 12px',
                    borderTop: '1px solid var(--border-0)',
                }}
            >
                <textarea
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                        wsState === 'connected'
                            ? 'Type a message… (Enter to send, Shift+Enter for newline)'
                            : 'Disconnected'
                    }
                    disabled={wsState !== 'connected'}
                    rows={1}
                    className="flex-1 resize-none bg-[var(--bg-2)] outline-none rounded-[var(--r-sm)] transition-colors focus:border-[var(--border-focus)] disabled:opacity-50"
                    style={{
                        padding: '6px 10px',
                        fontSize: 'var(--text-base)',
                        fontFamily: "'JetBrains Mono Variable', monospace",
                        color: 'var(--text-0)',
                        border: '1px solid var(--border-1)',
                        lineHeight: 1.5,
                        maxHeight: 120,
                        overflow: 'auto',
                    }}
                    spellCheck={false}
                />
                <button
                    className="flex items-center gap-1.5 rounded-[var(--r-sm)] shrink-0 cursor-pointer select-none transition-all duration-150 hover:brightness-110 active:brightness-95 disabled:opacity-50"
                    style={{
                        height: 'var(--input-height)',
                        padding: '0 14px',
                        background: WS_COLOR,
                        color: '#0d1117',
                        fontSize: 'var(--text-base)',
                        fontWeight: 600,
                        flexShrink: 0,
                    }}
                    onClick={handleSend}
                    disabled={wsState !== 'connected' || !draft.trim()}
                    title="Send (Enter)"
                >
                    Send
                </button>
            </div>
        </>
    );
}

// ── WsPanel ────────────────────────────────────────────────────────────────

export function WsPanel() {
    const wsState = useAppStore(s => selectActiveTab(s)?.wsState ?? 'idle');
    const editing = useAppStore(selectEditing);

    if (!editing) return null;

    const isConnected = wsState === 'connected' || wsState === 'connecting';

    return (
        <div className="flex flex-col h-full">
            {isConnected ? <ConnectedView /> : <DisconnectedView />}
        </div>
    );
}
