import React from 'react';
import { Send, Plus, X, Loader2, ChevronDown, Eye, EyeOff } from 'lucide-react';
import { cn, shortcut } from '@/lib/utils';
import { useAppStore, selectEditing, KafkaSaslMechanism } from '@/store/app';
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

function FieldInput({
    value,
    onChange,
    placeholder,
    mono = true,
}: {
    value: string;
    onChange: (_v: string) => void;
    placeholder?: string;
    mono?: boolean;
}) {
    return (
        <input
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-[var(--bg-2)] outline-none rounded-[var(--r-sm)] focus:border-[var(--border-focus)] transition-colors"
            style={{
                height: 'var(--input-height)',
                padding: '0 10px',
                fontSize: 'var(--text-base)',
                fontFamily: mono ? "'JetBrains Mono Variable', monospace" : undefined,
                color: 'var(--text-0)',
                border: '1px solid var(--border-1)',
            }}
            spellCheck={false}
        />
    );
}

// ── Mode toggle ────────────────────────────────────────────────────────────

function ModeToggle() {
    const editing = useAppStore(selectEditing);
    const patchKafka = useAppStore(s => s.patchKafka);
    const [open, setOpen] = React.useState(false);
    const ref = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (!open) return;
        const close = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, [open]);

    if (!editing) return null;
    const mode = editing.kafka.mode;

    return (
        <div ref={ref} className="relative shrink-0">
            <button
                className={cn(
                    'flex items-center gap-1.5 rounded cursor-pointer select-none transition-all duration-150',
                    'border bg-[var(--bg-2)] hover:border-[var(--border-2)]',
                    open ? 'border-[var(--border-focus)]' : 'border-[var(--border-1)]'
                )}
                style={{ height: 'var(--input-height)', padding: '0 10px' }}
                onClick={() => setOpen(!open)}
            >
                <span
                    className="rounded-full"
                    style={{
                        width: 6,
                        height: 6,
                        background: mode === 'produce' ? 'var(--orange)' : 'var(--green)',
                        flexShrink: 0,
                    }}
                />
                <span
                    style={{
                        fontSize: 'var(--text-sm)',
                        fontWeight: 600,
                        color: 'var(--text-1)',
                        textTransform: 'capitalize',
                    }}
                >
                    {mode}
                </span>
                <ChevronDown
                    className={cn('transition-transform duration-150', open && 'rotate-180')}
                    style={{ width: 10, height: 10, color: 'var(--text-2)' }}
                />
            </button>

            {open && (
                <div
                    className="absolute top-full left-0 mt-1 z-50 overflow-hidden rounded-[var(--r-md)] shadow-2xl animate-context-in"
                    style={{
                        minWidth: 120,
                        border: '1px solid var(--border-2)',
                        background: 'var(--bg-2)',
                    }}
                >
                    <div style={{ padding: 4 }}>
                        {(['produce', 'consume'] as const).map(m => (
                            <button
                                key={m}
                                className={cn(
                                    'flex items-center gap-2 w-full rounded cursor-pointer transition-colors duration-100 hover:bg-[var(--bg-3)]',
                                    mode === m ? 'bg-[var(--accent-dim)]' : ''
                                )}
                                style={{
                                    padding: '6px 10px',
                                    fontSize: 'var(--text-base)',
                                    color: 'var(--text-1)',
                                    textTransform: 'capitalize',
                                }}
                                onClick={() => {
                                    patchKafka({ mode: m });
                                    setOpen(false);
                                }}
                            >
                                <span
                                    className="rounded-full"
                                    style={{
                                        width: 6,
                                        height: 6,
                                        background:
                                            m === 'produce' ? 'var(--orange)' : 'var(--green)',
                                    }}
                                />
                                {m}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Kafka message headers table ────────────────────────────────────────────

function KafkaHeaderRow({ idx }: { idx: number }) {
    const editing = useAppStore(selectEditing);
    const patchKafka = useAppStore(s => s.patchKafka);
    if (!editing) return null;
    const h = editing.kafka.headers[idx];
    if (!h) return null;

    const update = (key: string, value: string) =>
        patchKafka({
            headers: editing.kafka.headers.map((r, i) => (i === idx ? { ...r, key, value } : r)),
        });
    const remove = () => patchKafka({ headers: editing.kafka.headers.filter((_, i) => i !== idx) });

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
                value={h.key}
                onChange={e => update(e.target.value, h.value)}
                placeholder="header-key"
                className="bg-transparent outline-none"
                spellCheck={false}
                style={{
                    padding: '6px 8px',
                    fontSize: 'var(--text-base)',
                    fontFamily: "'JetBrains Mono Variable', monospace",
                    color: 'var(--text-0)',
                }}
            />
            <input
                value={h.value}
                onChange={e => update(h.key, e.target.value)}
                placeholder="value"
                className="bg-transparent outline-none"
                spellCheck={false}
                style={{
                    padding: '6px 8px',
                    fontSize: 'var(--text-base)',
                    fontFamily: "'JetBrains Mono Variable', monospace",
                    color: 'var(--text-1)',
                }}
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

function KafkaHeadersTable() {
    const editing = useAppStore(selectEditing);
    const patchKafka = useAppStore(s => s.patchKafka);
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
                {editing.kafka.headers.map((_, idx) => (
                    <KafkaHeaderRow key={idx} idx={idx} />
                ))}
                {editing.kafka.headers.length === 0 && (
                    <div
                        className="flex items-center justify-center py-10"
                        style={{ color: 'var(--text-2)', fontSize: 'var(--text-sm)' }}
                    >
                        No Kafka message headers
                    </div>
                )}
            </div>
            <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border-0)' }}>
                <button
                    className="flex items-center gap-1.5 cursor-pointer transition-colors duration-150 hover:text-[var(--accent)]"
                    style={{ fontSize: 'var(--text-sm)', color: 'var(--text-2)' }}
                    onClick={() =>
                        patchKafka({
                            headers: [
                                ...editing.kafka.headers,
                                { key: '', value: '', enabled: true },
                            ],
                        })
                    }
                >
                    <Plus style={{ width: 12, height: 12 }} />
                    Add header
                </button>
            </div>
        </div>
    );
}

// ── Message tab (produce) ──────────────────────────────────────────────────

function FormatToggle() {
    const editing = useAppStore(selectEditing);
    const patchKafka = useAppStore(s => s.patchKafka);
    if (!editing) return null;
    const fmt = editing.kafka.messageFormat;

    return (
        <div
            className="flex items-center gap-1 shrink-0"
            style={{ background: 'var(--bg-3)', borderRadius: 'var(--r-sm)', padding: 2 }}
        >
            {(['json', 'proto'] as const).map(f => (
                <button
                    key={f}
                    onClick={() => patchKafka({ messageFormat: f })}
                    className={cn(
                        'cursor-pointer rounded-[var(--r-sm)] transition-colors duration-150'
                    )}
                    style={{
                        padding: '2px 10px',
                        fontSize: 11.5,
                        fontWeight: 600,
                        height: 22,
                        background: fmt === f ? 'var(--bg-1)' : 'transparent',
                        color: fmt === f ? 'var(--text-0)' : 'var(--text-2)',
                        border: fmt === f ? '1px solid var(--border-1)' : '1px solid transparent',
                    }}
                >
                    {f === 'json' ? 'JSON' : 'Protobuf'}
                </button>
            ))}
        </div>
    );
}

function ProduceMessage() {
    const editing = useAppStore(selectEditing);
    const patchKafka = useAppStore(s => s.patchKafka);
    if (!editing) return null;
    const isProto = editing.kafka.messageFormat === 'proto';

    return (
        <div className="flex flex-col h-full animate-tab-in" style={{ padding: 12, gap: 12 }}>
            {/* Format + key row */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, flexShrink: 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                    <Label>
                        Message Key{' '}
                        <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                            (optional)
                        </span>
                    </Label>
                    <FieldInput
                        value={editing.kafka.key}
                        onChange={v => patchKafka({ key: v })}
                        placeholder="partition key…"
                    />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                    <Label>Format</Label>
                    <FormatToggle />
                </div>
            </div>

            {/* Proto fields (when format = proto) */}
            {isProto && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0 }}>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                            <Label>Message Type</Label>
                            <FieldInput
                                value={editing.kafka.protoMessageType}
                                onChange={v => patchKafka({ protoMessageType: v })}
                                placeholder="mypackage.MyMessage"
                            />
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <Label>Proto Schema</Label>
                        <textarea
                            value={editing.kafka.protoSchema}
                            onChange={e => patchKafka({ protoSchema: e.target.value })}
                            rows={5}
                            className="resize-none bg-[var(--bg-2)] outline-none rounded-[var(--r-sm)] leading-relaxed transition-colors duration-150 focus:border-[var(--border-focus)]"
                            style={{
                                padding: 10,
                                fontSize: 'var(--text-base)',
                                fontFamily: "'JetBrains Mono Variable', monospace",
                                color: 'var(--text-0)',
                                border: '1px solid var(--border-1)',
                            }}
                            placeholder={
                                'syntax = "proto3";\npackage mypackage;\n\nmessage MyMessage {\n  string field = 1;\n}'
                            }
                            spellCheck={false}
                        />
                    </div>
                </div>
            )}

            {/* Message value */}
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    flex: 1,
                    overflow: 'hidden',
                }}
            >
                <Label>
                    Message Value{' '}
                    {isProto && (
                        <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                            (JSON → serialised to proto)
                        </span>
                    )}
                </Label>
                <textarea
                    value={editing.kafka.message}
                    onChange={e => patchKafka({ message: e.target.value })}
                    className="flex-1 resize-none bg-[var(--bg-2)] outline-none rounded-[var(--r-sm)] leading-relaxed transition-colors duration-150 focus:border-[var(--border-focus)]"
                    style={{
                        padding: 10,
                        fontSize: 'var(--text-base)',
                        fontFamily: "'JetBrains Mono Variable', monospace",
                        color: 'var(--text-0)',
                        border: '1px solid var(--border-1)',
                    }}
                    placeholder={'{\n  "event": "user.created",\n  "data": {}\n}'}
                    spellCheck={false}
                />
            </div>
        </div>
    );
}

// ── Consume config tab ─────────────────────────────────────────────────────

function ConsumeConfig() {
    const editing = useAppStore(selectEditing);
    const patchKafka = useAppStore(s => s.patchKafka);
    if (!editing) return null;

    return (
        <div className="flex flex-col gap-5 animate-tab-in" style={{ padding: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Label>Consumer Group</Label>
                <FieldInput
                    value={editing.kafka.group}
                    onChange={v => patchKafka({ group: v })}
                    placeholder="my-consumer-group"
                />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Label>Auto Offset Reset</Label>
                <div className="flex items-center gap-2">
                    {(['earliest', 'latest'] as const).map(o => (
                        <button
                            key={o}
                            className={cn(
                                'rounded cursor-pointer transition-all duration-150',
                                editing.kafka.offset === o
                                    ? 'bg-[var(--accent-dim)] text-[var(--accent)]'
                                    : 'text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--bg-3)]'
                            )}
                            style={{
                                padding: '4px 12px',
                                fontSize: 'var(--text-sm)',
                                fontWeight: 500,
                            }}
                            onClick={() => patchKafka({ offset: o })}
                        >
                            {o}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ── Auth tab ───────────────────────────────────────────────────────────────

const SASL_MECHANISMS: { id: KafkaSaslMechanism; label: string }[] = [
    { id: 'none', label: 'None' },
    { id: 'plain', label: 'PLAIN' },
    { id: 'scram-sha-256', label: 'SCRAM-SHA-256' },
    { id: 'scram-sha-512', label: 'SCRAM-SHA-512' },
];

function AuthTab() {
    const editing = useAppStore(selectEditing);
    const patchKafka = useAppStore(s => s.patchKafka);
    const [showPass, setShowPass] = React.useState(false);
    if (!editing) return null;

    const { saslMechanism, saslUsername, saslPassword, tls } = editing.kafka;
    const hasSasl = saslMechanism !== 'none';

    return (
        <div className="flex flex-col gap-5 animate-tab-in" style={{ padding: 16 }}>
            {/* TLS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Label>Security</Label>
                <label
                    className="flex items-center gap-2.5 cursor-pointer select-none"
                    style={{ width: 'fit-content' }}
                >
                    <div
                        className="relative transition-colors duration-150"
                        style={{
                            width: 32,
                            height: 18,
                            borderRadius: 9,
                            background: tls ? 'var(--accent)' : 'var(--bg-3)',
                            border: '1px solid var(--border-1)',
                        }}
                        onClick={() => patchKafka({ tls: !tls })}
                    >
                        <div
                            style={{
                                position: 'absolute',
                                top: 2,
                                left: tls ? 16 : 2,
                                width: 12,
                                height: 12,
                                borderRadius: '50%',
                                background: 'white',
                                transition: 'left 0.15s',
                            }}
                        />
                    </div>
                    <span style={{ fontSize: 'var(--text-base)', color: 'var(--text-1)' }}>
                        TLS / SSL
                    </span>
                </label>
            </div>

            {/* SASL mechanism */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Label>SASL Mechanism</Label>
                <div className="flex items-center gap-2 flex-wrap">
                    {SASL_MECHANISMS.map(m => (
                        <button
                            key={m.id}
                            onClick={() => patchKafka({ saslMechanism: m.id })}
                            className={cn(
                                'rounded cursor-pointer transition-all duration-150',
                                saslMechanism === m.id
                                    ? 'bg-[var(--accent-dim)] text-[var(--accent)]'
                                    : 'text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--bg-3)]'
                            )}
                            style={{
                                padding: '4px 12px',
                                fontSize: 'var(--text-sm)',
                                fontWeight: 500,
                                border: '1px solid',
                                borderColor:
                                    saslMechanism === m.id ? 'var(--accent)' : 'var(--border-1)',
                            }}
                        >
                            {m.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Username / Password (only when SASL enabled) */}
            {hasSasl && (
                <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <Label>Username</Label>
                        <FieldInput
                            value={saslUsername}
                            onChange={v => patchKafka({ saslUsername: v })}
                            placeholder="kafka-user"
                            mono={false}
                        />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <Label>Password</Label>
                        <div className="relative">
                            <input
                                type={showPass ? 'text' : 'password'}
                                value={saslPassword}
                                onChange={e => patchKafka({ saslPassword: e.target.value })}
                                placeholder="••••••••"
                                className="w-full bg-[var(--bg-2)] outline-none rounded-[var(--r-sm)] focus:border-[var(--border-focus)] transition-colors"
                                style={{
                                    height: 'var(--input-height)',
                                    padding: '0 36px 0 10px',
                                    fontSize: 'var(--text-base)',
                                    color: 'var(--text-0)',
                                    border: '1px solid var(--border-1)',
                                }}
                                spellCheck={false}
                            />
                            <button
                                className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer transition-colors hover:text-[var(--text-1)]"
                                style={{ color: 'var(--text-2)' }}
                                onClick={() => setShowPass(v => !v)}
                            >
                                {showPass ? (
                                    <EyeOff style={{ width: 14, height: 14 }} />
                                ) : (
                                    <Eye style={{ width: 14, height: 14 }} />
                                )}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

// ── Tabs config ────────────────────────────────────────────────────────────

const PRODUCE_TABS = [
    { id: 'message', label: 'Message' },
    { id: 'headers', label: 'Headers' },
    { id: 'auth', label: 'Auth' },
];
const CONSUME_TABS = [
    { id: 'message', label: 'Config' },
    { id: 'auth', label: 'Auth' },
];

// ── KafkaPanel ─────────────────────────────────────────────────────────────

export function KafkaPanel() {
    const editing = useAppStore(selectEditing);
    const patchKafka = useAppStore(s => s.patchKafka);
    const setActiveTab = useAppStore(s => s.setActiveTab);
    const sendRequest = useAppStore(s => s.sendRequest);
    const responseLoading = useAppStore(s => {
        const t = s.activeTabId ? s.tabs.find(tab => tab.id === s.activeTabId) : null;
        return t?.responseLoading ?? false;
    });

    if (!editing) return null;

    const mode = editing.kafka.mode;
    const tabs = mode === 'produce' ? PRODUCE_TABS : CONSUME_TABS;
    const activeTab = tabs.some(t => t.id === editing.activeTab) ? editing.activeTab : tabs[0].id;

    // Auth indicator: show dot on Auth tab when SASL or TLS is configured
    const hasAuth = editing.kafka.saslMechanism !== 'none' || editing.kafka.tls;

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

                <div
                    className="flex items-center rounded-[var(--r-sm)] overflow-hidden transition-colors duration-150 focus-within:border-[var(--border-focus)]"
                    style={{
                        width: 200,
                        height: 'var(--input-height)',
                        border: '1px solid var(--border-1)',
                        background: 'var(--bg-2)',
                        flexShrink: 0,
                    }}
                >
                    <input
                        value={editing.kafka.bootstrap}
                        onChange={e => patchKafka({ bootstrap: e.target.value })}
                        placeholder="localhost:9092"
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

                <div
                    className="flex-1 flex items-center rounded-[var(--r-sm)] overflow-hidden transition-colors duration-150 focus-within:border-[var(--border-focus)]"
                    style={{
                        height: 'var(--input-height)',
                        border: '1px solid var(--border-1)',
                        background: 'var(--bg-2)',
                    }}
                >
                    <input
                        value={editing.kafka.topic}
                        onChange={e => patchKafka({ topic: e.target.value })}
                        placeholder="topic-name"
                        className="w-full bg-transparent outline-none h-full"
                        style={{
                            padding: '0 10px',
                            fontSize: 'var(--text-base)',
                            fontFamily: "'JetBrains Mono Variable', monospace",
                            color: 'var(--orange)',
                        }}
                        spellCheck={false}
                    />
                </div>

                <ModeToggle />

                <button
                    className="flex items-center gap-1.5 rounded-[var(--r-sm)] shrink-0 cursor-pointer select-none transition-all duration-150 hover:brightness-110 active:brightness-95 disabled:opacity-50"
                    style={{
                        height: 'var(--input-height)',
                        padding: '0 14px',
                        background: 'var(--orange)',
                        color: '#0d1117',
                        fontSize: 'var(--text-base)',
                        fontWeight: 600,
                    }}
                    onClick={sendRequest}
                    disabled={responseLoading}
                    title={`${mode === 'produce' ? 'Produce' : 'Consume'} (${shortcut('↵')})`}
                >
                    {responseLoading ? (
                        <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" />
                    ) : (
                        <Send style={{ width: 14, height: 14 }} />
                    )}
                    {mode === 'produce' ? 'Produce' : 'Consume'}
                </button>
            </div>

            {/* Tab bar */}
            <div
                className="flex items-center shrink-0"
                style={{ borderBottom: '1px solid var(--border-0)', paddingLeft: 4 }}
            >
                {tabs.map(tab => {
                    const isActive = activeTab === tab.id;
                    const showDot = tab.id === 'auth' && hasAuth;
                    return (
                        <button
                            key={tab.id}
                            className={cn(
                                'relative flex items-center gap-1.5 cursor-pointer select-none transition-colors duration-150',
                                isActive
                                    ? 'text-[var(--text-0)]'
                                    : 'text-[var(--text-2)] hover:text-[var(--text-1)]'
                            )}
                            style={{
                                padding: '0 12px',
                                height: 36,
                                fontSize: 12.5,
                                fontWeight: isActive ? 600 : 400,
                            }}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            {isActive && (
                                <span className="absolute bottom-0 left-0 right-0 h-[1.5px] rounded-t bg-[var(--orange)]" />
                            )}
                            {tab.label}
                            {showDot && (
                                <span
                                    className="rounded-full"
                                    style={{
                                        width: 5,
                                        height: 5,
                                        background: 'var(--orange)',
                                        flexShrink: 0,
                                    }}
                                />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-hidden">
                {mode === 'produce' && activeTab === 'message' && <ProduceMessage />}
                {mode === 'produce' && activeTab === 'headers' && <KafkaHeadersTable />}
                {activeTab === 'auth' && <AuthTab />}
                {mode === 'consume' && activeTab === 'message' && <ConsumeConfig />}
            </div>
        </>
    );
}
