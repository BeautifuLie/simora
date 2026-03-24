import React, { useState } from 'react';
import {
    Copy,
    Download,
    Clock,
    Zap,
    ArrowUpRight,
    Loader2,
    Check,
    Search,
    X,
    WifiOff,
    Sliders,
    Trash2,
} from 'lucide-react';
import { SaveFile } from '../../../wailsjs/go/main/App';
import { ClearCookies } from '../../../wailsjs/go/service/RequestService';
import { cn, shortcut } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/badge';
import { useAppStore, selectActiveTab } from '@/store/app';
import { TestsEditor } from '@/components/request/RequestPanel';

const isWails =
    typeof window !== 'undefined' && !!(window as unknown as Record<string, unknown>)['go'];

// ── Helpers ────────────────────────────────────────────────────────────────

function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Basic XML/HTML pretty-printer (indent by nesting level)
function formatXml(xml: string): string {
    try {
        const INDENT = '  ';
        let depth = 0;
        let result = '';
        // Match CDATA sections as single tokens (must come before generic tag pattern)
        const tokens = xml.match(/<!\[CDATA\[[\s\S]*?\]\]>|<[^>]+>|[^<]+/g) ?? [];
        for (const token of tokens) {
            const text = token.trim();
            if (!text) continue;
            if (token.startsWith('<![CDATA[')) {
                // CDATA — emit as-is, no re-indentation of content
                result += INDENT.repeat(depth) + token.trim() + '\n';
            } else if (token.match(/^<\?/)) {
                // processing instruction
                result += INDENT.repeat(depth) + token.trim() + '\n';
            } else if (token.match(/^<!--/)) {
                result += INDENT.repeat(depth) + token.trim() + '\n';
            } else if (token.match(/^<\//)) {
                // closing tag
                depth = Math.max(0, depth - 1);
                result += INDENT.repeat(depth) + token.trim() + '\n';
            } else if (token.match(/\/>$/)) {
                // self-closing tag
                result += INDENT.repeat(depth) + token.trim() + '\n';
            } else if (token.match(/^</)) {
                // opening tag
                result += INDENT.repeat(depth) + token.trim() + '\n';
                depth++;
            } else {
                // text node
                const t = token.trim();
                if (t) result += INDENT.repeat(depth) + t + '\n';
            }
        }
        return result.trimEnd();
    } catch {
        return xml;
    }
}

// ── Copy button ────────────────────────────────────────────────────────────

function CopyButton({ text, title = 'Copy' }: { text: string; title?: string }) {
    const [copied, setCopied] = React.useState(false);
    const copy = () => {
        navigator.clipboard
            .writeText(text)
            .catch(err => console.warn('clipboard write failed:', err));
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };
    return (
        <button
            title={title}
            className="flex items-center justify-center rounded cursor-pointer transition-all duration-150 hover:bg-[var(--bg-3)] hover:text-[var(--text-1)]"
            style={{ width: 26, height: 26, color: copied ? 'var(--green)' : 'var(--text-2)' }}
            onClick={copy}
        >
            {copied ? (
                <Check style={{ width: 12, height: 12 }} />
            ) : (
                <Copy style={{ width: 12, height: 12 }} />
            )}
        </button>
    );
}

// ── Stat chip ──────────────────────────────────────────────────────────────

function StatChip({
    icon,
    value,
    title,
}: {
    icon: React.ReactNode;
    value: string;
    title?: string;
}) {
    return (
        <div
            className="flex items-center gap-1.5"
            title={title}
            style={{
                height: 22,
                padding: '0 8px',
                background: 'var(--bg-2)',
                border: '1px solid var(--border-1)',
                borderRadius: 'var(--r-sm)',
                fontSize: 11,
                fontFamily: 'monospace',
                color: 'var(--text-2)',
            }}
        >
            {icon}
            {value}
        </div>
    );
}

// ── Body viewer ────────────────────────────────────────────────────────────

type BodyView = 'pretty' | 'raw';

const BODY_PREVIEW_LIMIT = 200_000; // ~200 KB of text before truncating

function BodyTab({ body }: { body: string }) {
    const [view, setView] = React.useState<BodyView>('pretty');
    const [search, setSearch] = React.useState('');
    const [showSearch, setShowSearch] = React.useState(false);
    const [showAll, setShowAll] = React.useState(false);
    const searchRef = React.useRef<HTMLInputElement>(null);

    // Reset showAll when body changes
    React.useEffect(() => {
        setShowAll(false);
    }, [body]);

    React.useEffect(() => {
        if (showSearch) searchRef.current?.focus();
    }, [showSearch]);

    const isJson = React.useMemo(() => {
        try {
            JSON.parse(body);
            return true;
        } catch {
            return false;
        }
    }, [body]);

    const isXml = React.useMemo(() => {
        const t = body.trimStart();
        return (
            t.startsWith('<?xml') ||
            (t.startsWith('<') &&
                !t.startsWith('<!DOCTYPE html') &&
                !t.startsWith('<html') &&
                !t.startsWith('<HTML'))
        );
    }, [body]);

    const isHtml = React.useMemo(() => {
        const t = body.trimStart().toLowerCase();
        return t.startsWith('<!doctype html') || t.startsWith('<html');
    }, [body]);

    const prettyBody = React.useMemo(() => {
        if (isJson) {
            try {
                return JSON.stringify(JSON.parse(body), null, 2);
            } catch {
                return body;
            }
        }
        if (isXml || isHtml) {
            return formatXml(body);
        }
        return body;
    }, [body, isJson, isXml, isHtml]);

    const isTruncated =
        (view === 'pretty' ? prettyBody : body).length > BODY_PREVIEW_LIMIT && !showAll;

    const highlighted = React.useMemo(() => {
        const fullSrc = view === 'pretty' ? prettyBody : body;
        const src = isTruncated ? fullSrc.slice(0, BODY_PREVIEW_LIMIT) : fullSrc;
        const esc = src.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        if (view === 'pretty' && isJson) {
            return esc
                .replace(
                    /"([^"\\]*(\\.[^"\\]*)*)"(\s*):/g,
                    '<span style="color:#7c9cf0">"$1"</span>$3:'
                )
                .replace(
                    /:\s*"([^"\\]*(\\.[^"\\]*)*)"/g,
                    ': <span style="color:#4ade80">"$1"</span>'
                )
                .replace(/:\s*(true|false|null)\b/g, ': <span style="color:#fb923c">$1</span>')
                .replace(
                    /:\s*(-?\d+\.?\d*(?:[eE][+-]?\d+)?)\b/g,
                    ': <span style="color:#fbbf24">$1</span>'
                )
                .replace(/([{}[\]])/g, '<span style="color:rgba(255,255,255,0.2)">$1</span>');
        }
        if (view === 'pretty' && (isXml || isHtml)) {
            return esc
                .replace(
                    /&lt;(\/?)([\w:.-]+)([^&]*?)(\/?&gt;)/g,
                    (_m, slash, tag, attrs, close) => {
                        const coloredAttrs = attrs.replace(
                            /([\w:.-]+)=&quot;([^&]*)&quot;/g,
                            '<span style="color:#c084fc">$1</span>=<span style="color:#4ade80">&quot;$2&quot;</span>'
                        );
                        return `&lt;<span style="color:#7c9cf0">${slash}${tag}</span>${coloredAttrs}${close}`;
                    }
                )
                .replace(
                    /&lt;!--([\s\S]*?)--&gt;/g,
                    '<span style="color:rgba(255,255,255,0.3)">&lt;!--$1--&gt;</span>'
                )
                .replace(
                    /&lt;\?([\s\S]*?)\?&gt;/g,
                    '<span style="color:#fb923c">&lt;?$1?&gt;</span>'
                );
        }
        return esc;
    }, [body, prettyBody, view, isJson, isXml, isHtml, isTruncated]);

    const displayHtml = React.useMemo(() => {
        if (!search.trim()) return highlighted;
        const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return highlighted.replace(
            new RegExp(`(${escaped})`, 'gi'),
            '<mark style="background:var(--yellow-dim);color:var(--yellow)">$1</mark>'
        );
    }, [highlighted, search]);

    return (
        <div className="flex flex-col h-full">
            {/* Toolbar */}
            <div
                className="flex items-center shrink-0"
                style={{ borderBottom: '1px solid var(--border-0)', paddingLeft: 4 }}
            >
                {/* Pretty / Raw tabs */}
                <div className="flex items-center flex-1">
                    {(['pretty', 'raw'] as BodyView[]).map(v => {
                        const isActive = view === v;
                        return (
                            <button
                                key={v}
                                className={cn(
                                    'relative flex items-center cursor-pointer select-none transition-colors duration-150 capitalize',
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
                                onClick={() => setView(v)}
                            >
                                {isActive && (
                                    <span className="absolute bottom-0 left-0 right-0 h-[1.5px] rounded-t bg-[var(--accent)]" />
                                )}
                                {v.charAt(0).toUpperCase() + v.slice(1)}
                            </button>
                        );
                    })}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-0.5 pr-2">
                    {showSearch ? (
                        <div
                            className="flex items-center gap-1.5 rounded-[var(--r-sm)]"
                            style={{
                                padding: '0 8px',
                                height: 26,
                                background: 'var(--bg-2)',
                                border: '1px solid var(--border-2)',
                            }}
                        >
                            <Search
                                style={{
                                    width: 11,
                                    height: 11,
                                    color: 'var(--text-2)',
                                    flexShrink: 0,
                                }}
                            />
                            <input
                                ref={searchRef}
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search…"
                                className="bg-transparent outline-none"
                                style={{ width: 120, fontSize: 12, color: 'var(--text-0)' }}
                            />
                            <button
                                className="cursor-pointer transition-colors hover:text-[var(--text-1)]"
                                style={{ color: 'var(--text-2)' }}
                                onClick={() => {
                                    setShowSearch(false);
                                    setSearch('');
                                }}
                            >
                                <X style={{ width: 10, height: 10 }} />
                            </button>
                        </div>
                    ) : (
                        <button
                            title={`Search (${shortcut('F')})`}
                            className="flex items-center justify-center rounded cursor-pointer transition-all duration-150 hover:bg-[var(--bg-3)] hover:text-[var(--text-1)]"
                            style={{ width: 26, height: 26, color: 'var(--text-2)' }}
                            onClick={() => setShowSearch(true)}
                        >
                            <Search style={{ width: 12, height: 12 }} />
                        </button>
                    )}

                    <CopyButton text={view === 'pretty' ? prettyBody : body} title="Copy body" />

                    <button
                        title="Download"
                        className="flex items-center justify-center rounded cursor-pointer transition-all duration-150 hover:bg-[var(--bg-3)] hover:text-[var(--text-1)]"
                        style={{ width: 26, height: 26, color: 'var(--text-2)' }}
                        onClick={() =>
                            SaveFile(view === 'pretty' ? prettyBody : body, 'response.json').catch(
                                err => console.warn('save file failed:', err)
                            )
                        }
                    >
                        <Download style={{ width: 12, height: 12 }} />
                    </button>
                </div>
            </div>

            {/* Code */}
            <div className="flex-1 overflow-auto">
                <pre
                    style={{
                        padding: '14px 16px',
                        fontFamily: "'JetBrains Mono Variable', monospace",
                        fontSize: 'var(--text-base)',
                        lineHeight: 1.75,
                        color: 'var(--text-0)',
                        whiteSpace: 'pre-wrap',
                        overflowWrap: 'break-word',
                    }}
                    dangerouslySetInnerHTML={{ __html: displayHtml }}
                />
                {isTruncated && (
                    <div
                        className="flex items-center justify-between shrink-0"
                        style={{
                            padding: '8px 16px',
                            background: 'color-mix(in srgb, var(--yellow) 8%, var(--bg-1))',
                            borderTop:
                                '1px solid color-mix(in srgb, var(--yellow) 25%, transparent)',
                        }}
                    >
                        <span style={{ fontSize: 11.5, color: 'var(--yellow)' }}>
                            Showing first {(BODY_PREVIEW_LIMIT / 1024).toFixed(0)} KB — response is
                            large
                        </span>
                        <button
                            className="cursor-pointer rounded-[var(--r-sm)] transition-colors hover:brightness-110"
                            style={{
                                height: 22,
                                padding: '0 10px',
                                fontSize: 11,
                                fontWeight: 600,
                                background: 'color-mix(in srgb, var(--yellow) 15%, transparent)',
                                border: '1px solid color-mix(in srgb, var(--yellow) 30%, transparent)',
                                color: 'var(--yellow)',
                            }}
                            onClick={() => setShowAll(true)}
                        >
                            Show all
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Response headers ────────────────────────────────────────────────────────

function HeadersTab({ headers }: { headers: Record<string, string | string[]> }) {
    const entries = Object.entries(headers);

    return (
        <div className="flex flex-col h-full">
            {/* Toolbar */}
            <div
                className="flex items-center justify-between shrink-0"
                style={{
                    height: 36,
                    padding: '0 12px',
                    borderBottom: '1px solid var(--border-0)',
                    background: 'var(--bg-0)',
                }}
            >
                <span
                    style={{
                        fontSize: 10.5,
                        fontWeight: 700,
                        letterSpacing: '0.07em',
                        textTransform: 'uppercase',
                        color: 'var(--text-2)',
                    }}
                >
                    {entries.length} {entries.length === 1 ? 'header' : 'headers'}
                </span>
                <CopyButton
                    text={entries
                        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
                        .join('\n')}
                    title="Copy all headers"
                />
            </div>

            {/* Rows */}
            <div className="flex-1 overflow-y-auto">
                {entries.map(([key, values]) => {
                    const val = Array.isArray(values) ? values.join(', ') : String(values);
                    return (
                        <div
                            key={key}
                            className="group grid"
                            style={{
                                gridTemplateColumns: '42% 1fr 28px',
                                minHeight: 34,
                                borderBottom: '1px solid var(--border-0)',
                            }}
                        >
                            {/* Name — darker bg */}
                            <div
                                className="flex items-center"
                                style={{
                                    padding: '6px 12px',
                                    background: 'var(--bg-0)',
                                    borderRight: '1px solid var(--border-1)',
                                }}
                            >
                                <span
                                    style={{
                                        fontFamily: 'monospace',
                                        fontSize: 'var(--text-base)',
                                        color: '#79c0ff',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {key}
                                </span>
                            </div>
                            {/* Value — normal bg */}
                            <div
                                className="flex items-center group-hover:bg-[var(--bg-2)] transition-colors"
                                style={{ padding: '6px 10px' }}
                            >
                                <span
                                    style={{
                                        fontFamily: 'monospace',
                                        fontSize: 'var(--text-base)',
                                        color: 'var(--text-0)',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {val}
                                </span>
                            </div>
                            {/* Copy */}
                            <div className="flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <CopyButton text={`${key}: ${val}`} title="Copy" />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ── Cookies ─────────────────────────────────────────────────────────────────

interface ParsedCookie {
    name: string;
    value: string;
    domain: string;
    path: string;
    expires: string;
    secure: boolean;
    httpOnly: boolean;
    sameSite: string;
}

function parseCookie(raw: string): ParsedCookie {
    const parts = raw.split(';').map(p => p.trim());
    const [nameRaw, ...attrParts] = parts;
    const eqIdx = (nameRaw ?? '').indexOf('=');
    const name = eqIdx >= 0 ? nameRaw.slice(0, eqIdx) : (nameRaw ?? '');
    const value = eqIdx >= 0 ? nameRaw.slice(eqIdx + 1) : '';

    const cookie: ParsedCookie = {
        name,
        value,
        domain: '',
        path: '/',
        expires: '',
        secure: false,
        httpOnly: false,
        sameSite: '',
    };

    for (const part of attrParts) {
        const lower = part.toLowerCase();
        if (lower === 'secure') {
            cookie.secure = true;
            continue;
        }
        if (lower === 'httponly') {
            cookie.httpOnly = true;
            continue;
        }
        const eqI = part.indexOf('=');
        if (eqI < 0) continue;
        const k = part.slice(0, eqI).trim().toLowerCase();
        const v = part.slice(eqI + 1).trim();
        if (k === 'domain') cookie.domain = v;
        if (k === 'path') cookie.path = v;
        if (k === 'expires') cookie.expires = v;
        if (k === 'max-age') cookie.expires = `${v}s`;
        if (k === 'samesite') cookie.sameSite = v;
    }
    return cookie;
}

function CookiesTab({ headers }: { headers: Record<string, string | string[]> }) {
    const setCookieHeader = Object.entries(headers).find(([k]) => k.toLowerCase() === 'set-cookie');
    const rawValues = setCookieHeader
        ? Array.isArray(setCookieHeader[1])
            ? setCookieHeader[1]
            : [setCookieHeader[1]]
        : [];
    const cookies = rawValues.map(parseCookie);
    const [cleared, setCleared] = useState(false);

    const handleClearCookies = async () => {
        if (isWails) await ClearCookies();
        setCleared(true);
        setTimeout(() => setCleared(false), 2000);
    };

    if (cookies.length === 0) {
        return (
            <div
                className="flex flex-col items-center justify-center h-full gap-3"
                style={{ color: 'var(--text-2)' }}
            >
                <div
                    className="flex items-center justify-center rounded-[var(--r-lg)]"
                    style={{
                        width: 40,
                        height: 40,
                        background: 'var(--bg-2)',
                        border: '1px solid var(--border-1)',
                        fontSize: 18,
                    }}
                >
                    🍪
                </div>
                <div className="flex flex-col items-center gap-1">
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)' }}>
                        No cookies
                    </span>
                    <span style={{ fontSize: 12 }}>No Set-Cookie headers in this response</span>
                </div>
                <button
                    onClick={handleClearCookies}
                    className="flex items-center gap-1.5 rounded-[var(--r-sm)] cursor-pointer transition-colors duration-150 hover:bg-[var(--bg-3)]"
                    style={{
                        marginTop: 4,
                        padding: '5px 10px',
                        fontSize: 11,
                        color: cleared ? 'var(--green)' : 'var(--text-2)',
                    }}
                    title="Clear all stored cookies from the cookie jar"
                >
                    {cleared ? (
                        <Check style={{ width: 11, height: 11 }} />
                    ) : (
                        <Trash2 style={{ width: 11, height: 11 }} />
                    )}
                    {cleared ? 'Cookie jar cleared' : 'Clear cookie jar'}
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Toolbar */}
            <div
                className="flex items-center justify-between shrink-0"
                style={{
                    height: 36,
                    padding: '0 12px',
                    borderBottom: '1px solid var(--border-0)',
                    background: 'var(--bg-0)',
                }}
            >
                <span
                    style={{
                        fontSize: 10.5,
                        fontWeight: 700,
                        letterSpacing: '0.07em',
                        textTransform: 'uppercase',
                        color: 'var(--text-2)',
                    }}
                >
                    {cookies.length} {cookies.length === 1 ? 'cookie' : 'cookies'} in this response
                </span>
                <button
                    onClick={handleClearCookies}
                    className="flex items-center gap-1.5 rounded-[var(--r-sm)] cursor-pointer transition-colors duration-150 hover:bg-[var(--bg-3)]"
                    style={{
                        padding: '4px 8px',
                        fontSize: 11,
                        color: cleared ? 'var(--green)' : 'var(--text-2)',
                    }}
                    title="Clear all stored cookies from the cookie jar"
                >
                    {cleared ? (
                        <Check style={{ width: 11, height: 11 }} />
                    ) : (
                        <Trash2 style={{ width: 11, height: 11 }} />
                    )}
                    {cleared ? 'Cleared' : 'Clear jar'}
                </button>
            </div>

            {/* Table header */}
            <div
                className="grid shrink-0"
                style={{
                    gridTemplateColumns: '22% 22% 16% 10% 18% 6% 6%',
                    borderBottom: '1px solid var(--border-1)',
                    background: 'var(--bg-0)',
                }}
            >
                {['Name', 'Value', 'Domain', 'Path', 'Expires', 'Sec', 'HttpOnly'].map(col => (
                    <div
                        key={col}
                        style={{
                            padding: '6px 10px',
                            fontSize: 10.5,
                            fontWeight: 700,
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                            color: 'var(--text-2)',
                        }}
                    >
                        {col}
                    </div>
                ))}
            </div>

            {/* Rows */}
            <div className="flex-1 overflow-y-auto">
                {cookies.map((c, i) => (
                    <div
                        key={i}
                        className="group grid hover:bg-[var(--bg-2)] transition-colors"
                        style={{
                            gridTemplateColumns: '22% 22% 16% 10% 18% 6% 6%',
                            minHeight: 34,
                            borderBottom: '1px solid var(--border-0)',
                        }}
                    >
                        <Cell value={c.name} accent="name" />
                        <Cell value={c.value} />
                        <Cell value={c.domain} />
                        <Cell value={c.path} />
                        <Cell value={c.expires} />
                        <FlagCell active={c.secure} />
                        <FlagCell active={c.httpOnly} />
                    </div>
                ))}
            </div>
        </div>
    );
}

function Cell({ value, accent }: { value: string; accent?: 'name' }) {
    return (
        <div
            className="flex items-center"
            style={{ padding: '6px 10px', borderRight: '1px solid var(--border-0)' }}
        >
            <span
                style={{
                    fontFamily: 'monospace',
                    fontSize: 'var(--text-base)',
                    color: accent === 'name' ? '#79c0ff' : 'var(--text-0)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                }}
            >
                {value || <span style={{ color: 'var(--text-2)', opacity: 0.5 }}>—</span>}
            </span>
        </div>
    );
}

function FlagCell({ active }: { active: boolean }) {
    return (
        <div
            className="flex items-center justify-center"
            style={{ padding: '6px 4px', borderRight: '1px solid var(--border-0)' }}
        >
            {active && (
                <svg viewBox="0 0 10 10" style={{ width: 10, height: 10 }} fill="none">
                    <path
                        d="M1.5 5l2.5 2.5 4.5-4"
                        stroke="var(--accent)"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            )}
        </div>
    );
}

// ── Timeline ────────────────────────────────────────────────────────────────

const TIMELINE_PHASES = [
    { label: 'DNS Lookup', ms: 12, color: 'var(--blue)' },
    { label: 'TCP Handshake', ms: 18, color: 'var(--green)' },
    { label: 'SSL / TLS', ms: 32, color: 'var(--purple)' },
    { label: 'Request Sent', ms: 2, color: 'var(--yellow)' },
    { label: 'Waiting (TTFB)', ms: 68, color: 'var(--orange)' },
    { label: 'Content Download', ms: 10, color: 'var(--green)' },
];

function TimelineView({ total }: { total: number }) {
    return (
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {TIMELINE_PHASES.map(({ label, ms, color }) => (
                <div key={label} className="flex items-center gap-3">
                    <span
                        className="shrink-0"
                        style={{ width: 140, fontSize: 12, color: 'var(--text-2)' }}
                    >
                        {label}
                    </span>
                    <div
                        className="flex-1 overflow-hidden rounded-full"
                        style={{ height: 3, background: 'var(--bg-3)' }}
                    >
                        <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                                width: `${(ms / total) * 100}%`,
                                background: color,
                                opacity: 0.85,
                            }}
                        />
                    </div>
                    <span
                        className="shrink-0 text-right"
                        style={{
                            width: 48,
                            fontFamily: 'monospace',
                            fontSize: 11.5,
                            color: 'var(--text-2)',
                        }}
                    >
                        {ms}ms
                    </span>
                </div>
            ))}
            <div
                className="flex items-center justify-between"
                style={{ marginTop: 4, paddingTop: 10, borderTop: '1px solid var(--border-1)' }}
            >
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)' }}>Total</span>
                <span
                    style={{
                        fontFamily: 'monospace',
                        fontSize: 12.5,
                        fontWeight: 700,
                        color: 'var(--text-0)',
                    }}
                >
                    {total}ms
                </span>
            </div>
        </div>
    );
}

// ── Transform tab ───────────────────────────────────────────────────────────

type ExportFormat = 'json' | 'csv' | 'tsv' | 'yaml';

const EXPORT_FORMATS: { id: ExportFormat; label: string; ext: string; mime: string }[] = [
    { id: 'json', label: 'JSON', ext: 'json', mime: 'application/json' },
    { id: 'csv', label: 'CSV', ext: 'csv', mime: 'text/csv' },
    { id: 'tsv', label: 'TSV', ext: 'tsv', mime: 'text/tab-separated-values' },
    { id: 'yaml', label: 'YAML', ext: 'yaml', mime: 'text/yaml' },
];

// ── Path helpers ─────────────────────────────────────────────────────────────
//
// Path format uses standard dot-notation for object keys.
// Arrays of objects are represented with a "key[]" segment:
//   {"users": [{"id": 1}]}  →  "users[].id"
//   {"data": [{"items": [{"price": 5}]}]}  →  "data[].items[].price"
// Arrays of primitives stay as leaf paths (not expanded):
//   {"tags": ["a","b"]}  →  "tags"

function flattenLeafPaths(obj: unknown, prefix = ''): string[] {
    if (typeof obj !== 'object' || obj === null) return prefix ? [prefix] : [];
    if (Array.isArray(obj)) {
        const sample = obj.find(v => v !== null && v !== undefined);
        // Array of objects → expand with [] marker
        if (sample !== undefined && typeof sample === 'object' && !Array.isArray(sample))
            return flattenLeafPaths(sample, prefix ? `${prefix}[]` : '[]');
        // Array of primitives / empty → treat as leaf
        return prefix ? [prefix] : [];
    }
    const entries = Object.entries(obj as Record<string, unknown>);
    if (entries.length === 0) return prefix ? [prefix] : [];
    return entries.flatMap(([k, v]) => flattenLeafPaths(v, prefix ? `${prefix}.${k}` : k));
}

// Structurally filter data to only the selected leaf paths.
// prefix tracks the current position in path-space (same format as flattenLeafPaths).
function filterData(data: unknown, sel: Set<string>, prefix = ''): unknown {
    if (data === null || data === undefined || typeof data !== 'object') return data;
    if (Array.isArray(data)) {
        const ap = prefix ? `${prefix}[]` : '[]';
        return (data as unknown[]).map(item => filterData(item, sel, ap));
    }
    const obj = data as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj)) {
        const p = prefix ? `${prefix}.${key}` : key;
        const ap = `${p}[]`;
        if (val === null || typeof val !== 'object') {
            if (sel.has(p)) result[key] = val;
        } else if (Array.isArray(val)) {
            if (sel.has(p)) {
                result[key] = val; // whole primitive array selected
            } else if ([...sel].some(s => s === ap || s.startsWith(`${ap}.`))) {
                result[key] = (val as unknown[]).map(item => filterData(item, sel, ap));
            }
        } else {
            // nested object – include if any descendant selected
            if ([...sel].some(s => s === p || s.startsWith(`${p}.`) || s.startsWith(ap))) {
                result[key] = filterData(val, sel, p);
            }
        }
    }
    return result;
}

// Traverse a dot path that may contain [] markers.
// [] segments are treated as: get the array, stringify it (for flat CSV cells).
function getByDotPath(obj: unknown, path: string): unknown {
    const parts = path.split('.');
    let cur: unknown = obj;
    for (const part of parts) {
        if (cur == null) return undefined;
        if (part.endsWith('[]')) {
            const key = part.slice(0, -2);
            if (key) {
                if (typeof cur !== 'object' || Array.isArray(cur)) return undefined;
                cur = (cur as Record<string, unknown>)[key];
            }
            if (Array.isArray(cur)) return JSON.stringify(cur);
            return undefined;
        }
        if (typeof cur !== 'object' || Array.isArray(cur)) return undefined;
        cur = (cur as Record<string, unknown>)[part];
    }
    return cur;
}

// ── Flat row builder for CSV / TSV ───────────────────────────────────────────
//
// Detects whether all array-path selections share a dominant array prefix
// (e.g. "users[]") and, if so, uses that array as the row source.
// Scalar paths appear as constant columns repeated per row.

function buildFlatRows(
    data: unknown,
    selected: string[]
): { headers: string[]; rows: unknown[][] } {
    const arrayPaths = selected.filter(p => p.includes('[]'));
    const scalarPaths = selected.filter(p => !p.includes('[]'));

    if (arrayPaths.length > 0) {
        // Count leading array prefixes to find the dominant one
        const cnt: Record<string, number> = {};
        for (const p of arrayPaths) {
            const pfx = p.slice(0, p.indexOf('[]') + 2); // e.g. "users[]"
            cnt[pfx] = (cnt[pfx] ?? 0) + 1;
        }
        const [domPfx] = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
        const arrayKey = domPfx.slice(0, -2); // "users[]" → "users"

        // Source array: nested key or root
        const srcArr = arrayKey
            ? getByDotPath(data, arrayKey)
            : Array.isArray(data)
              ? data
              : undefined;

        if (Array.isArray(srcArr)) {
            // Sub-paths relative to array items (strip the dominant prefix)
            const subPaths = arrayPaths
                .filter(p => p.startsWith(`${domPfx}.`) || p === domPfx)
                .map(p => (p === domPfx ? '' : p.slice(domPfx.length + 1)))
                .filter(Boolean);

            const headers = [...subPaths, ...scalarPaths];
            const rows = (srcArr as unknown[]).map(item => [
                ...subPaths.map(sp => getByDotPath(item, sp)),
                ...scalarPaths.map(sp => getByDotPath(data, sp)),
            ]);
            return { headers, rows };
        }
    }

    // Root-array fallback
    if (Array.isArray(data) && scalarPaths.length > 0) {
        return {
            headers: scalarPaths,
            rows: (data as unknown[]).map(item => scalarPaths.map(sp => getByDotPath(item, sp))),
        };
    }

    // Single-row object
    return { headers: selected, rows: [selected.map(p => getByDotPath(data, p))] };
}

function cellStr(v: unknown): string {
    if (v == null) return '';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
}

function escCSV(v: unknown): string {
    const s = cellStr(v);
    return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s;
}
function escTSV(v: unknown): string {
    return cellStr(v).replace(/\t/g, ' ').replace(/\n/g, '\\n');
}

// ── YAML serialiser ──────────────────────────────────────────────────────────

function toYAML(data: unknown, indent = 0): string {
    const pad = '  '.repeat(indent);
    if (data === null || data === undefined) return 'null';
    if (typeof data === 'boolean' || typeof data === 'number') return String(data);
    if (typeof data === 'string') {
        if (!data) return "''";
        if (/[:#[\]{}&*!|>'"%@`,]/.test(data) || data.includes('\n'))
            return `'${data.replace(/'/g, "''")}'`;
        return data;
    }
    if (Array.isArray(data)) {
        if (data.length === 0) return '[]';
        return data
            .map(item => {
                if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
                    const entries = Object.entries(item as Record<string, unknown>);
                    if (entries.length === 0) return `${pad}-`;
                    return entries
                        .map(([k, v], i) => {
                            const pfx = i === 0 ? `${pad}- ` : `${pad}  `;
                            if (typeof v === 'object' && v !== null)
                                return `${pfx}${k}:\n${toYAML(v, indent + 2)}`;
                            return `${pfx}${k}: ${toYAML(v, 0)}`;
                        })
                        .join('\n');
                }
                return `${pad}- ${toYAML(item, 0)}`;
            })
            .join('\n');
    }
    if (typeof data === 'object') {
        return Object.entries(data as Record<string, unknown>)
            .map(([k, v]) => {
                if (typeof v === 'object' && v !== null)
                    return `${pad}${k}:\n${toYAML(v, indent + 1)}`;
                return `${pad}${k}: ${toYAML(v, 0)}`;
            })
            .join('\n');
    }
    return String(data);
}

// ── Main output builder ──────────────────────────────────────────────────────

function buildOutput(
    data: unknown,
    isArray: boolean,
    selected: string[],
    format: ExportFormat
): string {
    if (!selected.length) return '';

    if (format === 'csv' || format === 'tsv') {
        const { headers, rows } = buildFlatRows(data, selected);
        const sep = format === 'csv' ? ',' : '\t';
        const esc = format === 'csv' ? escCSV : escTSV;
        return [headers.join(sep), ...rows.map(r => r.map(esc).join(sep))].join('\n');
    }

    const sel = new Set(selected);
    // For root arrays: filter each item independently (paths have no [] root prefix)
    const filtered = isArray
        ? (data as unknown[]).map(item => filterData(item, sel, ''))
        : filterData(data, sel, '');
    return format === 'yaml' ? toYAML(filtered) : JSON.stringify(filtered, null, 2);
}

// ── Field tree ───────────────────────────────────────────────────────────────

interface TreeNode {
    key: string; // path segment (may end with "[]" for object-arrays)
    path: string; // full dot-notation path
    isLeaf: boolean;
    children: TreeNode[];
}

// Build ordered tree from flat leaf paths by splitting on "."
function buildTree(paths: string[]): TreeNode[] {
    const sentinel: TreeNode = { key: '', path: '', isLeaf: false, children: [] };
    for (const fullPath of paths) {
        const parts = fullPath.split('.');
        let parent = sentinel;
        for (let i = 0; i < parts.length; i++) {
            const key = parts[i];
            const nodePath = parts.slice(0, i + 1).join('.');
            const isLeaf = i === parts.length - 1;
            let node = parent.children.find(c => c.key === key);
            if (!node) {
                node = { key, path: nodePath, isLeaf: false, children: [] };
                parent.children.push(node);
            }
            if (isLeaf) node.isLeaf = true;
            parent = node;
        }
    }
    return sentinel.children;
}

function TreeNodeRow({
    node,
    depth,
    selected,
    allLeafPaths,
    onToggleLeaf,
    onToggleGroup,
}: {
    node: TreeNode;
    depth: number;
    selected: Set<string>;
    allLeafPaths: string[];
    onToggleLeaf: (_path: string) => void;
    onToggleGroup: (_paths: string[], _checked: boolean) => void;
}) {
    const [open, setOpen] = React.useState(true);
    const isArrayNode = node.key.endsWith('[]');
    const displayKey = isArrayNode ? node.key.slice(0, -2) : node.key;

    if (node.isLeaf && !node.children.length) {
        const checked = selected.has(node.path);
        return (
            <label
                className="flex items-center gap-1.5 cursor-pointer hover:bg-[var(--bg-2)] transition-colors"
                style={{ paddingLeft: 8 + depth * 14, paddingRight: 10, minHeight: 28 }}
            >
                <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggleLeaf(node.path)}
                    className="cursor-pointer"
                    style={{ accentColor: 'var(--accent)', width: 12, height: 12, flexShrink: 0 }}
                />
                <span
                    style={{
                        fontFamily: 'monospace',
                        fontSize: 11.5,
                        color: checked ? 'var(--text-0)' : 'var(--text-2)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {displayKey}
                </span>
            </label>
        );
    }

    // Group node (object or object-array)
    const leaves = allLeafPaths.filter(p => p === node.path || p.startsWith(`${node.path}.`));
    const checkedLeaves = leaves.filter(p => selected.has(p));
    const groupState =
        checkedLeaves.length === 0
            ? 'none'
            : checkedLeaves.length === leaves.length
              ? 'all'
              : 'partial';

    return (
        <>
            <div
                className="flex items-center gap-1.5 cursor-pointer hover:bg-[var(--bg-2)] transition-colors select-none"
                style={{ paddingLeft: 8 + depth * 14, paddingRight: 10, minHeight: 28 }}
                onClick={() => setOpen(o => !o)}
            >
                <input
                    type="checkbox"
                    checked={groupState === 'all'}
                    ref={el => {
                        if (el) el.indeterminate = groupState === 'partial';
                    }}
                    onChange={e => {
                        e.stopPropagation();
                        onToggleGroup(leaves, groupState !== 'all');
                    }}
                    onClick={e => e.stopPropagation()}
                    className="cursor-pointer"
                    style={{ accentColor: 'var(--accent)', width: 12, height: 12, flexShrink: 0 }}
                />
                <svg
                    viewBox="0 0 10 10"
                    fill="none"
                    style={{
                        width: 9,
                        height: 9,
                        flexShrink: 0,
                        color: 'var(--text-2)',
                        transition: 'transform 0.15s',
                        transform: open ? 'rotate(90deg)' : 'rotate(0)',
                    }}
                >
                    <path
                        d="M3 2l4 3-4 3"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
                <span
                    style={{
                        fontFamily: 'monospace',
                        fontSize: 11.5,
                        fontWeight: 600,
                        color: 'var(--text-1)',
                    }}
                >
                    {displayKey}
                </span>
                <span style={{ fontSize: 10, color: 'var(--text-2)', marginLeft: 1 }}>
                    {isArrayNode ? '[…]' : '{…}'}
                </span>
            </div>
            {open &&
                node.children.map(child => (
                    <TreeNodeRow
                        key={child.path}
                        node={child}
                        depth={depth + 1}
                        selected={selected}
                        allLeafPaths={allLeafPaths}
                        onToggleLeaf={onToggleLeaf}
                        onToggleGroup={onToggleGroup}
                    />
                ))}
        </>
    );
}

// ── TransformTab ─────────────────────────────────────────────────────────────

function TransformTab({ body }: { body: string }) {
    const parsed = React.useMemo(() => {
        try {
            return JSON.parse(body);
        } catch {
            return null;
        }
    }, [body]);

    const isArray = Array.isArray(parsed);
    // For root arrays use first item as schema source; paths will have no [] root prefix
    const sample = isArray ? (parsed as unknown[])[0] : parsed;

    const allPaths = React.useMemo(() => flattenLeafPaths(sample), [sample]);
    const tree = React.useMemo(() => buildTree(allPaths), [allPaths]);

    const [selected, setSelected] = React.useState<Set<string>>(() => new Set(allPaths));
    const [format, setFormat] = React.useState<ExportFormat>('json');

    React.useEffect(() => {
        setSelected(new Set(allPaths));
    }, [allPaths]);

    const selectedPaths = React.useMemo(
        () => allPaths.filter(p => selected.has(p)),
        [allPaths, selected]
    );

    const output = React.useMemo(
        () => (selectedPaths.length ? buildOutput(parsed, isArray, selectedPaths, format) : ''),
        [parsed, isArray, selectedPaths, format]
    );

    const toggleLeaf = (path: string) =>
        setSelected(prev => {
            const s = new Set(prev);
            s.has(path) ? s.delete(path) : s.add(path);
            return s;
        });

    const toggleGroup = (paths: string[], checked: boolean) =>
        setSelected(prev => {
            const s = new Set(prev);
            paths.forEach(p => (checked ? s.add(p) : s.delete(p)));
            return s;
        });

    const toggleAll = () =>
        setSelected(selected.size === allPaths.length ? new Set() : new Set(allPaths));

    const fmtInfo = EXPORT_FORMATS.find(f => f.id === format)!;

    if (!parsed || typeof parsed !== 'object') {
        return (
            <div
                className="flex flex-col items-center justify-center h-full gap-2"
                style={{ color: 'var(--text-2)' }}
            >
                <Sliders style={{ width: 20, height: 20, opacity: 0.4 }} />
                <span style={{ fontSize: 13 }}>Response is not valid JSON</span>
            </div>
        );
    }
    if (allPaths.length === 0) {
        return (
            <div
                className="flex flex-col items-center justify-center h-full gap-2"
                style={{ color: 'var(--text-2)' }}
            >
                <Sliders style={{ width: 20, height: 20, opacity: 0.4 }} />
                <span style={{ fontSize: 13 }}>No fields to select</span>
            </div>
        );
    }

    return (
        <div className="flex h-full overflow-hidden">
            {/* Left: field tree */}
            <div
                className="flex flex-col shrink-0 overflow-hidden"
                style={{ width: 220, borderRight: '1px solid var(--border-0)' }}
            >
                <div
                    className="flex items-center justify-between shrink-0"
                    style={{
                        height: 36,
                        padding: '0 12px',
                        borderBottom: '1px solid var(--border-0)',
                        background: 'var(--bg-0)',
                    }}
                >
                    <span
                        style={{
                            fontSize: 10.5,
                            fontWeight: 700,
                            letterSpacing: '0.07em',
                            textTransform: 'uppercase',
                            color: 'var(--text-2)',
                        }}
                    >
                        Fields ({selected.size}/{allPaths.length})
                    </span>
                    <button
                        className="cursor-pointer transition-colors hover:text-[var(--text-0)]"
                        style={{ fontSize: 11, color: 'var(--text-2)' }}
                        onClick={toggleAll}
                    >
                        {selected.size === allPaths.length ? 'None' : 'All'}
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto" style={{ paddingTop: 4, paddingBottom: 4 }}>
                    {tree.map(node => (
                        <TreeNodeRow
                            key={node.path}
                            node={node}
                            depth={0}
                            selected={selected}
                            allLeafPaths={allPaths}
                            onToggleLeaf={toggleLeaf}
                            onToggleGroup={toggleGroup}
                        />
                    ))}
                </div>
            </div>

            {/* Right: format + preview */}
            <div className="flex flex-col flex-1 overflow-hidden">
                <div
                    className="flex items-center gap-1 shrink-0"
                    style={{
                        height: 36,
                        padding: '0 8px',
                        borderBottom: '1px solid var(--border-0)',
                        background: 'var(--bg-0)',
                    }}
                >
                    {EXPORT_FORMATS.map(f => (
                        <button
                            key={f.id}
                            onClick={() => setFormat(f.id)}
                            className={cn(
                                'cursor-pointer rounded-[var(--r-sm)] transition-colors duration-150',
                                format === f.id
                                    ? 'bg-[var(--accent)] text-white'
                                    : 'text-[var(--text-2)] hover:bg-[var(--bg-3)] hover:text-[var(--text-1)]'
                            )}
                            style={{
                                padding: '2px 9px',
                                fontSize: 11.5,
                                fontWeight: 600,
                                height: 22,
                            }}
                        >
                            {f.label}
                        </button>
                    ))}
                    <div className="flex-1" />
                    <CopyButton text={output} title="Copy output" />
                    <button
                        title="Download"
                        className="flex items-center justify-center rounded cursor-pointer transition-all duration-150 hover:bg-[var(--bg-3)] hover:text-[var(--text-1)]"
                        style={{ width: 26, height: 26, color: 'var(--text-2)' }}
                        onClick={() =>
                            SaveFile(output, `response.${fmtInfo.ext}`).catch(err =>
                                console.warn('save file failed:', err)
                            )
                        }
                    >
                        <Download style={{ width: 12, height: 12 }} />
                    </button>
                </div>

                <div className="flex-1 overflow-auto">
                    <pre
                        style={{
                            padding: '14px 16px',
                            fontFamily: "'JetBrains Mono Variable', monospace",
                            fontSize: 'var(--text-base)',
                            lineHeight: 1.75,
                            color: 'var(--text-0)',
                            whiteSpace: 'pre-wrap',
                            overflowWrap: 'break-word',
                        }}
                    >
                        {output}
                    </pre>
                </div>
            </div>
        </div>
    );
}

// ── States ──────────────────────────────────────────────────────────────────

function EmptyState() {
    return (
        <div
            className="flex flex-col items-center justify-center h-full gap-3"
            style={{ color: 'var(--text-2)' }}
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
                <ArrowUpRight style={{ width: 18, height: 18, opacity: 0.5 }} />
            </div>
            <div className="flex flex-col items-center gap-1">
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)' }}>
                    No response yet
                </span>
                <span style={{ fontSize: 12 }}>Hit Send to make a request</span>
            </div>
        </div>
    );
}

function LoadingState() {
    return (
        <div
            className="flex flex-col items-center justify-center h-full gap-3"
            style={{ color: 'var(--text-2)' }}
        >
            <Loader2
                style={{ width: 22, height: 22, color: 'var(--accent)' }}
                className="animate-spin"
            />
            <span style={{ fontSize: 12 }}>Sending request…</span>
        </div>
    );
}

function ErrorState({ message }: { message: string }) {
    // Detect error category for a more helpful label
    const isTimeout = /timeout|timed out|deadline/i.test(message);
    const isNetwork = /network|connection refused|no such host|dial|ECONNREFUSED/i.test(message);
    const isTLS = /certificate|tls|ssl|x509/i.test(message);
    const isGrpc = /gRPC|reflection|grpc/i.test(message);
    const label = isTimeout
        ? 'Request timed out'
        : isNetwork
          ? 'Connection failed'
          : isTLS
            ? 'TLS / certificate error'
            : isGrpc
              ? 'gRPC error'
              : 'Request failed';

    return (
        <div
            className="flex flex-col items-center justify-center h-full gap-3"
            style={{ color: 'var(--text-2)', padding: '0 32px' }}
        >
            <div
                className="flex items-center justify-center rounded-[var(--r-lg)]"
                style={{
                    width: 40,
                    height: 40,
                    background: 'var(--red-dim)',
                    border: '1px solid rgba(248,113,113,0.2)',
                }}
            >
                <WifiOff style={{ width: 17, height: 17, color: 'var(--red)' }} />
            </div>
            <div className="flex flex-col items-center gap-2">
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>
                    {label}
                </span>
                <div
                    style={{
                        fontSize: 11.5,
                        maxWidth: 380,
                        textAlign: 'left',
                        lineHeight: 1.55,
                        background: 'var(--bg-2)',
                        border: '1px solid var(--border-1)',
                        borderRadius: 'var(--r-md)',
                        padding: '8px 12px',
                        fontFamily: "'JetBrains Mono Variable', monospace",
                        color: 'var(--red)',
                        wordBreak: 'break-all',
                    }}
                >
                    {message}
                </div>
            </div>
        </div>
    );
}

// ── ResponsePanel ───────────────────────────────────────────────────────────

const RESPONSE_TABS = [
    { id: 'body' as const, label: 'Body' },
    { id: 'headers' as const, label: 'Headers' },
    { id: 'cookies' as const, label: 'Cookies' },
    { id: 'tests' as const, label: 'Tests' },
    { id: 'timeline' as const, label: 'Timeline' },
    { id: 'transform' as const, label: 'Transform' },
];

export function ResponsePanel() {
    const tab = useAppStore(selectActiveTab);
    const { setActiveResponseTab } = useAppStore();
    const response = tab?.response ?? null;
    const responseLoading = tab?.responseLoading ?? false;
    const responseError = tab?.responseError ?? null;
    const activeResponseTab = tab?.activeResponseTab ?? 'body';
    const testResults = tab?.testResults ?? [];
    const headerCount = response ? Object.keys(response.headers ?? {}).length : 0;
    const failedCount = testResults.filter(r => !r.pass).length;

    return (
        <div
            className="flex flex-col h-full"
            style={{ background: 'var(--bg-1)', borderLeft: '1px solid var(--border-0)' }}
        >
            {/* ── Status bar ─────────────────────────────────────────────────── */}
            <div
                className="flex items-center gap-2.5 shrink-0"
                style={{
                    height: 'var(--toolbar-height)',
                    padding: '0 12px',
                    borderBottom: '1px solid var(--border-0)',
                }}
            >
                {response && !responseLoading ? (
                    <>
                        <StatusBadge status={response.statusCode} />
                        <div style={{ width: 1, height: 14, background: 'var(--border-1)' }} />
                        <StatChip
                            icon={<Clock style={{ width: 10, height: 10 }} />}
                            value={`${response.time}ms`}
                            title="Response time"
                        />
                        <StatChip
                            icon={<Zap style={{ width: 10, height: 10 }} />}
                            value={formatSize(response.size)}
                            title="Response size"
                        />
                    </>
                ) : (
                    <span style={{ fontSize: 12, color: 'var(--text-2)' }}>Response</span>
                )}
            </div>

            {/* ── Tab bar ────────────────────────────────────────────────────── */}
            {response && !responseLoading && (
                <div
                    className="flex items-center shrink-0"
                    style={{ borderBottom: '1px solid var(--border-0)', paddingLeft: 4 }}
                >
                    {RESPONSE_TABS.map(t => {
                        const count =
                            t.id === 'headers'
                                ? headerCount
                                : t.id === 'tests'
                                  ? testResults.length
                                  : 0;
                        const isFailed = t.id === 'tests' && failedCount > 0;
                        const isActive = activeResponseTab === t.id;
                        return (
                            <button
                                key={t.id}
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
                                onClick={() => setActiveResponseTab(t.id)}
                            >
                                {isActive && (
                                    <span className="absolute bottom-0 left-0 right-0 h-[1.5px] rounded-t bg-[var(--accent)]" />
                                )}
                                {t.label}
                                {count > 0 && (
                                    <span
                                        className="flex items-center justify-center rounded-full"
                                        style={{
                                            minWidth: 14,
                                            height: 14,
                                            padding: '0 4px',
                                            fontSize: 9,
                                            fontWeight: 700,
                                            background: isFailed ? 'var(--red-dim)' : 'var(--bg-3)',
                                            color: isFailed ? 'var(--red)' : 'var(--text-2)',
                                        }}
                                    >
                                        {count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* ── Content ────────────────────────────────────────────────────── */}
            <div className="flex-1 overflow-hidden">
                {responseLoading && <LoadingState />}
                {responseError && !responseLoading && <ErrorState message={responseError} />}
                {!response && !responseLoading && !responseError && <EmptyState />}

                {response && !responseLoading && (
                    <>
                        {activeResponseTab === 'body' && <BodyTab body={response.body} />}
                        {activeResponseTab === 'headers' && (
                            <HeadersTab headers={response.headers ?? {}} />
                        )}
                        {activeResponseTab === 'cookies' && (
                            <CookiesTab headers={response.headers ?? {}} />
                        )}
                        {activeResponseTab === 'tests' && <TestsEditor testResults={testResults} />}
                        {activeResponseTab === 'timeline' && (
                            <div className="h-full overflow-y-auto">
                                <TimelineView total={response.time} />
                            </div>
                        )}
                        {activeResponseTab === 'transform' && <TransformTab body={response.body} />}
                    </>
                )}
            </div>
        </div>
    );
}
