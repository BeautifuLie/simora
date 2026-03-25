import React from 'react';

export interface VarInputProps {
    value: string;
    onChange: (_v: string) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    style?: React.CSSProperties;
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
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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
        result += `<span style="color:${color};background:${bg};border-radius:3px;padding:0 2px">${esc(token)}</span>`;
        i = end + 2;
    }
    return result;
}

export function VarInput({
    value,
    onChange,
    placeholder,
    disabled,
    className,
    style,
    envVars,
    collectionVars,
}: VarInputProps) {
    const [showDropdown, setShowDropdown] = React.useState(false);
    const [dropFilter, setDropFilter] = React.useState('');
    const inputRef = React.useRef<HTMLInputElement>(null);
    const containerRef = React.useRef<HTMLDivElement>(null);

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
        const f = dropFilter.toLowerCase();
        return suggestions.filter(s => s.toLowerCase().includes(f));
    }, [suggestions, dropFilter]);

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

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
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

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === 'Escape') {
            setShowDropdown(false);
            setDropFilter('');
        }
    }

    function insertSuggestion(name: string) {
        const input = inputRef.current;
        if (!input) return;
        const cursor = input.selectionStart ?? value.length;
        const before = value.slice(0, cursor);
        const after = value.slice(cursor);
        const lastOpen = before.lastIndexOf('{{');
        if (lastOpen !== -1) {
            const newVal = before.slice(0, lastOpen + 2) + name + '}}' + after;
            onChange(newVal);
            const newCursor = lastOpen + 2 + name.length + 2;
            setTimeout(() => {
                input.setSelectionRange(newCursor, newCursor);
            }, 0);
        }
        setShowDropdown(false);
        setDropFilter('');
        input.focus();
    }

    const fontStyle: React.CSSProperties = {
        fontSize: 'var(--text-base)',
        fontFamily: 'var(--font-mono)',
        padding: '0 10px',
        height: 'var(--input-height)',
        ...style,
    };

    return (
        <div
            ref={containerRef}
            data-varinput="1"
            className={className}
            style={{
                position: 'relative',
                display: 'flex',
                flex: 1,
                height: 'var(--input-height)',
                background: 'var(--bg-2)',
                border: '1px solid var(--border-1)',
                borderRadius: 'var(--r-sm)',
                overflow: 'hidden',
                ...style,
            }}
        >
            {/* Highlight layer — absolutely positioned, pointer-events:none */}
            <div
                aria-hidden
                style={{
                    position: 'absolute',
                    inset: 0,
                    pointerEvents: 'none',
                    whiteSpace: 'pre',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    ...fontStyle,
                    border: 'none',
                    background: 'transparent',
                    height: '100%',
                }}
                dangerouslySetInnerHTML={{ __html: highlighted }}
            />
            {/* Real input — transparent text so only caret is visible */}
            <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={disabled}
                style={{
                    ...fontStyle,
                    position: 'relative',
                    background: 'transparent',
                    color: value ? 'transparent' : 'var(--text-1)',
                    caretColor: 'var(--text-0)',
                    width: '100%',
                    outline: 'none',
                    border: 'none',
                    height: '100%',
                }}
                spellCheck={false}
                onFocus={e => {
                    const container = e.currentTarget.closest<HTMLDivElement>('[data-varinput]');
                    if (container) container.style.borderColor = 'var(--border-focus)';
                }}
                onBlur={e => {
                    const container = e.currentTarget.closest<HTMLDivElement>('[data-varinput]');
                    if (container) container.style.borderColor = 'var(--border-1)';
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
