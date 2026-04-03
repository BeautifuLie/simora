import React from 'react';

export interface VarTextareaProps {
    value: string;
    onChange: (_v: string) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    style?: React.CSSProperties;
    rows?: number;
    envVars?: Array<{ key: string; enabled: boolean }>;
    collectionVars?: Array<{ key: string; enabled: boolean }>;
}

function buildVarSet(
    envVars?: Array<{ key: string; enabled: boolean }>,
    collectionVars?: Array<{ key: string; enabled: boolean }>
): Set<string> {
    const s = new Set<string>();
    for (const _v of envVars ?? []) if (_v.enabled && _v.key) s.add(_v.key);
    for (const _v of collectionVars ?? []) if (_v.enabled && _v.key) s.add(_v.key);
    return s;
}

function buildSuggestions(
    envVars?: Array<{ key: string; enabled: boolean }>,
    collectionVars?: Array<{ key: string; enabled: boolean }>
): string[] {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const v of envVars ?? []) {
        if (v.enabled && v.key && !seen.has(v.key)) {
            seen.add(v.key);
            result.push(v.key);
        }
    }
    for (const v of collectionVars ?? []) {
        if (v.enabled && v.key && !seen.has(v.key)) {
            seen.add(v.key);
            result.push(v.key);
        }
    }
    return result;
}

function renderHighlighted(text: string, knownVars: Set<string>): string {
    const esc = (s: string) =>
        s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
    let result = '';
    let i = 0;
    while (i < text.length) {
        const start = text.indexOf('{{', i);
        if (start === -1) {
            result += esc(text.slice(i));
            break;
        }
        result += esc(text.slice(i, start));
        const end = text.indexOf('}}', start + 2);
        if (end === -1) {
            result += esc(text.slice(start));
            break;
        }
        const token = text.slice(start, end + 2);
        const varName = text.slice(start + 2, end).trim();
        const known = varName !== '' && knownVars.has(varName);
        const color = known ? '#4ade80' : '#f87171';
        const bg = known ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)';
        // Escape the token content but re-add the braces
        const escapedToken = esc(token);
        result += `<span style="color:${color};background:${bg};border-radius:3px;padding:0 2px">${escapedToken}</span>`;
        i = end + 2;
    }
    return result;
}

function fuzzyMatch(name: string, filter: string): boolean {
    let fi = 0;
    const n = name.toLowerCase();
    const f = filter.toLowerCase();
    for (let i = 0; i < n.length && fi < f.length; i++) {
        if (n[i] === f[fi]) fi++;
    }
    return fi === f.length;
}

export function VarTextarea({
    value,
    onChange,
    placeholder,
    disabled,
    className,
    style,
    rows,
    envVars,
    collectionVars,
}: VarTextareaProps) {
    const [showDropdown, setShowDropdown] = React.useState(false);
    const [dropFilter, setDropFilter] = React.useState('');
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const highlightRef = React.useRef<HTMLDivElement>(null);

    const knownVars = React.useMemo(
        () => buildVarSet(envVars, collectionVars),
        [envVars, collectionVars]
    );
    const suggestions = React.useMemo(
        () => buildSuggestions(envVars, collectionVars),
        [envVars, collectionVars]
    );

    const highlighted = React.useMemo(
        () => (value ? renderHighlighted(value, knownVars) : ''),
        [value, knownVars]
    );

    const filteredSuggestions = React.useMemo(() => {
        if (!dropFilter) return suggestions;
        return suggestions.filter(s => fuzzyMatch(s, dropFilter));
    }, [suggestions, dropFilter]);

    // Sync scroll between textarea and highlight layer
    function syncScroll() {
        const ta = textareaRef.current;
        const hl = highlightRef.current;
        if (ta && hl) {
            hl.scrollTop = ta.scrollTop;
            hl.scrollLeft = ta.scrollLeft;
        }
    }

    // Close dropdown on outside click
    React.useEffect(() => {
        if (!showDropdown) return;
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
                setDropFilter('');
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showDropdown]);

    function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
        const v = e.target.value;
        onChange(v);

        const cursor = e.target.selectionStart ?? v.length;
        const before = v.slice(0, cursor);
        const lastOpen = before.lastIndexOf('{{');
        if (lastOpen !== -1) {
            const afterOpen = before.slice(lastOpen + 2);
            if (!afterOpen.includes('}}')) {
                setDropFilter(afterOpen);
                setShowDropdown(true);
                return;
            }
        }
        setShowDropdown(false);
        setDropFilter('');
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
        if (e.key === 'Escape') {
            setShowDropdown(false);
            setDropFilter('');
        }
    }

    function insertSuggestion(name: string) {
        const ta = textareaRef.current;
        if (!ta) return;
        const cursor = ta.selectionStart ?? value.length;
        const before = value.slice(0, cursor);
        const after = value.slice(cursor);
        const lastOpen = before.lastIndexOf('{{');
        if (lastOpen !== -1) {
            const newVal = before.slice(0, lastOpen + 2) + name + '}}' + after;
            onChange(newVal);
            const newCursor = lastOpen + 2 + name.length + 2;
            setTimeout(() => {
                ta.setSelectionRange(newCursor, newCursor);
            }, 0);
        }
        setShowDropdown(false);
        setDropFilter('');
        ta.focus();
    }

    const baseStyle: React.CSSProperties = {
        padding: 10,
        background: 'var(--bg-2)',
        border: '1px solid var(--border-1)',
        borderRadius: 'var(--r-sm)',
        fontSize: 'var(--text-base)',
        fontFamily: 'var(--font-mono)',
        color: 'var(--text-0)',
        lineHeight: 1.7,
        ...style,
    };

    return (
        <div
            ref={containerRef}
            style={{ position: 'relative', display: 'flex', flexDirection: 'column', flex: 1 }}
        >
            {/* Highlight layer */}
            <div
                ref={highlightRef}
                aria-hidden
                style={{
                    position: 'absolute',
                    inset: 0,
                    pointerEvents: 'none',
                    whiteSpace: 'pre-wrap',
                    overflowWrap: 'break-word',
                    overflow: 'hidden',
                    ...baseStyle,
                    background: 'transparent',
                    border: '1px solid transparent',
                    color: 'transparent',
                    zIndex: 0,
                }}
                dangerouslySetInnerHTML={{ __html: highlighted }}
            />
            {/* Real textarea */}
            <textarea
                ref={textareaRef}
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onScroll={syncScroll}
                placeholder={placeholder}
                disabled={disabled}
                rows={rows}
                className={className}
                style={{
                    ...baseStyle,
                    position: 'relative',
                    background: 'transparent',
                    color: value ? 'transparent' : 'var(--text-1)',
                    caretColor: 'var(--text-0)',
                    resize: 'none',
                    outline: 'none',
                    width: '100%',
                    flex: 1,
                    zIndex: 1,
                }}
                spellCheck={false}
            />
            {/* Wrapper for bg+border */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'var(--bg-2)',
                    border: '1px solid var(--border-1)',
                    borderRadius: 'var(--r-sm)',
                    pointerEvents: 'none',
                    zIndex: -1,
                }}
            />
            {/* Dropdown */}
            {showDropdown && filteredSuggestions.length > 0 && (
                <div
                    style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        zIndex: 50,
                        background: 'var(--bg-2)',
                        border: '1px solid var(--border-1)',
                        borderRadius: 6,
                        minWidth: 160,
                        maxHeight: 200,
                        overflowY: 'auto',
                        marginTop: 2,
                        boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                    }}
                >
                    {filteredSuggestions.map(name => (
                        <button
                            key={name}
                            type="button"
                            onMouseDown={e => {
                                e.preventDefault();
                                insertSuggestion(name);
                            }}
                            style={{
                                display: 'block',
                                width: '100%',
                                textAlign: 'left',
                                padding: '6px 10px',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                color: 'var(--text-0)',
                                background: 'transparent',
                                border: 'none',
                                fontFamily: 'var(--font-mono)',
                            }}
                            onMouseEnter={e => {
                                (e.currentTarget as HTMLButtonElement).style.background =
                                    'var(--bg-3)';
                            }}
                            onMouseLeave={e => {
                                (e.currentTarget as HTMLButtonElement).style.background =
                                    'transparent';
                            }}
                        >
                            {name}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
