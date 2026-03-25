import React from 'react';
import {
    Send,
    ChevronDown,
    Plus,
    X,
    Lock,
    Loader2,
    Upload,
    FileText,
    RefreshCw,
} from 'lucide-react';
import { cn, shortcut } from '@/lib/utils';
import { MethodBadge } from '@/components/ui/badge';
import { PasswordInput } from '@/components/ui/PasswordInput';
import {
    useAppStore,
    selectEditing,
    resolveVars,
    hasVars,
    type HttpMethod,
    type AuthType,
    type BodyType,
    type TestResult,
} from '@/store/app';
import { GrpcPanel } from './GrpcPanel';
import { KafkaPanel } from './KafkaPanel';
import { SqsPanel } from './SqsPanel';
import { WsPanel } from './WsPanel';
import { RequestNameBar } from './RequestNameBar';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

// ── Helpers ───────────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
    return (
        <span
            style={{
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
                color: 'var(--text-2)',
            }}
        >
            {children}
        </span>
    );
}

function FieldInput({
    type = 'text',
    placeholder,
    defaultValue,
    value,
    onChange,
    className,
}: {
    type?: string;
    placeholder?: string;
    defaultValue?: string;
    value?: string;
    onChange?: (_e: React.ChangeEvent<HTMLInputElement>) => void;
    className?: string;
}) {
    return (
        <input
            type={type}
            placeholder={placeholder}
            defaultValue={defaultValue}
            value={value}
            onChange={onChange}
            className={cn(
                'w-full bg-transparent outline-none transition-colors duration-150',
                className
            )}
            style={{
                height: 'var(--input-height)',
                padding: '0 10px',
                background: 'var(--bg-2)',
                border: '1px solid var(--border-1)',
                borderRadius: 'var(--r-sm)',
                fontSize: 'var(--text-base)',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-0)',
            }}
            onFocus={e => {
                (e.currentTarget as HTMLInputElement).style.borderColor = 'var(--border-focus)';
            }}
            onBlur={e => {
                (e.currentTarget as HTMLInputElement).style.borderColor = 'var(--border-1)';
            }}
            spellCheck={false}
        />
    );
}

// ── Checkbox ──────────────────────────────────────────────────────────────

function Checkbox({ checked, onClick }: { checked: boolean; onClick: () => void }) {
    return (
        <button
            className="flex items-center justify-center w-full h-full cursor-pointer"
            onClick={onClick}
        >
            <div
                className={cn(
                    'rounded-[3px] border transition-all duration-150',
                    checked
                        ? 'bg-[var(--accent)] border-[var(--accent)]'
                        : 'border-[var(--border-2)] bg-transparent hover:border-[var(--accent)]'
                )}
                style={{ width: 13, height: 13 }}
            >
                {checked && (
                    <svg
                        viewBox="0 0 10 10"
                        className="w-full h-full"
                        fill="none"
                        style={{ padding: '1.5px' }}
                    >
                        <path
                            d="M1.5 5l2.5 2.5 4.5-4"
                            stroke="#0d1117"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                )}
            </div>
        </button>
    );
}

// ── Secondary tab bar (used in Body + Auth) ───────────────────────────────

function SubTabs<T extends string>({
    tabs,
    active,
    onChange,
}: {
    tabs: { id: T; label: string }[];
    active: T;
    onChange: (_id: T) => void;
}) {
    return (
        <div
            className="flex items-center shrink-0"
            style={{ borderBottom: '1px solid var(--border-0)', paddingLeft: 4 }}
        >
            {tabs.map(tab => {
                const isActive = tab.id === active;
                return (
                    <button
                        key={tab.id}
                        className={cn(
                            'relative flex items-center cursor-pointer select-none transition-colors duration-150',
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
                        onClick={() => onChange(tab.id)}
                    >
                        {isActive && (
                            <span className="absolute bottom-0 left-0 right-0 h-[1.5px] rounded-t bg-[var(--accent)]" />
                        )}
                        {tab.label}
                    </button>
                );
            })}
        </div>
    );
}

// ── KV table (shared for Params + Headers) ────────────────────────────────

const COL = '28px 1fr 1fr 28px';

function KVHeader() {
    return (
        <div
            className="grid shrink-0 select-none"
            style={{
                gridTemplateColumns: COL,
                height: 28,
                background: 'var(--bg-0)',
                borderBottom: '1px solid var(--border-0)',
            }}
        >
            <span />
            <div
                className="flex items-center"
                style={{ borderLeft: '1px solid var(--border-0)', padding: '0 10px' }}
            >
                <FieldLabel>Name</FieldLabel>
            </div>
            <div
                className="flex items-center"
                style={{ borderLeft: '1px solid var(--border-0)', padding: '0 10px' }}
            >
                <FieldLabel>Value</FieldLabel>
            </div>
            <span />
        </div>
    );
}

function KVRow({
    checked,
    keyVal,
    valueVal,
    keyPlaceholder,
    valuePlaceholder,
    onToggle,
    onChangeKey,
    onChangeValue,
    onRemove,
}: {
    checked: boolean;
    keyVal: string;
    valueVal: string;
    keyPlaceholder?: string;
    valuePlaceholder?: string;
    onToggle: () => void;
    onChangeKey: (_v: string) => void;
    onChangeValue: (_v: string) => void;
    onRemove: () => void;
}) {
    return (
        <div
            className={cn(
                'group grid items-stretch transition-colors duration-100 hover:bg-[var(--bg-2)]',
                !checked && 'opacity-40'
            )}
            style={{
                gridTemplateColumns: COL,
                minHeight: 36,
                borderBottom: '1px solid var(--border-0)',
            }}
        >
            <Checkbox checked={checked} onClick={onToggle} />
            <div
                style={{
                    borderLeft: '1px solid var(--border-0)',
                    display: 'flex',
                    alignItems: 'center',
                }}
            >
                <input
                    value={keyVal}
                    onChange={e => onChangeKey(e.target.value)}
                    placeholder={keyPlaceholder ?? 'name'}
                    className="w-full h-full bg-transparent outline-none"
                    style={{
                        padding: '0 10px',
                        fontSize: 'var(--text-base)',
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--text-0)',
                    }}
                    spellCheck={false}
                />
            </div>
            <div
                style={{
                    borderLeft: '1px solid var(--border-0)',
                    display: 'flex',
                    alignItems: 'center',
                    position: 'relative',
                }}
            >
                <div
                    aria-hidden
                    className="absolute inset-0 flex items-center pointer-events-none"
                    style={{
                        padding: '0 10px',
                        fontSize: 'var(--text-base)',
                        fontFamily: 'var(--font-mono)',
                        whiteSpace: 'pre',
                        overflow: 'hidden',
                    }}
                    dangerouslySetInnerHTML={{
                        __html: valueVal
                            ? valueVal
                                  .replace(/&/g, '&amp;')
                                  .replace(/</g, '&lt;')
                                  .replace(/>/g, '&gt;')
                                  .replace(/"/g, '&quot;')
                                  .replace(
                                      /(\{\{[^}]*\}\})/g,
                                      '<mark style="background:rgba(251,191,36,0.18);color:var(--yellow);border-radius:2px">$1</mark>'
                                  )
                            : '',
                    }}
                />
                <input
                    value={valueVal}
                    onChange={e => onChangeValue(e.target.value)}
                    placeholder={valuePlaceholder ?? 'value'}
                    className="relative w-full h-full bg-transparent outline-none"
                    style={{
                        padding: '0 10px',
                        fontSize: 'var(--text-base)',
                        fontFamily: 'var(--font-mono)',
                        color: valueVal ? 'transparent' : 'var(--text-1)',
                        caretColor: 'var(--text-1)',
                    }}
                    spellCheck={false}
                />
            </div>
            <button
                className="flex items-center justify-center opacity-20 group-hover:opacity-70 hover:!opacity-100 cursor-pointer transition-all duration-100 hover:text-[var(--red)]"
                style={{ color: 'var(--text-2)', borderLeft: '1px solid var(--border-0)' }}
                onClick={onRemove}
            >
                <X style={{ width: 11, height: 11 }} />
            </button>
        </div>
    );
}

function KVEmpty({ label }: { label: string }) {
    return (
        <div
            className="flex flex-col items-center justify-center gap-2 py-14"
            style={{ color: 'var(--text-2)', opacity: 0.55 }}
        >
            <div style={{ fontSize: 24 }}>⊘</div>
            <span style={{ fontSize: 12 }}>{label}</span>
        </div>
    );
}

function KVAddButton({ label, onClick }: { label: string; onClick: () => void }) {
    return (
        <div style={{ padding: '6px 10px', borderBottom: '1px solid var(--border-0)' }}>
            <button
                className="flex items-center gap-1.5 cursor-pointer transition-all duration-150 rounded-[var(--r-sm)] hover:bg-[var(--bg-3)]"
                style={{
                    height: 26,
                    padding: '0 8px',
                    fontSize: 11.5,
                    color: 'var(--text-2)',
                }}
                onClick={onClick}
            >
                <Plus style={{ width: 10, height: 10 }} />
                {label}
            </button>
        </div>
    );
}

// ── Params ────────────────────────────────────────────────────────────────

function ParamRow({ idx }: { idx: number }) {
    const editing = useAppStore(selectEditing);
    const { setParam, toggleParam, removeParam } = useAppStore();
    if (!editing) return null;
    const p = editing.params[idx];
    if (!p) return null;
    return (
        <KVRow
            checked={p.enabled}
            keyVal={p.key}
            valueVal={p.value}
            keyPlaceholder="param"
            valuePlaceholder="value"
            onToggle={() => toggleParam(idx)}
            onChangeKey={v => setParam(idx, v, p.value)}
            onChangeValue={v => setParam(idx, p.key, v)}
            onRemove={() => removeParam(idx)}
        />
    );
}

function ParamsTable() {
    const editing = useAppStore(selectEditing);
    const { addParam } = useAppStore();
    if (!editing) return null;

    return (
        <div className="flex flex-col h-full animate-tab-in">
            <KVHeader />
            <KVAddButton label="Add parameter" onClick={addParam} />
            <div className="flex-1 overflow-y-auto">
                {editing.params.map((_p, idx) => (
                    <ParamRow key={idx} idx={idx} />
                ))}
                {editing.params.length === 0 && <KVEmpty label="No query parameters" />}
            </div>
        </div>
    );
}

// ── Headers ───────────────────────────────────────────────────────────────

function HeaderRow({ idx }: { idx: number }) {
    const editing = useAppStore(selectEditing);
    const { setHeader, toggleHeader, removeHeader } = useAppStore();
    if (!editing) return null;
    const h = editing.headers[idx];
    if (!h) return null;
    return (
        <KVRow
            checked={h.enabled}
            keyVal={h.key}
            valueVal={h.value}
            keyPlaceholder="Header-Name"
            valuePlaceholder="value"
            onToggle={() => toggleHeader(idx)}
            onChangeKey={v => setHeader(idx, v, h.value)}
            onChangeValue={v => setHeader(idx, h.key, v)}
            onRemove={() => removeHeader(idx)}
        />
    );
}

function HeadersTable() {
    const editing = useAppStore(selectEditing);
    const { addHeader } = useAppStore();
    if (!editing) return null;

    return (
        <div className="flex flex-col h-full animate-tab-in">
            <KVHeader />
            <KVAddButton label="Add header" onClick={addHeader} />
            <div className="flex-1 overflow-y-auto">
                {editing.headers.map((_h, idx) => (
                    <HeaderRow key={idx} idx={idx} />
                ))}
                {editing.headers.length === 0 && <KVEmpty label="No headers added" />}
            </div>
        </div>
    );
}

// ── Body ──────────────────────────────────────────────────────────────────

const BODY_TYPES: { id: BodyType; label: string }[] = [
    { id: 'none', label: 'None' },
    { id: 'json', label: 'JSON' },
    { id: 'form', label: 'URL Form' },
    { id: 'formdata', label: 'Multipart' },
    { id: 'text', label: 'Text' },
    { id: 'binary', label: 'Binary' },
];

function FormFieldRow({ idx, bodyType }: { idx: number; bodyType: BodyType }) {
    const editing = useAppStore(selectEditing);
    const { setFormField, toggleFormField, removeFormField } = useAppStore();
    if (!editing) return null;
    const f = editing.formFields[idx];
    if (!f) return null;
    return (
        <KVRow
            checked={f.enabled}
            keyVal={f.key}
            valueVal={f.value}
            keyPlaceholder={bodyType === 'formdata' ? 'field name' : 'key'}
            valuePlaceholder="value"
            onToggle={() => toggleFormField(idx)}
            onChangeKey={v => setFormField(idx, v, f.value)}
            onChangeValue={v => setFormField(idx, f.key, v)}
            onRemove={() => removeFormField(idx)}
        />
    );
}

function BodyEditor() {
    const editing = useAppStore(selectEditing);
    const { setBody, setBodyType, addFormField, setBinaryFile } = useAppStore();
    const [prettifyError, setPrettifyError] = React.useState<string | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    if (!editing) return null;

    const bodyType = editing.bodyType;

    const handlePrettify = () => {
        try {
            setBody(JSON.stringify(JSON.parse(editing.body), null, 2));
            setPrettifyError(null);
        } catch {
            setPrettifyError('Invalid JSON');
            setTimeout(() => setPrettifyError(null), 2000);
        }
    };

    return (
        <div className="flex flex-col h-full animate-tab-in">
            {/* Type selector bar */}
            <div
                className="flex items-center shrink-0"
                style={{ borderBottom: '1px solid var(--border-0)', paddingLeft: 4 }}
            >
                <div className="flex items-center flex-1">
                    {BODY_TYPES.map(bt => {
                        const isActive = bodyType === bt.id;
                        return (
                            <button
                                key={bt.id}
                                className={cn(
                                    'relative flex items-center cursor-pointer select-none transition-colors duration-150',
                                    isActive
                                        ? 'text-[var(--text-0)]'
                                        : 'text-[var(--text-2)] hover:text-[var(--text-1)]'
                                )}
                                style={{
                                    padding: '0 11px',
                                    height: 36,
                                    fontSize: 12.5,
                                    fontWeight: isActive ? 600 : 400,
                                }}
                                onClick={() => setBodyType(bt.id)}
                            >
                                {isActive && (
                                    <span className="absolute bottom-0 left-0 right-0 h-[1.5px] rounded-t bg-[var(--accent)]" />
                                )}
                                {bt.label}
                            </button>
                        );
                    })}
                </div>
                {bodyType === 'json' && editing.body.trim() && (
                    <button
                        className={cn(
                            'shrink-0 flex items-center justify-center rounded cursor-pointer transition-all duration-150 mr-2',
                            prettifyError
                                ? 'text-[var(--red)]'
                                : 'text-[var(--text-2)] hover:text-[var(--accent)] hover:bg-[var(--bg-3)]'
                        )}
                        style={{
                            height: 26,
                            padding: '0 8px',
                            fontSize: 11.5,
                            fontFamily: 'monospace',
                        }}
                        onClick={handlePrettify}
                        title="Format JSON"
                    >
                        {prettifyError ?? '{ }'}
                    </button>
                )}
            </div>

            {/* Editor area */}
            <div className="flex-1 overflow-hidden">
                {/* None */}
                {bodyType === 'none' && (
                    <div
                        className="flex flex-col items-center justify-center h-full gap-2.5"
                        style={{ color: 'var(--text-2)' }}
                    >
                        <div
                            className="flex items-center justify-center rounded-full"
                            style={{
                                width: 36,
                                height: 36,
                                background: 'var(--bg-2)',
                                border: '1px solid var(--border-1)',
                            }}
                        >
                            <X style={{ width: 14, height: 14, opacity: 0.5 }} />
                        </div>
                        <div className="flex flex-col items-center gap-1">
                            <span
                                style={{ fontSize: 12.5, color: 'var(--text-1)', fontWeight: 500 }}
                            >
                                No request body
                            </span>
                            <span style={{ fontSize: 11.5, opacity: 0.6 }}>
                                Select a body type above
                            </span>
                        </div>
                    </div>
                )}

                {/* JSON / Text */}
                {(bodyType === 'json' || bodyType === 'text') && (
                    <textarea
                        value={editing.body}
                        onChange={e => setBody(e.target.value)}
                        className="w-full h-full resize-none bg-transparent outline-none"
                        style={{
                            padding: '14px 16px',
                            fontSize: 'var(--text-base)',
                            fontFamily: "'JetBrains Mono Variable', monospace",
                            color: 'var(--text-0)',
                            lineHeight: 1.7,
                        }}
                        placeholder={
                            bodyType === 'json' ? '{\n  "key": "value"\n}' : 'Plain text body…'
                        }
                        spellCheck={false}
                    />
                )}

                {/* URL Form / Multipart */}
                {(bodyType === 'form' || bodyType === 'formdata') && (
                    <div className="flex flex-col h-full">
                        <KVHeader />
                        <KVAddButton
                            label={bodyType === 'formdata' ? 'Add field' : 'Add parameter'}
                            onClick={addFormField}
                        />
                        <div className="flex-1 overflow-y-auto">
                            {editing.formFields.map((_, idx) => (
                                <FormFieldRow key={idx} idx={idx} bodyType={bodyType} />
                            ))}
                            {editing.formFields.length === 0 && (
                                <KVEmpty
                                    label={
                                        bodyType === 'formdata'
                                            ? 'No form fields'
                                            : 'No form parameters'
                                    }
                                />
                            )}
                        </div>
                    </div>
                )}

                {/* Binary */}
                {bodyType === 'binary' && (
                    <div
                        className="flex flex-col items-center justify-center h-full gap-4"
                        style={{ color: 'var(--text-2)' }}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            onChange={e => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onload = () => {
                                    const b64 = (reader.result as string).split(',')[1] ?? '';
                                    setBinaryFile(file.name, b64);
                                };
                                reader.readAsDataURL(file);
                            }}
                        />
                        {editing.binaryFileName ? (
                            <div className="flex flex-col items-center gap-3">
                                <div
                                    className="flex items-center justify-center rounded-[var(--r-lg)]"
                                    style={{
                                        width: 44,
                                        height: 44,
                                        background: 'var(--accent-dim)',
                                        border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)',
                                    }}
                                >
                                    <FileText
                                        style={{ width: 18, height: 18, color: 'var(--accent)' }}
                                    />
                                </div>
                                <div className="flex flex-col items-center gap-1">
                                    <span
                                        style={{
                                            fontSize: 12.5,
                                            color: 'var(--text-0)',
                                            fontWeight: 500,
                                        }}
                                    >
                                        {editing.binaryFileName}
                                    </span>
                                    <button
                                        className="cursor-pointer transition-colors hover:text-[var(--accent)]"
                                        style={{ fontSize: 11.5 }}
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        Change file
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-3">
                                <button
                                    className="flex flex-col items-center gap-3 cursor-pointer group"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <div
                                        className="flex items-center justify-center rounded-[var(--r-lg)] transition-colors group-hover:bg-[var(--accent-dim)] group-hover:border-[color-mix(in_srgb,var(--accent)_30%,transparent)]"
                                        style={{
                                            width: 44,
                                            height: 44,
                                            background: 'var(--bg-2)',
                                            border: '1px solid var(--border-1)',
                                        }}
                                    >
                                        <Upload style={{ width: 18, height: 18, opacity: 0.5 }} />
                                    </div>
                                    <div className="flex flex-col items-center gap-1">
                                        <span
                                            style={{
                                                fontSize: 12.5,
                                                color: 'var(--text-1)',
                                                fontWeight: 500,
                                            }}
                                        >
                                            Choose a file
                                        </span>
                                        <span style={{ fontSize: 11.5, opacity: 0.6 }}>
                                            Click to browse
                                        </span>
                                    </div>
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Auth ──────────────────────────────────────────────────────────────────

const AUTH_TYPES: { id: AuthType; label: string }[] = [
    { id: 'none', label: 'None' },
    { id: 'bearer', label: 'Bearer Token' },
    { id: 'basic', label: 'Basic Auth' },
    { id: 'apikey', label: 'API Key' },
    { id: 'oauth2', label: 'OAuth 2.0' },
];

function AuthEditor() {
    const editing = useAppStore(selectEditing);
    const setAuth = useAppStore(s => s.setAuth);
    if (!editing) return null;
    const auth = editing.auth;
    const type = auth.type;

    return (
        <div className="flex flex-col h-full animate-tab-in">
            <SubTabs tabs={AUTH_TYPES} active={type} onChange={t => setAuth({ type: t })} />

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                {type === 'none' && (
                    <div
                        className="flex flex-col items-center justify-center h-full gap-3"
                        style={{ color: 'var(--text-2)' }}
                    >
                        <div
                            className="flex items-center justify-center rounded-full"
                            style={{
                                width: 40,
                                height: 40,
                                background: 'var(--bg-2)',
                                border: '1px solid var(--border-1)',
                            }}
                        >
                            <Lock style={{ width: 16, height: 16, opacity: 0.4 }} />
                        </div>
                        <div className="flex flex-col items-center gap-1">
                            <span
                                style={{ fontSize: 12.5, color: 'var(--text-1)', fontWeight: 500 }}
                            >
                                No authentication
                            </span>
                            <span
                                style={{
                                    fontSize: 11.5,
                                    opacity: 0.6,
                                    textAlign: 'center',
                                    maxWidth: 220,
                                }}
                            >
                                Select an auth type above to configure credentials
                            </span>
                        </div>
                    </div>
                )}

                {type === 'bearer' && (
                    <div className="flex flex-col gap-1.5">
                        <FieldLabel>Token</FieldLabel>
                        <PasswordInput
                            value={auth.token}
                            onChange={v => setAuth({ token: v })}
                            placeholder="Bearer token or {{token}}"
                        />
                    </div>
                )}

                {type === 'basic' && (
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                            <FieldLabel>Username</FieldLabel>
                            <FieldInput
                                type="text"
                                placeholder="username"
                                value={auth.username}
                                onChange={e => setAuth({ username: e.target.value })}
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <FieldLabel>Password</FieldLabel>
                            <PasswordInput
                                value={auth.password}
                                onChange={v => setAuth({ password: v })}
                            />
                        </div>
                    </div>
                )}

                {type === 'apikey' && (
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                            <FieldLabel>Header name</FieldLabel>
                            <FieldInput
                                type="text"
                                placeholder="X-API-Key"
                                value={auth.headerName}
                                onChange={e => setAuth({ headerName: e.target.value })}
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <FieldLabel>Value</FieldLabel>
                            <PasswordInput
                                value={auth.headerValue}
                                onChange={v => setAuth({ headerValue: v })}
                                placeholder="{{api_key}}"
                            />
                        </div>
                    </div>
                )}

                {type === 'oauth2' && <OAuth2Editor auth={auth} setAuth={setAuth} />}
            </div>
        </div>
    );
}

// ── OAuth 2.0 editor ───────────────────────────────────────────────────────

const OAUTH2_GRANT_TYPES = [
    { id: 'client_credentials', label: 'Client Credentials' },
    { id: 'authorization_code', label: 'Authorization Code' },
    { id: 'password', label: 'Password' },
];

function OAuth2Editor({
    auth,
    setAuth,
}: {
    auth: import('@/store/app').AuthConfig;
    setAuth: (_p: Partial<import('@/store/app').AuthConfig>) => void;
}) {
    const [fetching, setFetching] = React.useState(false);
    const [fetchError, setFetchError] = React.useState<string | null>(null);

    async function fetchToken() {
        if (!auth.oauth2TokenUrl) return;
        setFetching(true);
        setFetchError(null);
        try {
            const isWails = typeof window !== 'undefined' && !!(window as any)['go'];
            let body = '';
            if (auth.oauth2GrantType === 'client_credentials') {
                body = `grant_type=client_credentials&client_id=${encodeURIComponent(auth.oauth2ClientId)}&client_secret=${encodeURIComponent(auth.oauth2ClientSecret)}`;
                if (auth.oauth2Scope) body += `&scope=${encodeURIComponent(auth.oauth2Scope)}`;
            } else if (auth.oauth2GrantType === 'password') {
                body = `grant_type=password&client_id=${encodeURIComponent(auth.oauth2ClientId)}&client_secret=${encodeURIComponent(auth.oauth2ClientSecret)}&username=${encodeURIComponent(auth.username ?? '')}&password=${encodeURIComponent(auth.password ?? '')}`;
                if (auth.oauth2Scope) body += `&scope=${encodeURIComponent(auth.oauth2Scope)}`;
            }
            let responseBody = '';
            if (isWails) {
                const { ExecuteRequest } = await import(
                    '../../../wailsjs/go/service/RequestService'
                );
                const res = await ExecuteRequest('POST', auth.oauth2TokenUrl, body, {
                    'Content-Type': 'application/x-www-form-urlencoded',
                });
                responseBody = res.body;
            } else {
                const res = await fetch(auth.oauth2TokenUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body,
                });
                responseBody = await res.text();
            }
            let data: Record<string, unknown>;
            try {
                data = JSON.parse(responseBody);
            } catch {
                setFetchError('Token response is not valid JSON');
                setFetching(false);
                return;
            }
            if (data.access_token) {
                setAuth({ oauth2AccessToken: data.access_token as string });
            } else {
                setFetchError(
                    (data.error_description ??
                        data.error ??
                        'No access_token in response') as string
                );
            }
        } catch (err) {
            setFetchError(String(err));
        } finally {
            setFetching(false);
        }
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
                <FieldLabel>Grant type</FieldLabel>
                <div className="relative">
                    <select
                        value={auth.oauth2GrantType}
                        onChange={e => setAuth({ oauth2GrantType: e.target.value })}
                        className="w-full appearance-none cursor-pointer"
                        style={{
                            height: 'var(--input-height)',
                            padding: '0 28px 0 10px',
                            background: 'var(--bg-2)',
                            border: '1px solid var(--border-1)',
                            borderRadius: 'var(--r-sm)',
                            fontSize: 'var(--text-base)',
                            color: 'var(--text-0)',
                            outline: 'none',
                            fontFamily: 'var(--font-mono)',
                        }}
                    >
                        {OAUTH2_GRANT_TYPES.map(g => (
                            <option key={g.id} value={g.id}>
                                {g.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="flex flex-col gap-1.5">
                <FieldLabel>Token URL</FieldLabel>
                <FieldInput
                    placeholder="https://auth.example.com/oauth/token"
                    value={auth.oauth2TokenUrl}
                    onChange={e => setAuth({ oauth2TokenUrl: e.target.value })}
                />
            </div>

            <div className="flex flex-col gap-1.5">
                <FieldLabel>Client ID</FieldLabel>
                <FieldInput
                    placeholder="client_id"
                    value={auth.oauth2ClientId}
                    onChange={e => setAuth({ oauth2ClientId: e.target.value })}
                />
            </div>

            <div className="flex flex-col gap-1.5">
                <FieldLabel>Client Secret</FieldLabel>
                <FieldInput
                    type="password"
                    placeholder="client_secret"
                    value={auth.oauth2ClientSecret}
                    onChange={e => setAuth({ oauth2ClientSecret: e.target.value })}
                />
            </div>

            <div className="flex flex-col gap-1.5">
                <FieldLabel>Scope</FieldLabel>
                <FieldInput
                    placeholder="openid profile email"
                    value={auth.oauth2Scope}
                    onChange={e => setAuth({ oauth2Scope: e.target.value })}
                />
            </div>

            {auth.oauth2GrantType !== 'authorization_code' && (
                <button
                    className="flex items-center justify-center gap-2 rounded-[var(--r-sm)] cursor-pointer transition-all duration-150 hover:brightness-110 active:brightness-95 disabled:opacity-50"
                    style={{
                        height: 'var(--btn-height)',
                        padding: '0 16px',
                        background: 'var(--accent)',
                        color: '#fff',
                        fontSize: 'var(--text-base)',
                        fontWeight: 600,
                    }}
                    onClick={fetchToken}
                    disabled={fetching || !auth.oauth2TokenUrl}
                >
                    {fetching ? (
                        <Loader2 style={{ width: 13, height: 13 }} className="animate-spin" />
                    ) : null}
                    {fetching ? 'Fetching…' : 'Get Token'}
                </button>
            )}

            {auth.oauth2GrantType === 'authorization_code' && (
                <div
                    className="rounded-[var(--r-sm)] p-3"
                    style={{
                        background: 'var(--bg-3)',
                        border: '1px solid var(--border-1)',
                        fontSize: 11.5,
                        color: 'var(--text-2)',
                        lineHeight: 1.6,
                    }}
                >
                    Authorization Code flow requires browser interaction. Copy the token from your
                    browser and paste it below.
                </div>
            )}

            {fetchError && (
                <div
                    className="rounded-[var(--r-sm)] p-2.5"
                    style={{
                        background: 'var(--red-dim)',
                        border: '1px solid var(--red)',
                        fontSize: 11.5,
                        color: 'var(--red)',
                    }}
                >
                    {fetchError}
                </div>
            )}

            <div style={{ borderTop: '1px solid var(--border-0)', paddingTop: 12 }}>
                <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                        <FieldLabel>Access Token</FieldLabel>
                        {auth.oauth2AccessToken && (
                            <button
                                className="text-[var(--text-2)] hover:text-[var(--red)] transition-colors cursor-pointer"
                                style={{ fontSize: 10.5 }}
                                onClick={() => setAuth({ oauth2AccessToken: '' })}
                            >
                                Clear
                            </button>
                        )}
                    </div>
                    <FieldInput
                        placeholder="Paste or fetch token…"
                        value={auth.oauth2AccessToken}
                        onChange={e => setAuth({ oauth2AccessToken: e.target.value })}
                    />
                    {auth.oauth2AccessToken && (
                        <span style={{ fontSize: 10.5, color: 'var(--green)' }}>
                            ✓ Token will be sent as Bearer Authorization header
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Docs ──────────────────────────────────────────────────────────────────

function DocsEditor() {
    const editing = useAppStore(selectEditing);
    const setNotes = useAppStore(s => s.setNotes);
    if (!editing) return null;

    return (
        <div className="flex flex-col h-full animate-tab-in">
            <textarea
                value={editing.notes}
                onChange={e => setNotes(e.target.value)}
                className="flex-1 w-full resize-none bg-transparent outline-none"
                style={{
                    padding: '14px 16px',
                    fontSize: 'var(--text-base)',
                    color: 'var(--text-0)',
                    lineHeight: 1.7,
                    fontFamily: 'inherit',
                }}
                placeholder="Add notes, documentation, or examples for this request…"
                spellCheck={false}
            />
        </div>
    );
}

// ── Method selector ───────────────────────────────────────────────────────

function MethodSelector() {
    const editing = useAppStore(selectEditing);
    const { setMethod } = useAppStore();
    const [open, setOpen] = React.useState(false);
    const ref = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    if (!editing) return null;
    const method = editing.method;

    return (
        <div ref={ref} className="relative shrink-0">
            <button
                className={cn(
                    'flex items-center gap-1.5 rounded cursor-pointer select-none transition-all duration-150',
                    'border bg-[var(--bg-2)] hover:border-[var(--border-2)]',
                    open ? 'border-[var(--border-focus)]' : 'border-[var(--border-1)]'
                )}
                style={{ height: 'var(--input-height)', paddingLeft: 10, paddingRight: 10 }}
                onClick={() => setOpen(!open)}
            >
                <MethodBadge method={method} />
                <ChevronDown
                    className={cn('transition-transform duration-150', open && 'rotate-180')}
                    style={{ width: 12, height: 12, color: 'var(--text-2)' }}
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
                        {HTTP_METHODS.map(m => (
                            <button
                                key={m}
                                className={cn(
                                    'flex items-center gap-2 w-full rounded cursor-pointer transition-colors duration-100',
                                    'hover:bg-[var(--bg-3)] hover:text-[var(--text-0)]',
                                    method === m
                                        ? 'bg-[var(--accent-dim)] text-[var(--text-0)]'
                                        : 'text-[var(--text-1)]'
                                )}
                                style={{ padding: '6px 8px', fontSize: 'var(--text-base)' }}
                                onClick={() => {
                                    setMethod(m);
                                    setOpen(false);
                                }}
                            >
                                <MethodBadge method={m} compact />
                                <span>{m}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Tab bar ───────────────────────────────────────────────────────────────

const REQUEST_TABS: {
    id: 'params' | 'auth' | 'headers' | 'body' | 'docs' | 'tests';
    label: string;
}[] = [
    { id: 'params', label: 'Params' },
    { id: 'auth', label: 'Auth' },
    { id: 'headers', label: 'Headers' },
    { id: 'body', label: 'Body' },
    { id: 'tests', label: 'Tests' },
    { id: 'docs', label: 'Docs' },
];

// ── Empty state ───────────────────────────────────────────────────────────

function NoRequestSelected() {
    return (
        <div
            className="flex flex-col items-center justify-center h-full gap-3"
            style={{ background: 'var(--bg-1)', color: 'var(--text-2)' }}
        >
            <div
                className="flex items-center justify-center rounded-[var(--r-lg)]"
                style={{
                    width: 40,
                    height: 40,
                    background: 'var(--bg-2)',
                    border: '1px solid var(--border-1)',
                }}
            >
                <Send style={{ width: 18, height: 18, opacity: 0.5 }} />
            </div>
            <div className="flex flex-col items-center gap-1">
                <span style={{ fontSize: 'var(--text-md)', color: 'var(--text-1)' }}>
                    No request selected
                </span>
                <span style={{ fontSize: 'var(--text-sm)' }}>Pick one from the sidebar</span>
            </div>
        </div>
    );
}

// ── GraphQL schema introspection helpers ──────────────────────────────────

interface GqlField {
    name: string;
    description: string;
    typeName: string;
}

interface GqlSchemaData {
    queryFields: GqlField[];
    mutationFields: GqlField[];
    subscriptionFields: GqlField[];
}

function fmtGqlType(t: any): string {
    if (!t) return '';
    if (t.kind === 'NON_NULL') return `${fmtGqlType(t.ofType)}!`;
    if (t.kind === 'LIST') return `[${fmtGqlType(t.ofType)}]`;
    return t.name ?? '';
}

function parseGqlSchema(body: string): GqlSchemaData {
    const data = JSON.parse(body);
    const schema = data?.data?.__schema ?? data?.__schema;
    if (!schema) throw new Error('No __schema in response');

    const typeMap = new Map<string, any>();
    for (const t of schema.types ?? []) typeMap.set(t.name, t);

    const pickFields = (name?: string): GqlField[] => {
        if (!name) return [];
        return (typeMap.get(name)?.fields ?? []).map((f: any) => ({
            name: f.name,
            description: f.description ?? '',
            typeName: fmtGqlType(f.type),
        }));
    };

    return {
        queryFields: pickFields(schema.queryType?.name),
        mutationFields: pickFields(schema.mutationType?.name),
        subscriptionFields: pickFields(schema.subscriptionType?.name),
    };
}

const INTROSPECTION_QUERY = `{
  __schema {
    queryType { name }
    mutationType { name }
    subscriptionType { name }
    types {
      name
      kind
      fields(includeDeprecated: false) {
        name
        description
        type { name kind ofType { name kind ofType { name kind } } }
      }
    }
  }
}`;

function GqlSchemaSection({ title, fields }: { title: string; fields: GqlField[] }) {
    if (!fields.length) return null;
    return (
        <div style={{ marginBottom: 20 }}>
            <div
                style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--purple)',
                    marginBottom: 6,
                }}
            >
                {title}
            </div>
            {fields.map(f => (
                <div
                    key={f.name}
                    className="flex items-baseline gap-2"
                    style={{
                        padding: '4px 0',
                        borderBottom: '1px solid var(--border-0)',
                        minWidth: 0,
                    }}
                >
                    <span
                        style={{
                            fontFamily: "'JetBrains Mono Variable', monospace",
                            fontSize: 'var(--text-sm)',
                            color: 'var(--text-0)',
                            fontWeight: 600,
                            flexShrink: 0,
                        }}
                    >
                        {f.name}
                    </span>
                    <span
                        style={{
                            fontFamily: "'JetBrains Mono Variable', monospace",
                            fontSize: 11,
                            color: 'var(--purple)',
                            flexShrink: 0,
                        }}
                    >
                        {f.typeName}
                    </span>
                    {f.description && (
                        <span
                            className="truncate"
                            style={{ fontSize: 11, color: 'var(--text-2)', flex: 1 }}
                            title={f.description}
                        >
                            {f.description}
                        </span>
                    )}
                </div>
            ))}
        </div>
    );
}

// ── GraphQL panel ─────────────────────────────────────────────────────────

function GraphQLPanel() {
    const editing = useAppStore(selectEditing)!;
    const { patchGraphQL, setUrl, sendRequest, environments, activeEnvId } = useAppStore();
    const responseLoading = useAppStore(s => {
        const t = s.activeTabId ? s.tabs.find(tab => tab.id === s.activeTabId) : null;
        return t?.responseLoading ?? false;
    });
    const activeEnv = environments.find(e => e.id === activeEnvId) ?? null;

    const [gqlTab, setGqlTab] = React.useState<'query' | 'schema'>('query');
    const [schemaData, setSchemaData] = React.useState<GqlSchemaData | null>(null);
    const [schemaLoading, setSchemaLoading] = React.useState(false);
    const [schemaError, setSchemaError] = React.useState('');

    const varsError = React.useMemo(() => {
        const v = editing.graphql.variables;
        if (!v || v.trim() === '' || v.trim() === '{}') return '';
        try {
            JSON.parse(v);
            return '';
        } catch (e: any) {
            return (e as Error).message ?? 'Invalid JSON';
        }
    }, [editing.graphql.variables]);

    const fetchSchema = React.useCallback(async () => {
        const url = resolveVars(editing.url, activeEnv);
        if (!url) return;
        setSchemaLoading(true);
        setSchemaError('');
        try {
            const isWails = typeof window !== 'undefined' && !!(window as any)['go'];
            const reqBody = JSON.stringify({ query: INTROSPECTION_QUERY });
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            let responseBody: string;
            if (isWails) {
                const { ExecuteRequest } = await import(
                    '../../../wailsjs/go/service/RequestService'
                );
                const res = await ExecuteRequest('POST', url, reqBody, headers);
                responseBody = res.body;
            } else {
                responseBody = JSON.stringify({
                    data: {
                        __schema: {
                            queryType: { name: 'Query' },
                            mutationType: null,
                            subscriptionType: null,
                            types: [
                                {
                                    name: 'Query',
                                    kind: 'OBJECT',
                                    fields: [
                                        {
                                            name: 'hello',
                                            description: 'Demo field',
                                            type: {
                                                name: 'String',
                                                kind: 'SCALAR',
                                                ofType: null,
                                            },
                                        },
                                    ],
                                },
                            ],
                        },
                    },
                });
            }
            setSchemaData(parseGqlSchema(responseBody));
            setGqlTab('schema');
        } catch (err: any) {
            setSchemaError((err as Error).message ?? 'Failed to fetch schema');
            setGqlTab('schema');
        } finally {
            setSchemaLoading(false);
        }
    }, [editing.url, activeEnv]);

    const totalSchemaFields =
        (schemaData?.queryFields.length ?? 0) +
        (schemaData?.mutationFields.length ?? 0) +
        (schemaData?.subscriptionFields.length ?? 0);

    return (
        <div className="flex flex-col h-full" style={{ background: 'var(--bg-1)' }}>
            <RequestNameBar />

            {/* URL bar */}
            <div
                className="flex items-center gap-2 shrink-0"
                style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-0)' }}
            >
                <div
                    className="flex items-center justify-center rounded-[var(--r-sm)] shrink-0"
                    style={{
                        height: 30,
                        padding: '0 10px',
                        background: 'var(--purple-dim)',
                        border: '1px solid color-mix(in srgb, var(--purple) 30%, transparent)',
                        fontSize: 11,
                        fontWeight: 700,
                        color: 'var(--purple)',
                        letterSpacing: '0.04em',
                    }}
                >
                    GQL
                </div>
                <div
                    className="flex-1 relative flex items-center rounded-[var(--r-sm)] overflow-hidden focus-within:border-[var(--border-focus)]"
                    style={{
                        height: 30,
                        border: '1px solid var(--border-1)',
                        background: 'var(--bg-2)',
                    }}
                >
                    <div
                        aria-hidden
                        className="absolute inset-0 flex items-center pointer-events-none"
                        style={{
                            padding: '0 12px',
                            fontSize: 'var(--text-base)',
                            fontFamily: "'JetBrains Mono Variable', monospace",
                            whiteSpace: 'pre',
                            overflow: 'hidden',
                        }}
                        dangerouslySetInnerHTML={{
                            __html: editing.url
                                ? editing.url
                                      .replace(/&/g, '&amp;')
                                      .replace(/</g, '&lt;')
                                      .replace(/>/g, '&gt;')
                                      .replace(/"/g, '&quot;')
                                      .replace(
                                          /(\{\{[^}]*\}\})/g,
                                          '<mark style="background:rgba(251,191,36,0.18);color:var(--yellow);border-radius:2px">$1</mark>'
                                      )
                                : '',
                        }}
                    />
                    <input
                        type="text"
                        value={editing.url}
                        onChange={e => setUrl(e.target.value)}
                        placeholder="https://api.example.com/graphql"
                        className="relative flex-1 bg-transparent outline-none h-full"
                        style={{
                            padding: '0 12px',
                            fontSize: 'var(--text-base)',
                            fontFamily: "'JetBrains Mono Variable', monospace",
                            color: editing.url ? 'transparent' : 'var(--text-0)',
                            caretColor: 'var(--text-0)',
                        }}
                        spellCheck={false}
                    />
                </div>
                {/* Fetch Schema button */}
                <button
                    className="flex items-center gap-1.5 rounded-[var(--r-sm)] shrink-0 cursor-pointer select-none transition-all duration-150 hover:bg-[var(--bg-3)] disabled:opacity-40"
                    style={{
                        height: 30,
                        padding: '0 10px',
                        border: '1px solid var(--border-1)',
                        background: 'var(--bg-2)',
                        fontSize: 'var(--text-sm)',
                        color: 'var(--purple)',
                        fontWeight: 500,
                    }}
                    onClick={fetchSchema}
                    disabled={schemaLoading || !editing.url}
                    title="Run introspection query and explore schema"
                >
                    {schemaLoading ? (
                        <Loader2 style={{ width: 12, height: 12 }} className="animate-spin" />
                    ) : (
                        <RefreshCw style={{ width: 12, height: 12 }} />
                    )}
                    Schema
                </button>
                <button
                    className="flex items-center gap-1.5 rounded-[var(--r-sm)] shrink-0 cursor-pointer select-none transition-all duration-150 hover:brightness-110 active:brightness-95 disabled:opacity-50"
                    style={{
                        height: 30,
                        padding: '0 14px',
                        background: 'var(--accent)',
                        color: '#0d1117',
                        fontSize: 'var(--text-base)',
                        fontWeight: 600,
                    }}
                    onClick={sendRequest}
                    disabled={responseLoading}
                >
                    {responseLoading ? (
                        <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" />
                    ) : (
                        <Send style={{ width: 14, height: 14 }} />
                    )}
                    Send
                </button>
            </div>

            {activeEnv && hasVars(editing.url) && (
                <div
                    className="flex items-center gap-1.5 overflow-hidden shrink-0"
                    style={{ padding: '0 12px 6px' }}
                >
                    <span style={{ fontSize: 10, color: 'var(--text-2)', flexShrink: 0 }}>↳</span>
                    <span
                        className="truncate"
                        style={{
                            fontSize: 10,
                            fontFamily: "'JetBrains Mono Variable', monospace",
                            color: 'var(--text-2)',
                        }}
                    >
                        {resolveVars(editing.url, activeEnv)}
                    </span>
                </div>
            )}

            {/* Tab bar: Query | Schema */}
            <div
                className="flex items-center shrink-0"
                style={{ borderBottom: '1px solid var(--border-0)', paddingLeft: 4 }}
            >
                {(['query', 'schema'] as const).map(t => (
                    <button
                        key={t}
                        className={cn(
                            'relative flex items-center gap-1.5 cursor-pointer select-none transition-colors duration-150',
                            gqlTab === t
                                ? 'text-[var(--text-0)]'
                                : 'text-[var(--text-2)] hover:text-[var(--text-1)]'
                        )}
                        style={{
                            padding: '0 12px',
                            height: 36,
                            fontSize: 12.5,
                            fontWeight: gqlTab === t ? 600 : 400,
                        }}
                        onClick={() => setGqlTab(t)}
                    >
                        {gqlTab === t && (
                            <span className="absolute bottom-0 left-0 right-0 h-[1.5px] rounded-t bg-[var(--purple)]" />
                        )}
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                        {t === 'schema' && totalSchemaFields > 0 && (
                            <span
                                style={{
                                    fontSize: 10,
                                    padding: '1px 5px',
                                    borderRadius: 8,
                                    background: 'var(--purple-dim)',
                                    color: 'var(--purple)',
                                    fontWeight: 600,
                                }}
                            >
                                {totalSchemaFields}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Query tab */}
            {gqlTab === 'query' && (
                <div
                    className="flex flex-1 overflow-hidden animate-tab-in"
                    style={{ gap: 1, background: 'var(--border-0)' }}
                >
                    {/* Query textarea */}
                    <div
                        className="flex flex-col"
                        style={{ flex: 3, background: 'var(--bg-1)', minWidth: 0 }}
                    >
                        <div
                            style={{
                                padding: '4px 12px',
                                fontSize: 10,
                                fontWeight: 700,
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                                color: 'var(--text-2)',
                                borderBottom: '1px solid var(--border-0)',
                            }}
                        >
                            Query
                        </div>
                        <textarea
                            className="flex-1 w-full bg-transparent outline-none resize-none"
                            style={{
                                padding: '12px',
                                fontFamily: "'JetBrains Mono Variable', monospace",
                                fontSize: 'var(--text-base)',
                                color: 'var(--text-0)',
                                lineHeight: 1.7,
                            }}
                            value={editing.graphql.query}
                            onChange={e => patchGraphQL({ query: e.target.value })}
                            spellCheck={false}
                        />
                    </div>

                    {/* Variables textarea */}
                    <div
                        className="flex flex-col"
                        style={{ flex: 2, background: 'var(--bg-1)', minWidth: 0 }}
                    >
                        <div
                            style={{
                                padding: '4px 12px',
                                fontSize: 10,
                                fontWeight: 700,
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                                color: 'var(--text-2)',
                                borderBottom: '1px solid var(--border-0)',
                            }}
                        >
                            Variables{' '}
                            <span
                                style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}
                            >
                                (JSON)
                            </span>
                        </div>
                        <textarea
                            className="flex-1 w-full bg-transparent outline-none resize-none"
                            style={{
                                padding: '12px',
                                fontFamily: "'JetBrains Mono Variable', monospace",
                                fontSize: 'var(--text-base)',
                                color: 'var(--text-0)',
                                lineHeight: 1.7,
                            }}
                            value={editing.graphql.variables}
                            onChange={e => patchGraphQL({ variables: e.target.value })}
                            spellCheck={false}
                            placeholder="{}"
                        />
                        {varsError && (
                            <div
                                style={{
                                    padding: '4px 10px',
                                    fontSize: 10.5,
                                    color: 'var(--red)',
                                    background: 'color-mix(in srgb, var(--red) 8%, var(--bg-1))',
                                    borderTop:
                                        '1px solid color-mix(in srgb, var(--red) 20%, transparent)',
                                    flexShrink: 0,
                                }}
                            >
                                {varsError}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Schema tab */}
            {gqlTab === 'schema' && (
                <div className="flex flex-col flex-1 overflow-hidden animate-tab-in">
                    {schemaError && (
                        <div
                            style={{
                                padding: '6px 14px',
                                fontSize: 11.5,
                                color: 'var(--red)',
                                background: 'color-mix(in srgb, var(--red) 8%, var(--bg-1))',
                                borderBottom:
                                    '1px solid color-mix(in srgb, var(--red) 20%, transparent)',
                                flexShrink: 0,
                            }}
                        >
                            {schemaError}
                        </div>
                    )}
                    {!schemaData && !schemaError && (
                        <div
                            className="flex-1 flex flex-col items-center justify-center gap-3"
                            style={{ color: 'var(--text-2)' }}
                        >
                            <RefreshCw style={{ width: 28, height: 28, opacity: 0.3 }} />
                            <span style={{ fontSize: 'var(--text-sm)' }}>
                                Click <strong style={{ color: 'var(--purple)' }}>Schema</strong> in
                                the toolbar to fetch available types
                            </span>
                        </div>
                    )}
                    {schemaData && (
                        <div className="flex-1 overflow-y-auto" style={{ padding: 16 }}>
                            <GqlSchemaSection title="Query" fields={schemaData.queryFields} />
                            <GqlSchemaSection title="Mutation" fields={schemaData.mutationFields} />
                            <GqlSchemaSection
                                title="Subscription"
                                fields={schemaData.subscriptionFields}
                            />
                            {totalSchemaFields === 0 && (
                                <div style={{ color: 'var(--text-2)', fontSize: 'var(--text-sm)' }}>
                                    No query/mutation/subscription fields found.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Tests editor ─────────────────────────────────────────────────────────

export function TestsEditor({ testResults }: { testResults: TestResult[] }) {
    const { setTests } = useAppStore();
    const editing = useAppStore(selectEditing);
    if (!editing) return null;

    const passed = testResults.filter(r => r.pass).length;
    const failed = testResults.filter(r => !r.pass).length;

    return (
        <div className="flex flex-col h-full">
            <div
                className="flex-1 overflow-hidden flex flex-col"
                style={{
                    borderBottom: testResults.length > 0 ? '1px solid var(--border-0)' : 'none',
                }}
            >
                <div
                    style={{
                        padding: '4px 12px',
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color: 'var(--text-2)',
                        borderBottom: '1px solid var(--border-0)',
                    }}
                >
                    Test script
                </div>
                <textarea
                    className="flex-1 w-full bg-transparent outline-none resize-none"
                    style={{
                        padding: '12px 14px',
                        fontFamily: "'JetBrains Mono Variable', monospace",
                        fontSize: 'var(--text-base)',
                        color: 'var(--text-0)',
                        lineHeight: 1.7,
                    }}
                    value={editing.tests}
                    onChange={e => setTests(e.target.value)}
                    placeholder={
                        'pm.test("Status is 200", () => {\n  pm.expect(pm.response.status).toBe(200)\n})'
                    }
                    spellCheck={false}
                />
            </div>

            {testResults.length > 0 && (
                <div className="overflow-y-auto" style={{ maxHeight: '40%' }}>
                    <div
                        className="flex items-center gap-3 shrink-0"
                        style={{
                            padding: '6px 12px',
                            borderBottom: '1px solid var(--border-0)',
                            fontSize: 11,
                        }}
                    >
                        {passed > 0 && (
                            <span style={{ color: 'var(--green)' }}>✓ {passed} passed</span>
                        )}
                        {failed > 0 && (
                            <span style={{ color: 'var(--red)' }}>✗ {failed} failed</span>
                        )}
                    </div>
                    {testResults.map((r, i) => (
                        <div
                            key={i}
                            className="flex items-start gap-2.5"
                            style={{
                                padding: '6px 12px',
                                borderBottom: '1px solid var(--border-0)',
                                fontSize: 12,
                            }}
                        >
                            <span
                                style={{
                                    color: r.pass ? 'var(--green)' : 'var(--red)',
                                    flexShrink: 0,
                                    marginTop: 1,
                                }}
                            >
                                {r.pass ? '✓' : '✗'}
                            </span>
                            <div className="flex flex-col gap-0.5 min-w-0">
                                <span style={{ color: 'var(--text-1)' }}>{r.name}</span>
                                {!r.pass && r.error && (
                                    <span
                                        style={{
                                            fontFamily: 'monospace',
                                            fontSize: 11,
                                            color: 'var(--red)',
                                            opacity: 0.8,
                                        }}
                                    >
                                        {r.error}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── RequestPanel ──────────────────────────────────────────────────────────

export function RequestPanel() {
    const editing = useAppStore(selectEditing);
    const { setActiveTab, setUrl, sendRequest, saveRequest, environments, activeEnvId } =
        useAppStore();
    const responseLoading = useAppStore(s => {
        const t = s.activeTabId ? s.tabs.find(tab => tab.id === s.activeTabId) : null;
        return t?.responseLoading ?? false;
    });
    const validateSsl = useAppStore(s => s.settings.validateSsl);
    const activeEnv = environments.find(e => e.id === activeEnvId) ?? null;

    // Auto-save with debounce
    React.useEffect(() => {
        if (!editing) return;
        const timer = setTimeout(() => saveRequest(), 800);
        return () => clearTimeout(timer);
    }, [editing, saveRequest]);

    // Keyboard shortcuts
    React.useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const mod = e.metaKey || e.ctrlKey;
            if (mod && e.key === 'Enter') {
                e.preventDefault();
                sendRequest();
            }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [sendRequest]);

    if (!editing) return <NoRequestSelected />;

    // Route to protocol-specific panels
    if (editing.protocol === 'grpc')
        return (
            <div className="flex flex-col h-full" style={{ background: 'var(--bg-1)' }}>
                <ErrorBoundary label="gRPC panel">
                    <GrpcPanel />
                </ErrorBoundary>
            </div>
        );
    if (editing.protocol === 'kafka')
        return (
            <div className="flex flex-col h-full" style={{ background: 'var(--bg-1)' }}>
                <ErrorBoundary label="Kafka panel">
                    <KafkaPanel />
                </ErrorBoundary>
            </div>
        );
    if (editing.protocol === 'sqs')
        return (
            <div className="flex flex-col h-full" style={{ background: 'var(--bg-1)' }}>
                <ErrorBoundary label="SQS panel">
                    <SqsPanel />
                </ErrorBoundary>
            </div>
        );
    if (editing.protocol === 'websocket')
        return (
            <div className="flex flex-col h-full" style={{ background: 'var(--bg-1)' }}>
                <ErrorBoundary label="WebSocket panel">
                    <WsPanel />
                </ErrorBoundary>
            </div>
        );
    if (editing.protocol === 'graphql') return <GraphQLPanel />;

    const activeTab = editing.activeTab;
    const paramCount = editing.params.filter(p => p.enabled && (p.key || p.value)).length;
    const headerCount = editing.headers.filter(h => h.enabled && (h.key || h.value)).length;

    return (
        <div className="flex flex-col h-full" style={{ background: 'var(--bg-1)' }}>
            {/* ── URL bar ─────────────────────────────────────────────────────── */}
            <div
                className="flex flex-col shrink-0"
                style={{ borderBottom: '1px solid var(--border-0)' }}
            >
                <RequestNameBar />
                <div
                    className="flex items-center gap-2"
                    style={{ height: 'var(--toolbar-height)', padding: '0 12px' }}
                >
                    <MethodSelector />

                    <div
                        className="flex-1 relative flex items-center rounded-[var(--r-sm)] overflow-hidden transition-colors duration-150 focus-within:border-[var(--border-focus)]"
                        style={{
                            height: 'var(--input-height)',
                            border: '1px solid var(--border-1)',
                            background: 'var(--bg-2)',
                        }}
                    >
                        {/* Highlight overlay — sits behind the input */}
                        <div
                            aria-hidden
                            className="absolute inset-0 flex items-center pointer-events-none"
                            style={{
                                padding: '0 12px',
                                fontSize: 'var(--text-base)',
                                fontFamily: "'JetBrains Mono Variable', monospace",
                                whiteSpace: 'pre',
                                overflow: 'hidden',
                            }}
                            dangerouslySetInnerHTML={{
                                __html: editing.url
                                    ? editing.url
                                          .replace(/&/g, '&amp;')
                                          .replace(/</g, '&lt;')
                                          .replace(/>/g, '&gt;')
                                          .replace(
                                              /(\{\{[^}]*\}\})/g,
                                              '<mark style="background:rgba(251,191,36,0.18);color:var(--yellow);border-radius:2px">$1</mark>'
                                          )
                                    : '',
                            }}
                        />
                        <input
                            type="text"
                            value={editing.url}
                            onChange={e => setUrl(e.target.value)}
                            placeholder="https://api.example.com/endpoint"
                            className="relative flex-1 bg-transparent outline-none h-full"
                            style={{
                                padding: '0 12px',
                                fontSize: 'var(--text-base)',
                                fontFamily: "'JetBrains Mono Variable', monospace",
                                color: editing.url ? 'transparent' : 'var(--text-0)',
                                caretColor: 'var(--text-0)',
                            }}
                            spellCheck={false}
                        />
                    </div>

                    {!validateSsl && (
                        <span
                            className="shrink-0 rounded-[var(--r-sm)]"
                            style={{
                                fontSize: 10.5,
                                fontWeight: 600,
                                padding: '3px 7px',
                                color: '#f59e0b',
                                background: 'color-mix(in srgb, #f59e0b 12%, transparent)',
                                border: '1px solid color-mix(in srgb, #f59e0b 35%, transparent)',
                                letterSpacing: '0.03em',
                            }}
                            title="SSL certificate verification is disabled in Settings"
                        >
                            SSL verification off
                        </span>
                    )}

                    <button
                        className="flex items-center gap-1.5 rounded-[var(--r-sm)] shrink-0 cursor-pointer select-none transition-all duration-150 hover:brightness-110 active:brightness-95 disabled:opacity-50"
                        style={{
                            height: 'var(--input-height)',
                            padding: '0 14px',
                            background: 'var(--accent)',
                            color: '#0d1117',
                            fontSize: 'var(--text-base)',
                            fontWeight: 600,
                        }}
                        onClick={sendRequest}
                        disabled={responseLoading}
                        title={`Send (${shortcut('↵')})`}
                    >
                        {responseLoading ? (
                            <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" />
                        ) : (
                            <Send style={{ width: 14, height: 14 }} />
                        )}
                        Send
                    </button>
                </div>

                {/* Resolved URL preview */}
                {activeEnv && hasVars(editing.url) && (
                    <div
                        className="flex items-center gap-1.5 overflow-hidden"
                        style={{ padding: '0 12px 6px' }}
                    >
                        <span style={{ fontSize: 10, color: 'var(--text-2)', flexShrink: 0 }}>
                            ↳
                        </span>
                        <span
                            className="truncate"
                            style={{
                                fontSize: 10,
                                fontFamily: "'JetBrains Mono Variable', monospace",
                                color: 'var(--text-2)',
                            }}
                        >
                            {resolveVars(editing.url, activeEnv)}
                        </span>
                        <span
                            className="shrink-0 rounded"
                            style={{
                                fontSize: 9,
                                color: activeEnv.color,
                                background: 'var(--bg-3)',
                                padding: '1px 5px',
                                marginLeft: 'auto',
                            }}
                        >
                            {activeEnv.name}
                        </span>
                    </div>
                )}
            </div>

            {/* ── Tab bar ─────────────────────────────────────────────────────── */}
            <div
                className="flex items-center shrink-0"
                style={{ borderBottom: '1px solid var(--border-0)', paddingLeft: 4 }}
            >
                {REQUEST_TABS.map(tab => {
                    const count =
                        tab.id === 'headers' ? headerCount : tab.id === 'params' ? paramCount : 0;
                    const isActive = activeTab === tab.id;
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
                                <span className="absolute bottom-0 left-0 right-0 h-[1.5px] rounded-t bg-[var(--accent)]" />
                            )}
                            {tab.label}
                            {count > 0 && (
                                <span
                                    className="flex items-center justify-center rounded-full"
                                    style={{
                                        minWidth: 14,
                                        height: 14,
                                        padding: '0 4px',
                                        fontSize: 9,
                                        fontWeight: 700,
                                        background: 'var(--accent-dim)',
                                        color: 'var(--accent)',
                                    }}
                                >
                                    {count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* ── Tab content ─────────────────────────────────────────────────── */}
            <div className="flex-1 overflow-hidden">
                {activeTab === 'params' && <ParamsTable />}
                {activeTab === 'auth' && <AuthEditor />}
                {activeTab === 'headers' && <HeadersTable />}
                {activeTab === 'body' && <BodyEditor />}
                {activeTab === 'tests' && <TestsEditor testResults={[]} />}
                {activeTab === 'docs' && <DocsEditor />}
            </div>
        </div>
    );
}
