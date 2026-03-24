import React from 'react';
import { useAppStore, selectEditing } from '@/store/app';

export function RequestNameBar() {
    const editing = useAppStore(selectEditing);
    const { renameRequest } = useAppStore();

    const [isEditing, setIsEditing] = React.useState(false);
    const [draft, setDraft] = React.useState('');
    const inputRef = React.useRef<HTMLInputElement>(null);

    if (!editing) return null;

    const startEdit = () => {
        setDraft(editing.name);
        setIsEditing(true);
        setTimeout(() => inputRef.current?.select(), 0);
    };

    const commit = () => {
        const trimmed = draft.trim();
        if (trimmed && trimmed !== editing.name) renameRequest(editing.id, trimmed);
        setIsEditing(false);
    };

    const onKey = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') setIsEditing(false);
    };

    return (
        <div
            className="flex items-center shrink-0"
            style={{
                height: 24,
                padding: '0 14px',
                borderBottom: '1px solid var(--border-0)',
                background: 'var(--bg-0)',
            }}
        >
            {isEditing ? (
                <input
                    ref={inputRef}
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onBlur={commit}
                    onKeyDown={onKey}
                    className="bg-transparent outline-none"
                    style={{
                        fontSize: 11.5,
                        fontWeight: 600,
                        color: 'var(--text-0)',
                        border: 'none',
                        padding: 0,
                        minWidth: 60,
                        maxWidth: 340,
                        width: `${Math.max(draft.length, 6)}ch`,
                    }}
                    spellCheck={false}
                />
            ) : (
                <button
                    className="cursor-pointer transition-colors hover:text-[var(--text-0)] group flex items-center gap-1"
                    style={{
                        fontSize: 11.5,
                        fontWeight: 600,
                        color: 'var(--text-1)',
                        maxWidth: 340,
                    }}
                    onClick={startEdit}
                    title="Click to rename"
                >
                    <span className="truncate">{editing.name}</span>
                    <svg
                        viewBox="0 0 12 12"
                        style={{ width: 10, height: 10, color: 'var(--text-2)', flexShrink: 0 }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M8 2l2 2-6 6H2v-2L8 2z" />
                    </svg>
                </button>
            )}
        </div>
    );
}
