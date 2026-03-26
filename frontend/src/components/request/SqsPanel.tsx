import React from 'react';
import { Send, Inbox, Plus, X, Loader2, ChevronDown } from 'lucide-react';
import { cn, shortcut } from '@/lib/utils';
import { useAppStore, selectEditing } from '@/store/app';
import { resolveVars } from '@/store/types';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { ProtocolBadge } from './ProtocolBadge';
import { RequestNameBar } from './RequestNameBar';
import { VarInput } from '@/components/ui/VarInput';
import { VarTextarea } from '@/components/ui/VarTextarea';

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

// ── Var helpers ────────────────────────────────────────────────────────────

function useVarProps() {
    const { environments, activeEnvId, organizations } = useAppStore();
    const path = useAppStore(s => {
        const tab = s.activeTabId ? s.tabs.find(t => t.id === s.activeTabId) : null;
        return tab?.path ?? null;
    });
    const activeEnv = environments.find(e => e.id === activeEnvId) ?? null;
    const collectionVars = React.useMemo(() => {
        if (!path) return [];
        for (const org of organizations) {
            for (const proj of org.projects ?? []) {
                const col = proj.collections?.find(c => c.id === path.collectionId);
                if (col) return (col as any).variables ?? [];
            }
        }
        return [];
    }, [path, organizations]);
    return {
        activeEnv,
        envVars: activeEnv?.variables ?? [],
        collectionVars,
    };
}

// ── Region selector ───────────────────────────────────────────────────────

const AWS_REGIONS = [
    'us-east-1',
    'us-east-2',
    'us-west-1',
    'us-west-2',
    'eu-west-1',
    'eu-west-2',
    'eu-central-1',
    'ap-southeast-1',
    'ap-southeast-2',
    'ap-northeast-1',
];

function RegionSelector() {
    const editing = useAppStore(selectEditing);
    const patchSqs = useAppStore(s => s.patchSqs);
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
                    style={{
                        fontSize: 'var(--text-sm)',
                        fontFamily: "'JetBrains Mono Variable', monospace",
                        color: 'var(--text-1)',
                    }}
                >
                    {editing.sqs.region}
                </span>
                <ChevronDown
                    className={cn('transition-transform duration-150', open && 'rotate-180')}
                    style={{ width: 10, height: 10, color: 'var(--text-2)' }}
                />
            </button>

            {open && (
                <div
                    className="absolute top-full right-0 mt-1 z-50 overflow-y-auto rounded-[var(--r-md)] shadow-2xl animate-context-in"
                    style={{
                        maxHeight: 220,
                        minWidth: 150,
                        border: '1px solid var(--border-2)',
                        background: 'var(--bg-2)',
                    }}
                >
                    <div style={{ padding: 4 }}>
                        {AWS_REGIONS.map(r => (
                            <button
                                key={r}
                                className={cn(
                                    'flex items-center w-full rounded cursor-pointer transition-colors duration-100 hover:bg-[var(--bg-3)]',
                                    editing.sqs.region === r
                                        ? 'bg-[var(--accent-dim)] text-[var(--accent)]'
                                        : 'text-[var(--text-1)]'
                                )}
                                style={{
                                    padding: '6px 10px',
                                    fontSize: 'var(--text-sm)',
                                    fontFamily: "'JetBrains Mono Variable', monospace",
                                }}
                                onClick={() => {
                                    patchSqs({ region: r });
                                    setOpen(false);
                                }}
                            >
                                {r}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Message tab ───────────────────────────────────────────────────────────

function SqsMessageTab() {
    const editing = useAppStore(selectEditing);
    const patchSqs = useAppStore(s => s.patchSqs);
    const { activeEnv, envVars, collectionVars } = useVarProps();
    if (!editing) return null;

    const isReceive = editing.method === 'GET';
    const resolvedQueueUrl = resolveVars(editing.sqs.queueUrl, activeEnv, collectionVars);
    const numInputStyle = {
        height: 'var(--input-height)',
        padding: '0 10px',
        fontSize: 'var(--text-base)',
        fontFamily: "'JetBrains Mono Variable', monospace",
        color: 'var(--text-0)',
        border: '1px solid var(--border-1)',
    };

    if (isReceive) {
        return (
            <div className="flex flex-col animate-tab-in" style={{ padding: 12, gap: 12 }}>
                <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: 160 }}>
                        <Label>Max Messages</Label>
                        <input
                            type="number"
                            min={0}
                            max={10}
                            value={editing.sqs.maxMessages}
                            onChange={e =>
                                patchSqs({
                                    maxMessages: Math.max(0, Math.min(10, Number(e.target.value))),
                                })
                            }
                            className="w-full bg-[var(--bg-2)] outline-none rounded-[var(--r-sm)] transition-colors focus:border-[var(--border-focus)]"
                            style={numInputStyle}
                            placeholder="0 = default (10)"
                        />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: 160 }}>
                        <Label>Wait Seconds</Label>
                        <input
                            type="number"
                            min={0}
                            max={20}
                            value={editing.sqs.waitSeconds}
                            onChange={e =>
                                patchSqs({
                                    waitSeconds: Math.max(0, Math.min(20, Number(e.target.value))),
                                })
                            }
                            className="w-full bg-[var(--bg-2)] outline-none rounded-[var(--r-sm)] transition-colors focus:border-[var(--border-focus)]"
                            style={numInputStyle}
                            placeholder="0 = short poll"
                        />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full animate-tab-in" style={{ padding: 12, gap: 12 }}>
            {/* Message body */}
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    flex: 1,
                    overflow: 'hidden',
                }}
            >
                <Label>Message Body</Label>
                <VarTextarea
                    value={editing.sqs.body}
                    onChange={v => patchSqs({ body: v })}
                    className="flex-1"
                    style={{
                        padding: 10,
                        fontSize: 'var(--text-base)',
                        fontFamily: "'JetBrains Mono Variable', monospace",
                        color: 'var(--text-0)',
                        border: '1px solid var(--border-1)',
                    }}
                    placeholder={'{\n  "action": "process",\n  "payload": {}\n}'}
                    envVars={envVars}
                    collectionVars={collectionVars}
                />
            </div>

            {/* Delay */}
            <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: 140 }}>
                    <Label>Delay Seconds</Label>
                    <input
                        type="number"
                        min={0}
                        max={900}
                        value={editing.sqs.delaySeconds}
                        onChange={e =>
                            patchSqs({
                                delaySeconds: Math.max(0, Math.min(900, Number(e.target.value))),
                            })
                        }
                        className="w-full bg-[var(--bg-2)] outline-none rounded-[var(--r-sm)] transition-colors focus:border-[var(--border-focus)]"
                        style={numInputStyle}
                    />
                </div>
            </div>

            {/* FIFO fields — only shown when the (resolved) queue URL ends with .fifo */}
            {resolvedQueueUrl.toLowerCase().endsWith('.fifo') && (
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                        flexShrink: 0,
                        padding: '10px 12px',
                        borderRadius: 'var(--r-sm)',
                        background: 'color-mix(in srgb, var(--yellow) 6%, transparent)',
                        border: '1px solid color-mix(in srgb, var(--yellow) 20%, transparent)',
                    }}
                >
                    <span
                        style={{
                            fontSize: 11,
                            fontWeight: 600,
                            letterSpacing: '0.05em',
                            textTransform: 'uppercase',
                            color: 'var(--yellow)',
                        }}
                    >
                        FIFO Queue
                    </span>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                            <Label>Message Group ID</Label>
                            <input
                                value={editing.sqs.messageGroupId}
                                onChange={e => patchSqs({ messageGroupId: e.target.value })}
                                placeholder="Required for FIFO queues"
                                className="w-full bg-[var(--bg-2)] outline-none rounded-[var(--r-sm)] transition-colors focus:border-[var(--border-focus)]"
                                style={{
                                    height: 'var(--input-height)',
                                    padding: '0 10px',
                                    fontSize: 'var(--text-base)',
                                    fontFamily: "'JetBrains Mono Variable', monospace",
                                    color: 'var(--text-0)',
                                    border: '1px solid var(--border-1)',
                                }}
                                spellCheck={false}
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                            <Label>Deduplication ID</Label>
                            <input
                                value={editing.sqs.messageDeduplicationId}
                                onChange={e => patchSqs({ messageDeduplicationId: e.target.value })}
                                placeholder="Leave empty if content-based"
                                className="w-full bg-[var(--bg-2)] outline-none rounded-[var(--r-sm)] transition-colors focus:border-[var(--border-focus)]"
                                style={{
                                    height: 'var(--input-height)',
                                    padding: '0 10px',
                                    fontSize: 'var(--text-base)',
                                    fontFamily: "'JetBrains Mono Variable', monospace",
                                    color: 'var(--text-0)',
                                    border: '1px solid var(--border-1)',
                                }}
                                spellCheck={false}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Attributes tab ────────────────────────────────────────────────────────

type AttrType = 'String' | 'Number' | 'Binary';

function AttrTypeBtn({
    value,
    current,
    onClick,
}: {
    value: AttrType;
    current: AttrType;
    onClick: () => void;
}) {
    return (
        <button
            className={cn(
                'rounded cursor-pointer transition-colors duration-100 text-xs',
                current === value
                    ? 'bg-[var(--accent-dim)] text-[var(--accent)]'
                    : 'text-[var(--text-2)] hover:bg-[var(--bg-3)]'
            )}
            style={{ padding: '1px 5px', fontWeight: 500 }}
            onClick={onClick}
        >
            {value}
        </button>
    );
}

function AttrRow({ idx }: { idx: number }) {
    const editing = useAppStore(selectEditing);
    const patchSqs = useAppStore(s => s.patchSqs);
    if (!editing) return null;
    const a = editing.sqs.attributes[idx];
    if (!a) return null;

    const update = (patch: Partial<typeof a>) =>
        patchSqs({
            attributes: editing.sqs.attributes.map((r, i) => (i === idx ? { ...r, ...patch } : r)),
        });
    const remove = () =>
        patchSqs({ attributes: editing.sqs.attributes.filter((_, i) => i !== idx) });

    return (
        <div
            className="group grid items-center hover:bg-[var(--bg-3)] transition-colors duration-100"
            style={{
                gridTemplateColumns: '1fr 1fr 80px 24px',
                borderBottom: '1px solid var(--border-0)',
                minHeight: 32,
            }}
        >
            <input
                value={a.key}
                onChange={e => update({ key: e.target.value })}
                placeholder="AttributeName"
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
                value={a.value}
                onChange={e => update({ value: e.target.value })}
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
            <div className="flex items-center gap-0.5 px-1">
                {(['String', 'Number', 'Binary'] as AttrType[]).map(t => (
                    <AttrTypeBtn
                        key={t}
                        value={t}
                        current={a.type}
                        onClick={() => update({ type: t })}
                    />
                ))}
            </div>
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

function AttributesTab() {
    const editing = useAppStore(selectEditing);
    const patchSqs = useAppStore(s => s.patchSqs);
    if (!editing) return null;

    return (
        <div className="flex flex-col h-full animate-tab-in">
            <div
                className="grid shrink-0"
                style={{
                    gridTemplateColumns: '1fr 1fr 80px 24px',
                    borderBottom: '1px solid var(--border-0)',
                    padding: '6px 0',
                }}
            >
                <Label>Name</Label>
                <Label>Value</Label>
                <Label>Type</Label>
                <span />
            </div>
            <div className="flex-1 overflow-y-auto">
                {editing.sqs.attributes.map((_, idx) => (
                    <AttrRow key={idx} idx={idx} />
                ))}
                {editing.sqs.attributes.length === 0 && (
                    <div
                        className="flex items-center justify-center py-10"
                        style={{ color: 'var(--text-2)', fontSize: 'var(--text-sm)' }}
                    >
                        No message attributes
                    </div>
                )}
            </div>
            <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border-0)' }}>
                <button
                    className="flex items-center gap-1.5 cursor-pointer transition-colors duration-150 hover:text-[var(--accent)]"
                    style={{ fontSize: 'var(--text-sm)', color: 'var(--text-2)' }}
                    onClick={() =>
                        patchSqs({
                            attributes: [
                                ...editing.sqs.attributes,
                                { key: '', value: '', type: 'String', enabled: true },
                            ],
                        })
                    }
                >
                    <Plus style={{ width: 12, height: 12 }} />
                    Add attribute
                </button>
            </div>
        </div>
    );
}

// ── Auth tab ──────────────────────────────────────────────────────────────

function AuthTab() {
    const editing = useAppStore(selectEditing);
    const patchSqs = useAppStore(s => s.patchSqs);
    if (!editing) return null;
    const inputStyle = {
        height: 'var(--input-height)',
        padding: '0 10px',
        fontSize: 'var(--text-base)',
        fontFamily: "'JetBrains Mono Variable', monospace",
        color: 'var(--text-0)',
        border: '1px solid var(--border-1)',
    };
    return (
        <div className="flex flex-col gap-5 animate-tab-in" style={{ padding: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Label>
                    Custom Endpoint{' '}
                    <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                        (optional — for LocalStack or VPC endpoints)
                    </span>
                </Label>
                <input
                    value={editing.sqs.endpoint}
                    onChange={e => patchSqs({ endpoint: e.target.value })}
                    placeholder="http://localhost:4566"
                    className="w-full bg-[var(--bg-2)] outline-none rounded-[var(--r-sm)] transition-colors focus:border-[var(--border-focus)]"
                    style={inputStyle}
                    spellCheck={false}
                />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Label>Access Key ID</Label>
                <input
                    value={editing.sqs.accessKeyId}
                    onChange={e => patchSqs({ accessKeyId: e.target.value })}
                    placeholder="AKIAIOSFODNN7EXAMPLE or {{aws_access_key}}"
                    className="w-full bg-[var(--bg-2)] outline-none rounded-[var(--r-sm)] transition-colors focus:border-[var(--border-focus)]"
                    style={inputStyle}
                    spellCheck={false}
                />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Label>Secret Access Key</Label>
                <PasswordInput
                    value={editing.sqs.secretAccessKey}
                    onChange={v => patchSqs({ secretAccessKey: v })}
                    placeholder="{{aws_secret_key}}"
                />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Label>
                    Session Token{' '}
                    <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                        (optional)
                    </span>
                </Label>
                <PasswordInput
                    value={editing.sqs.sessionToken}
                    onChange={v => patchSqs({ sessionToken: v })}
                    placeholder="Temporary session token…"
                />
            </div>
            {(editing.sqs.accessKeyId || editing.sqs.secretAccessKey) && (
                <div
                    style={{
                        padding: '8px 12px',
                        borderRadius: 'var(--r-sm)',
                        background: 'color-mix(in srgb, var(--yellow) 10%, transparent)',
                        border: '1px solid color-mix(in srgb, var(--yellow) 25%, transparent)',
                        fontSize: 11.5,
                        color: 'var(--text-2)',
                        lineHeight: 1.5,
                    }}
                >
                    Credentials are stored in the request and saved to your local config. Use
                    environment variables like{' '}
                    <code style={{ fontFamily: 'monospace', color: 'var(--yellow)' }}>
                        {'{{aws_access_key}}'}
                    </code>{' '}
                    for better security.
                </div>
            )}
        </div>
    );
}

// ── Tabs config ───────────────────────────────────────────────────────────

const SQS_TABS = [
    { id: 'message', label: 'Message' },
    { id: 'attributes', label: 'Attributes' },
    { id: 'auth', label: 'Auth' },
];

// ── SqsPanel ──────────────────────────────────────────────────────────────

export function SqsPanel() {
    const editing = useAppStore(selectEditing);
    const patchSqs = useAppStore(s => s.patchSqs);
    const setMethod = useAppStore(s => s.setMethod);
    const setActiveTab = useAppStore(s => s.setActiveTab);
    const sendRequest = useAppStore(s => s.sendRequest);
    const { envVars, collectionVars } = useVarProps();
    const responseLoading = useAppStore(s => {
        const t = s.activeTabId ? s.tabs.find(tab => tab.id === s.activeTabId) : null;
        return t?.responseLoading ?? false;
    });

    if (!editing) return null;

    const isReceive = editing.method === 'GET';

    const activeTab = SQS_TABS.some(t => t.id === editing.activeTab)
        ? editing.activeTab
        : 'message';

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

                {/* Queue URL */}
                <VarInput
                    value={editing.sqs.queueUrl}
                    onChange={v => patchSqs({ queueUrl: v })}
                    placeholder="https://sqs.us-east-1.amazonaws.com/123456789012/MyQueue"
                    envVars={envVars}
                    collectionVars={collectionVars}
                    style={{
                        padding: '0 12px',
                        fontFamily: "'JetBrains Mono Variable', monospace",
                    }}
                />

                <RegionSelector />

                {/* Send / Receive mode toggle */}
                <div
                    className="flex items-center rounded-[var(--r-sm)] shrink-0 overflow-hidden"
                    style={{ border: '1px solid var(--border-1)', height: 'var(--input-height)' }}
                >
                    {(['POST', 'GET'] as const).map(m => (
                        <button
                            key={m}
                            className={cn(
                                'flex items-center gap-1 cursor-pointer select-none transition-colors duration-150',
                                editing.method === m
                                    ? 'bg-[var(--yellow)] text-[#0d1117]'
                                    : 'text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--bg-3)]'
                            )}
                            style={{
                                padding: '0 10px',
                                height: '100%',
                                fontSize: 12,
                                fontWeight: 600,
                            }}
                            onClick={() => setMethod(m)}
                        >
                            {m === 'POST' ? 'Send' : 'Receive'}
                        </button>
                    ))}
                </div>

                <button
                    className="flex items-center gap-1.5 rounded-[var(--r-sm)] shrink-0 cursor-pointer select-none transition-all duration-150 hover:brightness-110 active:brightness-95 disabled:opacity-50"
                    style={{
                        height: 'var(--input-height)',
                        padding: '0 14px',
                        background: 'var(--yellow)',
                        color: '#0d1117',
                        fontSize: 'var(--text-base)',
                        fontWeight: 600,
                    }}
                    onClick={sendRequest}
                    disabled={responseLoading}
                    title={`${isReceive ? 'Receive' : 'Send'} (${shortcut('↵')})`}
                >
                    {responseLoading ? (
                        <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" />
                    ) : isReceive ? (
                        <Inbox style={{ width: 14, height: 14 }} />
                    ) : (
                        <Send style={{ width: 14, height: 14 }} />
                    )}
                    {isReceive ? 'Receive' : 'Send'}
                </button>
            </div>

            {/* Tabs */}
            <div
                className="flex items-center shrink-0"
                style={{ borderBottom: '1px solid var(--border-0)', paddingLeft: 4 }}
            >
                {SQS_TABS.map(tab => (
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
                            <span className="absolute bottom-0 left-0 right-0 h-[1.5px] rounded-t bg-[var(--yellow)]" />
                        )}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-hidden">
                {activeTab === 'message' && <SqsMessageTab />}
                {activeTab === 'attributes' && <AttributesTab />}
                {activeTab === 'auth' && <AuthTab />}
            </div>
        </>
    );
}
